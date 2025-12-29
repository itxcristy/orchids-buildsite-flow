import { useState, useEffect } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { TwoFactorVerification } from '@/components/TwoFactorVerification';
import { verifyTwoFactor } from '@/services/api/twoFactor-service';
import { loginUser } from '@/services/api/auth-postgresql';
import { 
  Loader2, CheckCircle2, ArrowRight, KeyRound, Mail,
  Shield, BarChart3, Users, Briefcase, Eye, EyeOff
} from 'lucide-react';

const Auth = () => {
  const { signIn, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  
  // 2FA states
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>('');
  const [twoFactorAgencyDatabase, setTwoFactorAgencyDatabase] = useState<string>('');

  // Check for registration success
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShowSuccessMessage(true);
    }
  }, [searchParams]);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setSignInData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative">
            <img 
              src="/images/landing/logo.png" 
              alt="BuildFlow Logo" 
              className="h-16 w-auto object-contain mx-auto"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card rounded-full flex items-center justify-center border-2 border-background">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
          </div>
          <p className="mt-6 text-muted-foreground font-medium">Loading BuildFlow...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Remember email if checkbox is checked
    if (rememberMe) {
      localStorage.setItem('remembered_email', signInData.email);
    } else {
      localStorage.removeItem('remembered_email');
    }
    
    try {
      // Try login via API to check for 2FA
      const loginResult = await loginUser({
        email: signInData.email,
        password: signInData.password,
      });

      // If 2FA is required, show verification component
      if ((loginResult as any).requiresTwoFactor) {
        setTwoFactorUserId((loginResult as any).userId);
        setTwoFactorAgencyDatabase((loginResult as any).agencyDatabase);
        setRequiresTwoFactor(true);
        setIsLoading(false);
        return;
      }

      // If no 2FA, proceed with normal sign in
      const { error: signInError } = await signIn(signInData.email, signInData.password);
      
      if (signInError) {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handleTwoFactorVerified = async (token?: string, recoveryCode?: string) => {
    // After 2FA verification, complete login with token
    try {
      setIsLoading(true);
      const loginResult = await loginUser({
        email: signInData.email,
        password: signInData.password,
        twoFactorToken: token,
        recoveryCode: recoveryCode,
      } as any);

      // If login successful (has token), store it and reload page to update auth context
      if (!(loginResult as any).requiresTwoFactor && loginResult.token) {
        // Store token and agency info
        localStorage.setItem('auth_token', loginResult.token);
        if ((loginResult.user as any).agency?.databaseName) {
          localStorage.setItem('agency_database', (loginResult.user as any).agency.databaseName);
          localStorage.setItem('agency_id', (loginResult.user as any).agency.id);
        }
        
        // Reload to update auth context
        window.location.href = '/dashboard';
      } else {
        setError('Login failed after 2FA verification');
        setRequiresTwoFactor(false);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed after 2FA verification');
      setRequiresTwoFactor(false);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Briefcase, title: 'Project Management', desc: 'Track projects, tasks & deadlines' },
    { icon: Users, title: 'Team Collaboration', desc: 'Manage your entire workforce' },
    { icon: BarChart3, title: 'Financial Analytics', desc: 'Invoicing, payroll & reports' },
    { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-muted/30">

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          {/* Logo & Tagline */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src="/images/landing/logo.png" 
                alt="BuildFlow Logo" 
                className="h-14 w-auto object-contain"
              />
              <div>
                <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                  Build<span className="text-primary">Flow</span>
                </h1>
                <p className="text-muted-foreground text-sm">Agency Management Platform</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-semibold text-foreground leading-tight mb-4">
              Run your agency with
              <span className="block text-primary">confidence & clarity</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              The all-in-one platform for construction and service agencies. 
              Manage projects, teams, finances, and clients from a single dashboard.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="group p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Trusted by agencies worldwide</p>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">10,000+</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">500+</div>
                <div className="text-xs text-muted-foreground">Agencies</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">99.9%</div>
                <div className="text-xs text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center p-6 lg:p-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <img 
              src="/images/landing/logo.png" 
              alt="BuildFlow Logo" 
              className="h-14 w-auto object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-semibold text-foreground">
              Build<span className="text-primary">Flow</span>
            </h1>
          </div>

          {/* Registration Success Message */}
          {showSuccessMessage && (
            <Alert className="mb-6 border-success/30 bg-success-light">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success-foreground">
                <strong>Account created successfully!</strong> Please check your email to verify your account, then sign in below.
              </AlertDescription>
            </Alert>
          )}

          {/* 2FA Verification */}
          {requiresTwoFactor ? (
            <TwoFactorVerification
              userId={twoFactorUserId}
              agencyDatabase={twoFactorAgencyDatabase}
              onVerified={handleTwoFactorVerified}
              onCancel={() => {
                setRequiresTwoFactor(false);
                setTwoFactorUserId('');
                setTwoFactorAgencyDatabase('');
              }}
            />
          ) : (
          /* Sign In Card */
          <Card className="border shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h2>
                <p className="text-muted-foreground">Sign in to your account to continue</p>
              </div>

              {/* Error Message */}
              {error && (
                <Alert className="mb-6 border-error/30 bg-error-light">
                  <AlertDescription className="text-error-foreground text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@company.com"
                      value={signInData.email}
                      onChange={(e) => {
                        setSignInData(prev => ({ ...prev, email: e.target.value }));
                        setError('');
                      }}
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => {
                        setSignInData(prev => ({ ...prev, password: e.target.value }));
                        setError('');
                      }}
                      required
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                    Remember my email
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">
                    New to BuildFlow?
                  </span>
                </div>
              </div>

              {/* Create Agency Account Link */}
              <Link to="/agency-signup">
                <Button 
                  variant="outline" 
                  className="w-full h-11"
                >
                  Create Your Agency Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
