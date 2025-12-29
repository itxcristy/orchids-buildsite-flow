import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, ArrowLeft, Mail, Loader2, CheckCircle2, KeyRound
} from 'lucide-react';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSubmitted(true);
    
    toast({
      title: "Reset link sent",
      description: "If an account exists with this email, you'll receive a password reset link.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Building className="h-6 w-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            Build<span className="text-primary">Flow</span>
          </h1>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="text-center pb-2">
            {!isSubmitted ? (
              <>
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Forgot Password?</CardTitle>
                <CardDescription>
                  No worries! Enter your email and we'll send you a reset link.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-lg bg-success-light flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                </div>
                <CardTitle className="text-xl">Check Your Email</CardTitle>
                <CardDescription>
                  We've sent a password reset link to your email address.
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="pt-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert className="border-error/30 bg-error-light">
                    <AlertDescription className="text-error-foreground text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <Alert className="border-success/30 bg-success-light">
                  <AlertDescription className="text-success-foreground text-sm">
                    If an account exists for <strong>{email}</strong>, you'll receive an email with instructions to reset your password.
                  </AlertDescription>
                </Alert>
                
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                  >
                    Try again with a different email
                  </Button>
                </div>
              </div>
            )}

            {/* Back to Sign In */}
            <div className="mt-6 text-center">
              <Link 
                to="/auth" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Need help?{' '}
            <a href="mailto:support@buildflow.com" className="text-primary hover:text-primary/80 transition-colors">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

