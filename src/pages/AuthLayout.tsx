import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import Footer from "@/components/Footer";

interface AuthLayoutProps {
  onLogin: () => void;
  onSignup: () => void;
}

const AuthLayout = ({ onLogin, onSignup }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-dashboard flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Routes>
            <Route path="login" element={<LoginPage onLogin={onLogin} />} />
            <Route path="signup" element={<SignupPage onSignup={onSignup} />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AuthLayout;