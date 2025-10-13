import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { initLocalDb } from "@/lib/db";

// Pages
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

  useEffect(() => {
    initLocalDb();
    // Initialize auth from localStorage on first load
    const storedAuth = localStorage.getItem("fk:isAuthenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route 
                  path="/auth/*" 
                  element={<AuthLayout onLogin={handleLogin} onSignup={handleSignup} />} 
                />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </>
            ) : (
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