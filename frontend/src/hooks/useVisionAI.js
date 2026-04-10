/**
 * useVisionAI — Edge-AI non-verbal tracking using MediaPipe Tasks Vision.
 *
 * Runs entirely in the browser (0ms network latency). Uses:
 *   • FaceLandmarker  → iris/eyelid landmarks → gaze direction → eyeContactRatio
 *   • PoseLandmarker  → shoulder landmarks    → tilt/slouch    → postureScore (0-100)
 *
 * isSpeaking (from useTTS) is accepted so eye-contact during speech phases
 * can be correlated separately for richer reporting.
 *
 * Nudge system:
 *   If eyeContactRatio < EYE_CONTACT_NUDGE_THRESHOLD for NUDGE_DURATION_MS continuously,
 *   activeNudge is set to a message string. Clears when eye contact recovers.
 *
 * Returns:
 *   visionMetrics   — { eyeContactRatio, postureScore, isFaceVisible, sessionBuffer }
 *   activeNudge     — string | null (real-time coaching nudge message)
 *   isInitialized   — true once both models are loaded
 *   initError       — string | null if MediaPipe failed to load
 *   startTracking() — call after getUserMedia stream is ready
 *   stopTracking()  — cleans up RAF loop + landmarkers
 */

import { useState, useRef, useEffect, useCallback } from 'react'

/* ─── MediaPipe landmark indices (canonical face model) ────────────────── */
// Iris centres: left=468, right=473 (only present with iris refinement)
const LEFT_IRIS   = 468
const RIGHT_IRIS  = 473
// Nose tip
const NOSE_TIP    = 1
// Eye corners to estimate gaze range
const L_EYE_LEFT  = 33
const L_EYE_RIGHT = 133
const R_EYE_LEFT  = 362
const R_EYE_RIGHT = 263

/* Pose landmark indices */
const LEFT_SHOULDER  = 11
const RIGHT_SHOULDER = 12
const LEFT_EAR       = 7
const RIGHT_EAR      = 8

/* How often (ms) to flush the running averages into sessionBuffer */
const FLUSH_INTERVAL_MS = 30_000  // 30 seconds

/* Nudge thresholds */
const EYE_CONTACT_NUDGE_THRESHOLD = 0.35  // below 35% ratio = low eye contact
const POSTURE_NUDGE_THRESHOLD     = 55     // below 55 posture score = slouching
const NUDGE_DURATION_MS           = 5_000  // must be low for 5 continuous seconds
const NUDGE_COOLDOWN_MS           = 15_000 // don't re-nudge within 15s

const NUDGE_MESSAGES = {
  eye:     'Maintain eye contact with the camera — look directly at the lens.',
  posture: 'Sit up straight — panelists notice confident posture.',
}

/* CDN for wasm/model bundles (avoids bundler issues with WASM) */
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

export default function useVisionAI(videoRef, isSpeaking = false) {
  const [isInitialized, setIsInitialized]   = useState(false)
  const [initError, setInitError]           = useState(null)
  const [visionMetrics, setVisionMetrics]   = useState({
    eyeContactRatio: 0,
    postureScore: 100,
    isFaceVisible: false,
    sessionBuffer: [],   // array of { timestamp, eyeContactRatio, postureScore, wasSpeaking }
  })
  const [activeNudge, setActiveNudge] = useState(null)  // string | null

  const faceLandmarkerRef = useRef(null)
  const poseLandmarkerRef = useRef(null)
  const rafRef            = useRef(null)
  const isRunningRef      = useRef(false)

  // Running accumulators (reset every FLUSH_INTERVAL_MS)
  const eyeFramesRef      = useRef({ contact: 0, total: 0 })
  const postureFramesRef  = useRef({ sum: 0, count: 0 })
  const flushTimerRef     = useRef(null)
  const sessionBufferRef  = useRef([])

  // Nudge tracking refs
  const eyeLowSinceRef      = useRef(null)   // timestamp when eye contact first dropped low
  const postureLowSinceRef  = useRef(null)   // timestamp when posture first dropped low
  const lastNudgeTimeRef    = useRef(0)      // timestamp of last nudge fired (cooldown)

  /* ─── Initialise both landmarkers ──────────────────────────────────────── */
  const initialize = useCallback(async () => {
    try {
      const { FilesetResolver, FaceLandmarker, PoseLandmarker } =
        await import('@mediapipe/tasks-vision')

      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN)

      const [face, pose] = await Promise.all([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
          outputFacialTransformationMatrices: false,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode:              'VIDEO',
          numPoses:                 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
        }),
      ])

      faceLandmarkerRef.current = face
      poseLandmarkerRef.current = pose
      setIsInitialized(true)
    } catch (err) {
      console.error('[useVisionAI] init failed:', err)
      setInitError(err.message || 'MediaPipe failed to load')
    }
  }, [])

  /* ─── Gaze estimation ───────────────────────────────────────────────────── */
  function estimateGaze(landmarks) {
    // Require iris landmarks (indices 468/473) for accurate gaze
    if (!landmarks || landmarks.length <= RIGHT_IRIS) return false

    const nose     = landmarks[NOSE_TIP]
    const lEyeL   = landmarks[L_EYE_LEFT]
    const lEyeR   = landmarks[L_EYE_RIGHT]
    const rEyeL   = landmarks[R_EYE_LEFT]
    const rEyeR   = landmarks[R_EYE_RIGHT]
    const lIris   = landmarks[LEFT_IRIS]
    const rIris   = landmarks[RIGHT_IRIS]

    if (!nose || !lEyeL || !lEyeR || !rEyeL || !rEyeR || !lIris || !rIris) return false

    // Left eye: normalised iris-x position within eye bounding box
    const lEyeWidth   = Math.abs(lEyeR.x - lEyeL.x)
    const rEyeWidth   = Math.abs(rEyeR.x - rEyeL.x)
    if (lEyeWidth < 0.001 || rEyeWidth < 0.001) return false

    const lGazeX = (lIris.x - lEyeL.x) / lEyeWidth  // 0 = far left, 1 = far right
    const rGazeX = (rIris.x - rEyeL.x) / rEyeWidth

    // Centred gaze ≈ 0.4–0.6 in both eyes
    const gazeX = (lGazeX + rGazeX) / 2
    const gazeY = (lIris.y + rIris.y) / 2 - nose.y   // negative = looking up (camera)

    const lookingAtCamera = gazeX > 0.35 && gazeX < 0.65 && gazeY < 0.05

    return lookingAtCamera
  }

  /* ─── Posture estimation ─────────────────────────────────────────────────── */
  function estimatePosture(landmarks) {
    if (!landmarks) return 100

    const ls = landmarks[LEFT_SHOULDER]
    const rs = landmarks[RIGHT_SHOULDER]
    const le = landmarks[LEFT_EAR]
    const re = landmarks[RIGHT_EAR]

    if (!ls || !rs) return 100

    // Shoulder tilt: difference in y-coordinates (normalised 0-1)
    const shoulderDeltaY = Math.abs(ls.y - rs.y)
    // 0 = perfectly level shoulders, 0.1 = significant tilt
    const tiltPenalty = Math.min(40, Math.round(shoulderDeltaY * 400))

    // Head-forward posture: ears should be roughly above shoulders in x
    // (only estimate — no depth from monocular camera)
    let forwardPenalty = 0
    if (le && re) {
      const earMidX      = (le.x + re.x) / 2
      const shoulderMidX = (ls.x + rs.x) / 2
      forwardPenalty = Math.min(25, Math.round(Math.abs(earMidX - shoulderMidX) * 100))
    }

    return Math.max(0, 100 - tiltPenalty - forwardPenalty)
  }

  /* ─── Per-frame analysis ─────────────────────────────────────────────────── */
  const analyzeFrame = useCallback((timestampMs) => {
    const video = videoRef?.current
    if (!video || video.readyState < 2) return

    const face = faceLandmarkerRef.current
    const pose = poseLandmarkerRef.current
    if (!face || !pose) return

    try {
      const faceResult = face.detectForVideo(video, timestampMs)
      const poseResult = pose.detectForVideo(video, timestampMs)

      const hasLandmarks = faceResult?.faceLandmarks?.length > 0
      const faceLMs      = hasLandmarks ? faceResult.faceLandmarks[0] : null
      const poseLMs      = poseResult?.landmarks?.[0] ?? null

      const lookingAtCamera = hasLandmarks ? estimateGaze(faceLMs) : false
      const postureScore    = poseLMs ? estimatePosture(poseLMs) : 100

      // Accumulate for rolling average
      eyeFramesRef.current.total++
      if (lookingAtCamera) eyeFramesRef.current.contact++
      postureFramesRef.current.sum   += postureScore
      postureFramesRef.current.count++

      const eyeRatio = eyeFramesRef.current.total > 0
        ? eyeFramesRef.current.contact / eyeFramesRef.current.total
        : 0

      const avgPosture = postureFramesRef.current.count > 0
        ? Math.round(postureFramesRef.current.sum / postureFramesRef.current.count)
        : 100

      setVisionMetrics(prev => ({
        ...prev,
        eyeContactRatio: Math.round(eyeRatio * 100) / 100,
        postureScore:    avgPosture,
        isFaceVisible:   hasLandmarks,
        sessionBuffer:   prev.sessionBuffer,
      }))

      // ── Nudge logic ────────────────────────────────────────────────────────
      const now = performance.now()
      const cooldownOk = (now - lastNudgeTimeRef.current) > NUDGE_COOLDOWN_MS

      // Eye-contact nudge: fire when ratio below threshold for NUDGE_DURATION_MS
      if (eyeRatio < EYE_CONTACT_NUDGE_THRESHOLD) {
        if (eyeLowSinceRef.current === null) eyeLowSinceRef.current = now
        else if (cooldownOk && (now - eyeLowSinceRef.current) >= NUDGE_DURATION_MS) {
          setActiveNudge(NUDGE_MESSAGES.eye)
          lastNudgeTimeRef.current = now
          eyeLowSinceRef.current = null
        }
      } else {
        eyeLowSinceRef.current = null
        // Clear nudge once eye contact recovers (only if current nudge is the eye one)
        setActiveNudge(prev => prev === NUDGE_MESSAGES.eye ? null : prev)
      }

      // Posture nudge: fire when score below threshold for NUDGE_DURATION_MS
      if (avgPosture < POSTURE_NUDGE_THRESHOLD) {
        if (postureLowSinceRef.current === null) postureLowSinceRef.current = now
        else if (cooldownOk && (now - postureLowSinceRef.current) >= NUDGE_DURATION_MS) {
          setActiveNudge(NUDGE_MESSAGES.posture)
          lastNudgeTimeRef.current = now
          postureLowSinceRef.current = null
        }
      } else {
        postureLowSinceRef.current = null
        setActiveNudge(prev => prev === NUDGE_MESSAGES.posture ? null : prev)
      }
    } catch {
      // Silently ignore individual frame errors
    }
  }, [videoRef])

  /* ─── RAF loop ───────────────────────────────────────────────────────────── */
  const loop = useCallback(() => {
    if (!isRunningRef.current) return
    analyzeFrame(performance.now())
    rafRef.current = requestAnimationFrame(loop)
  }, [analyzeFrame])

  /* ─── 30-second flush into sessionBuffer ────────────────────────────────── */
  const flushBuffer = useCallback(() => {
    const eyeRatio   = eyeFramesRef.current.total > 0
      ? Math.round((eyeFramesRef.current.contact / eyeFramesRef.current.total) * 100) / 100
      : 0
    const avgPosture = postureFramesRef.current.count > 0
      ? Math.round(postureFramesRef.current.sum / postureFramesRef.current.count)
      : 100

    const snapshot = {
      timestamp:        Date.now(),
      eyeContactRatio:  eyeRatio,
      postureScore:     avgPosture,
      wasSpeaking:      isSpeaking,
    }

    sessionBufferRef.current = [...sessionBufferRef.current, snapshot]

    // Reset accumulators
    eyeFramesRef.current    = { contact: 0, total: 0 }
    postureFramesRef.current = { sum: 0, count: 0 }

    setVisionMetrics(prev => ({ ...prev, sessionBuffer: [...sessionBufferRef.current] }))
  }, [isSpeaking])

  /* ─── Public API ─────────────────────────────────────────────────────────── */
  const startTracking = useCallback(() => {
    if (!isInitialized || isRunningRef.current) return
    isRunningRef.current = true
    sessionBufferRef.current  = []
    eyeFramesRef.current      = { contact: 0, total: 0 }
    postureFramesRef.current  = { sum: 0, count: 0 }
    eyeLowSinceRef.current    = null
    postureLowSinceRef.current = null
    lastNudgeTimeRef.current  = 0
    setActiveNudge(null)
    rafRef.current = requestAnimationFrame(loop)
    flushTimerRef.current = setInterval(flushBuffer, FLUSH_INTERVAL_MS)
  }, [isInitialized, loop, flushBuffer])

  const stopTracking = useCallback(() => {
    isRunningRef.current = false
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (flushTimerRef.current) { clearInterval(flushTimerRef.current); flushTimerRef.current = null }
    // Final flush so we don't lose the last window
    flushBuffer()
  }, [flushBuffer])

  /* ─── Auto-init on mount ─────────────────────────────────────────────────── */
  useEffect(() => {
    initialize()
    return () => {
      stopTracking()
      faceLandmarkerRef.current?.close?.()
      poseLandmarkerRef.current?.close?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Aggregate helper: compute overall session averages from buffer */
  const getSessionAverages = useCallback(() => {
    const buf = sessionBufferRef.current
    if (buf.length === 0) {
      return { eyeContactRatio: 0, postureScore: 100, sampleCount: 0 }
    }
    const eyeAvg     = buf.reduce((s, b) => s + b.eyeContactRatio, 0) / buf.length
    const postureAvg = buf.reduce((s, b) => s + b.postureScore, 0) / buf.length
    return {
      eyeContactRatio: Math.round(eyeAvg * 100) / 100,
      postureScore:    Math.round(postureAvg),
      sampleCount:     buf.length,
    }
  }, [])

  return {
    visionMetrics,
    activeNudge,
    isInitialized,
    initError,
    startTracking,
    stopTracking,
    getSessionAverages,
  }
}
