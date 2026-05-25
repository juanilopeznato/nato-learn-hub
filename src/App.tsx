import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoading } from "@/components/PageLoading";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useAuth } from "@/context/AuthContext";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const Index = React.lazy(() => import("./pages/Index"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const CourseDetail = React.lazy(() => import("./pages/CourseDetail"));
const LessonView = React.lazy(() => import("./pages/LessonView"));
const InstructorDashboard = React.lazy(() => import("./pages/InstructorDashboard"));
const Community = React.lazy(() => import("./pages/Community"));
const MemberProfile = React.lazy(() => import("./pages/MemberProfile"));
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
const NatoOwnerPanel = React.lazy(() => import("./pages/NatoOwnerPanel"));
const CreateSchool = React.lazy(() => import("./pages/CreateSchool"));
const MpOAuthCallback = React.lazy(() => import("./pages/MpOAuthCallback"));
const Affiliates = React.lazy(() => import("./pages/Affiliates"));
const Status = React.lazy(() => import("./pages/Status"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Solo monta el FeedbackButton si hay user logueado — no aparece en landings. */
function LoggedFeedbackButton() {
  const { user } = useAuth()
  if (!user) return null
  return <FeedbackButton />
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Skip-to-content para usuarios de teclado / lectores de pantalla.
              Invisible hasta que recibe foco (tab desde la barra de URL). */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
          >
            Saltar al contenido
          </a>
          <Toaster />
          {/* Sonner expone aria-live="polite" internamente — está OK para a11y */}
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <React.Suspense fallback={<PageLoading />}>
                <main id="main-content" tabIndex={-1}>
                <Routes>
                {/* Públicas */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/:slug" element={<CourseDetail />} />
                  <Route path="/affiliates" element={<Affiliates />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/certificates/:code" element={<CertificateVerify />} />
                  <Route path="/create-school" element={<CreateSchool />} />
                  <Route path="/mp-oauth-callback" element={<MpOAuthCallback />} />
                  <Route path="/status" element={<Status />} />

                {/* Protegidas: estudiantes */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/learn/:courseSlug/:lessonId" element={<ProtectedRoute><LessonView /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

                {/* Protegidas: comunidad y perfiles */}
                  <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                  <Route path="/members/:profileId" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />

                {/* Protegidas: instructores */}
                  <Route path="/instructor" element={<ProtectedRoute requiredRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
                  <Route path="/instructor/courses/:courseId" element={<ProtectedRoute requiredRole="instructor"><InstructorCoursePage /></ProtectedRoute>} />
                  <Route path="/instructor/email" element={<ProtectedRoute requiredRole="instructor"><EmailMarketing /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute requiredRole="instructor"><TenantSettings /></ProtectedRoute>} />

                {/* Protegidas: admin / NATO
                    AdminPanel es un panel cross-tenant (lista tenants, queries globales) — solo NATO. */}
                  <Route path="/admin" element={<ProtectedRoute requiredRole="nato_owner"><AdminPanel /></ProtectedRoute>} />
                  <Route path="/nato" element={<ProtectedRoute requiredRole="nato_owner"><NatoOwnerPanel /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </main>
                <LoggedFeedbackButton />
              </React.Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
