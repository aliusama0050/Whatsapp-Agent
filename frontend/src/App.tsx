import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import AdminRoute from "./components/auth/AdminRoute";

// Lazy-loaded pages — each gets its own JS chunk
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Toaster
      position="top-right"
      toastOptions={{
        style: { background: "#18181b", color: "#fff", border: "1px solid #27272a" },
        success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
        error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
      }}
    />
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <WebSocketProvider>
                  <AnalyticsPage />
                </WebSocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <WebSocketProvider>
                  <ContactsPage />
                </WebSocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <WebSocketProvider>
                  <SettingsPage />
                </WebSocketProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <WebSocketProvider>
                  <AdminPage />
                </WebSocketProvider>
              </AdminRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <WebSocketProvider>
                  <DashboardPage />
                </WebSocketProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
