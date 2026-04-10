export default class RealtimeClient {
  constructor({ url, token }) {
    this.url = url
    this.token = token
    this.ws = null
    this.open = false
    this.onMessage = null
    this.onOpen = null
    this.onClose = null
    this.onError = null
  }
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.url
        this.ws = new WebSocket(wsUrl, this.token ? ['jwt', this.token] : [])
      } catch (e) {
        reject(e)
        return
      }
      this.ws.binaryType = 'arraybuffer'
      this.ws.onopen = () => {
        this.open = true
        this.onOpen && this.onOpen()
        resolve()
      }
      this.ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try { this.onMessage && this.onMessage(JSON.parse(ev.data)) } catch {}
        }
      }
      this.ws.onerror = (e) => { this.onError && this.onError(e) }
      this.ws.onclose = () => { this.open = false; this.onClose && this.onClose() }
    })
  }
  close() { try { this.ws?.close() } catch {} this.open = false }
  sendJson(obj) { if (this.open) try { this.ws.send(JSON.stringify(obj)) } catch {} }
  sendAudio(buf) { if (this.open) try { this.ws.send(buf) } catch {} }
}
