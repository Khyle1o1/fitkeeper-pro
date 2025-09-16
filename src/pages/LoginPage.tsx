import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const passwordRequirements = [
    'Minimum 8 characters',
    'At least one special character (!@#$%^&*)',
    'At least one uppercase letter',
    'At least one lowercase letter',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      toast({
        title: "Account Locked",
        description: "Your account has been locked due to multiple failed attempts. Please reset your password.",
        variant: "destructive",
      });
      return;
    }

    // Mock authentication - check for demo credentials
    if (username === 'admin' && password === 'Admin@123') {
      toast({
        title: "Login Successful",
        description: "Welcome to Gym Management System!",
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
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-primary rounded-full">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Gym Management System</CardTitle>
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

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">Password Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {passwordRequirements.map((req, index) => (
                <li key={index}>• {req}</li>
              ))}
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90" 
            disabled={isLocked}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center">
          <Link 
            to="/auth/forgot-password" 
            className="text-sm text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="text-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>Username: <code className="bg-background px-1 rounded">admin</code></p>
          <p>Password: <code className="bg-background px-1 rounded">Admin@123</code></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginPage;