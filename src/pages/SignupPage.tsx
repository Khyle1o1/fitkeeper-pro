import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUser, getUserByUsername, getUserByEmail } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth";
import { generateUserId } from "@/data/mockData";

interface SignupPageProps {
  onSignup: () => void;
}

const SignupPage = ({ onSignup }: SignupPageProps) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' as 'admin' | 'staff'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const passwordRequirements = [
    'Minimum 8 characters',
    'At least one special character (!@#$%^&*)',
    'At least one uppercase letter',
    'At least one lowercase letter',
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match.",
          variant: "destructive",
        });
        return;
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        toast({
          title: "Invalid Password",
          description: "Please fix the password requirements.",
          variant: "destructive",
        });
        return;
      }

      // Check if username already exists
      const existingUser = await getUserByUsername(formData.username);
      if (existingUser) {
        toast({
          title: "Username Taken",
          description: "This username is already taken.",
          variant: "destructive",
        });
        return;
      }

      // Check if email already exists
      const existingEmail = await getUserByEmail(formData.email);
      if (existingEmail) {
        toast({
          title: "Email Taken",
          description: "This email is already registered.",
          variant: "destructive",
        });
        return;
      }

      // Hash password and create user
      const passwordHash = await hashPassword(formData.password);
      
      await createUser({
        username: formData.username,
        email: formData.email,
        passwordHash,
        role: formData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Account Created",
        description: "Your account has been created successfully! You can now sign in.",
      });

      onSignup();
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: "An error occurred while creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-primary rounded-full">
            <img 
              src="/logo.png" 
              alt="Power Lift Fitness Gym Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Create a new account to access Power Lift Fitness Gym
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value: 'admin' | 'staff') => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
            />
                  {passwordErrors.length > 0 && (
                    <ul className="text-sm text-destructive space-y-1">
                      {passwordErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Password Requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90" 
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              to="/auth/login" 
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignupPage;
