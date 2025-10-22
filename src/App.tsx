import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { initLocalDb } from "@/lib/db";
import { isAppActivated, verifyActivation } from "@/lib/activation";

// Pages
import ActivationPage from "./pages/ActivationPage";
import AuthLayout from "./pages/AuthLayout";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import AddMember from "./pages/AddMember";
import EditMember from "./pages/EditMember";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import AttendanceReport from "./pages/AttendanceReport";
import MembershipReport from "./pages/MembershipReport";
import MemberActivityReport from "./pages/MemberActivityReport";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize local database
        initLocalDb();
        
        // Check activation status first
        const activated = await verifyActivation();
        setIsActivated(activated);
        
        // Only check authentication if app is activated
        if (activated) {
          const storedAuth = localStorage.getItem("fk:isAuthenticated");
          if (storedAuth === "true") {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        // If there's an error, assume not activated for security
        setIsActivated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleActivationSuccess = () => {
    setIsActivated(true);
  };

  const handleLogin = () => {
    localStorage.setItem("fk:isAuthenticated", "true");
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    // After successful signup, redirect to login
    // The user will need to sign in with their new credentials
  };

  const handleLogout = () => {
    localStorage.removeItem("fk:isAuthenticated");
    localStorage.removeItem("fk:currentUser");
    setIsAuthenticated(false);
  };

  // Show loading screen while checking activation and auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Initializing app...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {!isActivated ? (
              // Show activation screen if app is not activated
              <Route 
                path="*" 
                element={<ActivationPage onActivationSuccess={handleActivationSuccess} />} 
              />
            ) : !isAuthenticated ? (
              // Show auth screens if activated but not authenticated
              <>
                <Route 
                  path="/auth/*" 
                  element={<AuthLayout onLogin={handleLogin} onSignup={handleSignup} />} 
                />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </>
            ) : (
              // Show main app if both activated and authenticated
              <>
                <Route path="/" element={<DashboardLayout onLogout={handleLogout} />}>
                  <Route index element={<Dashboard />} />
                  <Route path="members" element={<Members />} />
                  <Route path="members/add" element={<AddMember />} />
                  <Route path="members/edit/:id" element={<EditMember />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reports/attendance" element={<AttendanceReport />} />
                  <Route path="reports/membership" element={<MembershipReport />} />
                  <Route path="reports/member-activity" element={<MemberActivityReport />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="/auth/*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;