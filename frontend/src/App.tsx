import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CompetitionsPage from './pages/CompetitionsPage';
import CompetitionPage from './pages/CompetitionPage';
import ProblemPage from './pages/ProblemPage';
import SubmissionsPage from './pages/SubmissionsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompetitionPage from './pages/admin/AdminCompetitionPage';
import AdminProblemPage from './pages/admin/AdminProblemPage';
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage';

import { AttemptProvider, useAttempt } from './context/AttemptContext';

function Layout({ children }: { children: React.ReactNode }) {
  const { inAttempt } = useAttempt();
  return (
    <div className="min-h-screen bg-arena-bg">
      {!inAttempt && <Navbar />}
      <main>{children}</main>
    </div>
  );
}

function ProblemLayout() {
  const { inAttempt } = useAttempt();
  // Problem page is full-screen (no standard padding)
  return (
    <div className="min-h-screen bg-arena-bg flex flex-col">
      {!inAttempt && <Navbar />}
      <ProblemPage />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AttemptProvider>
        <BrowserRouter>
          <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/competitions" element={
              <Layout><CompetitionsPage /></Layout>
            } />
            <Route path="/competitions/:id" element={
              <Layout><CompetitionPage /></Layout>
            } />
            <Route path="/competitions/:id/problems/:problemId" element={
              <ProblemLayout />
            } />
            <Route path="/submissions" element={
              <Layout><SubmissionsPage /></Layout>
            } />
            <Route path="/submissions/:id" element={
              <Layout><SubmissionsPage /></Layout>
            } />
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={
              <Layout><AdminDashboard /></Layout>
            } />
            <Route path="/admin/competitions" element={
              <Layout><AdminDashboard /></Layout>
            } />
            <Route path="/admin/competitions/:id" element={
              <Layout><AdminCompetitionPage /></Layout>
            } />
            <Route path="/admin/problems/:id" element={
              <Layout><AdminProblemPage /></Layout>
            } />
            <Route path="/admin/submissions" element={
              <Layout><AdminSubmissionsPage /></Layout>
            } />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/competitions" replace />} />
          <Route path="*" element={<Navigate to="/competitions" replace />} />
        </Routes>
        </BrowserRouter>
      </AttemptProvider>
    </AuthProvider>
  );
}
