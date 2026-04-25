import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Tasks from "./pages/Tasks.tsx";
import Automation from "./pages/Automation.tsx";
import Logs from "./pages/Logs.tsx";
import Settings from "./pages/Settings.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppShell><Dashboard /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/tasks"
                element={
                  <ProtectedRoute>
                    <AppShell><Tasks defaultStatus="all" title="All tasks" /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/tasks/pending"
                element={
                  <ProtectedRoute>
                    <AppShell><Tasks defaultStatus="pending" title="Pending tasks" /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/tasks/completed"
                element={
                  <ProtectedRoute>
                    <AppShell><Tasks defaultStatus="completed" title="Completed tasks" /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/automation"
                element={
                  <ProtectedRoute>
                    <AppShell><Automation /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/logs"
                element={
                  <ProtectedRoute>
                    <AppShell><Logs /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/settings"
                element={
                  <ProtectedRoute>
                    <AppShell><Settings /></AppShell>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
