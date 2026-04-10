import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import ChatInterviewPage from './pages/ChatInterviewPage'
import VideoInterviewPage from './pages/VideoInterviewPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ResourceHubPage from './pages/ResourceHubPage'
import InterviewReportPage from './pages/InterviewReportPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
        <SubscriptionProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/interview/chat/:interviewId?" element={<ProtectedRoute><ChatInterviewPage /></ProtectedRoute>} />
            <Route path="/interview/video/:interviewId?" element={<ProtectedRoute><VideoInterviewPage /></ProtectedRoute>} />
            <Route path="/interview/:interviewId/report" element={<ProtectedRoute><InterviewReportPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><ResourceHubPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </SubscriptionProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
