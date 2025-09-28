import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserByUsername, updateUser } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      toast({
        title: "Account Locked",
        description: "Your account has been locked due to multiple failed attempts. Please reset your password.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user from database
      const user = await getUserByUsername(username);
      
      if (!user) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 5) {
          setIsLocked(true);
          toast({
            title: "Account Locked",
            description: "Too many failed attempts. Your account has been locked. Please reset your password.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: `Invalid credentials. ${5 - newFailedAttempts} attempts remaining.`,
            variant: "destructive",
          });
        }
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        toast({
          title: "Account Disabled",
          description: "Your account has been disabled. Please contact an administrator.",
          variant: "destructive",
        });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      
      if (isValidPassword) {
        // Update last login time
        await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
        
        // Store user info in localStorage
        localStorage.setItem("fk:currentUser", JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }));
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.username}!`,
        });
        onLogin();
      } else {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 5) {
          setIsLocked(true);
          toast({
            title: "Account Locked",
            description: "Too many failed attempts. Your account has been locked. Please reset your password.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: `Invalid credentials. ${5 - newFailedAttempts} attempts remaining.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Power Lift Fitness Gym Logo" 
              className="h-20 w-20 object-contain"
            />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Power Lift Fitness Gym</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your dashboard
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isLocked && (
          <Alert variant="destructive">
            <AlertDescription>
              Account locked due to multiple failed attempts. Please reset your password to continue.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLocked}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>


          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90" 
            disabled={isLocked}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Link 
            to="/auth/forgot-password" 
            className="text-sm text-primary hover:underline"
          >
            Forgot your password?
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link 
                to="/auth/signup" 
                className="text-primary hover:underline"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginPage;