import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import ForgotPasswordPage from "./ForgotPasswordPage";

interface AuthLayoutProps {
  onLogin: () => void;
}

const AuthLayout = ({ onLogin }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Routes>
          <Route path="login" element={<LoginPage onLogin={onLogin} />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default AuthLayout;