import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CourseDetail from "./pages/CourseDetail";
import LessonView from "./pages/LessonView";
import InstructorDashboard from "./pages/InstructorDashboard";
import Community from "./pages/Community";
import MemberProfile from "./pages/MemberProfile";

const Courses = React.lazy(() => import("./pages/Courses"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const AdminPanel = React.lazy(() => import("./pages/AdminPanel"));
const TenantSettings = React.lazy(() => import("./pages/TenantSettings"));
const InstructorCoursePage = React.lazy(() => import("./pages/InstructorCoursePage"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const CertificateVerify = React.lazy(() => import("./pages/CertificateVerify"));
const ProfileSettings = React.lazy(() => import("./pages/ProfileSettings"));
const EmailMarketing = React.lazy(() => import("./pages/EmailMarketing"));
const NatoOwnerPanel = React.lazy(() => import("./pages/NatoOwnerPanel"))
const CreateSchool = React.lazy(() => import("./pages/CreateSchool"));
const MpOAuthCallback = React.lazy(() => import("./pages/MpOAuthCallback"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/courses" element={
              <React.Suspense fallback={null}>
                <Courses />
              </React.Suspense>
            } />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/pricing" element={
              <React.Suspense fallback={null}>
                <Pricing />
              </React.Suspense>
            } />
            <Route path="/forgot-password" element={
              <React.Suspense fallback={null}>
                <ForgotPassword />
              </React.Suspense>
            } />
            <Route path="/reset-password" element={
              <React.Suspense fallback={null}>
                <ResetPassword />
              </React.Suspense>
            } />
            <Route path="/certificates/:code" element={
              <React.Suspense fallback={null}>
                <CertificateVerify />
              </React.Suspense>
            } />
            <Route path="/create-school" element={
              <React.Suspense fallback={null}>
                <CreateSchool />
              </React.Suspense>
            } />
            <Route path="/mp-oauth-callback" element={
              <React.Suspense fallback={null}>
                <MpOAuthCallback />
              </React.Suspense>
            } />

            {/* Protegidas: estudiantes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/learn/:courseSlug/:lessonId" element={
              <ProtectedRoute>
                <LessonView />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <React.Suspense fallback={null}>
                  <ProfileSettings />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Protegidas: comunidad y perfiles */}
            <Route path="/community" element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            } />
            <Route path="/members/:profileId" element={
              <ProtectedRoute>
                <MemberProfile />
              </ProtectedRoute>
            } />

            {/* Protegidas: instructores */}
            <Route path="/instructor" element={
              <ProtectedRoute requiredRole="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/instructor/courses/:courseId" element={
              <ProtectedRoute requiredRole="instructor">
                <React.Suspense fallback={null}>
                  <InstructorCoursePage />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Protegidas: configuración de escuela */}
            <Route path="/settings" element={
              <ProtectedRoute requiredRole="instructor">
                <React.Suspense fallback={null}>
                  <TenantSettings />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Protegidas: email marketing */}
            <Route path="/instructor/email" element={
              <ProtectedRoute requiredRole="instructor">
                <React.Suspense fallback={null}>
                  <EmailMarketing />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Protegidas: admin */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <React.Suspense fallback={null}>
                  <AdminPanel />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Protegidas: NATO owner */}
            <Route path="/nato" element={
              <ProtectedRoute requiredRole="nato_owner">
                <React.Suspense fallback={null}>
                  <NatoOwnerPanel />
                </React.Suspense>
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
