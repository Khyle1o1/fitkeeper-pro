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

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initLocalDb();
  }, []);

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
                  element={<AuthLayout onLogin={() => setIsAuthenticated(true)} />} 
                />
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<DashboardLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="members" element={<Members />} />
                  <Route path="members/add" element={<AddMember />} />
                  <Route path="members/edit/:id" element={<EditMember />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reports/attendance" element={<AttendanceReport />} />
                  <Route path="reports/membership" element={<MembershipReport />} />
                  <Route path="reports/member-activity" element={<MemberActivityReport />} />
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