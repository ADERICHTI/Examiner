import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import RequireAuth from './routes/RequireAuth.jsx'
import RequireAdmin from './routes/RequireAdmin.jsx'
import Auth from './pages/Auth.jsx'
import StartTest from './pages/StartTest.jsx'
import TestInterface from './pages/TestInterface.jsx'
import Submission from './pages/Submission.jsx'
import AdminAuth from './pages/admin/AdminAuth.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import TestsList from './pages/admin/TestsList.jsx'
import NewTest from './pages/admin/NewTest.jsx'
import TestDetail from './pages/admin/TestDetail.jsx'
import QuestionsEditor from './pages/admin/QuestionsEditor.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Navigate to="/auth" replace />} />
              <Route path="auth" element={<Auth />} />
              <Route element={<RequireAuth />}>
                <Route path="start-test" element={<StartTest />} />
                <Route path="test" element={<TestInterface />} />
                <Route path="submission" element={<Submission />} />
              </Route>
            </Route>

            <Route path="/admin/auth" element={<AdminAuth />} />

            <Route path="/admin" element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="tests" element={<TestsList />} />
                <Route path="tests/new" element={<NewTest />} />
                <Route path=":testId" element={<TestDetail />} />
                <Route path=":testId/questions" element={<QuestionsEditor />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
