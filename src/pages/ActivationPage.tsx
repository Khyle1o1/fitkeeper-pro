import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { activateApp } from '@/lib/activation';

interface ActivationPageProps {
  onActivationSuccess: () => void;
}

const ActivationPage = ({ onActivationSuccess }: ActivationPageProps) => {
  const [activationCode, setActivationCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationCode.trim()) {
      setError('Please enter the activation code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await activateApp(activationCode.trim());
      
      if (result.success) {
        toast({
          title: "Activation Successful",
          description: result.message,
        });
        onActivationSuccess();
      } else {
        setError(result.message);
        toast({
          title: "Activation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Activation error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast({
        title: "Activation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="Power Lift Fitness Gym Logo" 
                  className="h-20 w-20 object-contain"
                />
                <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Lock className="h-6 w-6" />
                App Activation
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Please enter the activation code to unlock this app
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This code is required only once per device. After activation, the app will work offline and no longer ask for a code.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activationCode">Activation Code</Label>
                <div className="relative">
                  <Input
                    id="activationCode"
                    type={showCode ? 'text' : 'password'}
                    placeholder="Enter activation code"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCode(!showCode)}
                    disabled={isLoading}
                  >
                    {showCode ? (
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
                disabled={isLoading || !activationCode.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Activating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Activate App
                  </div>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Contact your administrator if you don't have an activation code
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivationPage;
