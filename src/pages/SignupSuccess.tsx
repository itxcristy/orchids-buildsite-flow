import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, Mail, ArrowRight, Building, Users, Clock, Star,
  Shield, BarChart3, Settings, Sparkles
} from 'lucide-react';

const SignupSuccess = () => {
  const [searchParams] = useSearchParams();
  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    setAgencyName(searchParams.get('agencyName') || 'Your Agency');
    setEmail(searchParams.get('email') || '');
    setPlan(searchParams.get('plan') || 'professional');
  }, [searchParams]);

  const getPlanName = (planId: string) => {
    const plans: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise'
    };
    return plans[planId] || 'Professional';
  };

  const nextSteps = [
    {
      icon: Mail,
      title: "Verify Your Email",
      description: "Check your inbox and click the verification link to activate your account.",
      status: "pending",
      action: "Check Email"
    },
    {
      icon: Settings,
      title: "Complete Setup",
      description: "Configure your agency settings, upload your logo, and customize your workspace.",
      status: "upcoming"
    },
    {
      icon: Users,
      title: "Invite Your Team",
      description: "Add team members and assign roles to start collaborating.",
      status: "upcoming"
    },
    {
      icon: Star,
      title: "Explore Features",
      description: "Discover powerful tools for project management, HR, and finance.",
      status: "upcoming"
    }
  ];

  const features = [
    { 
      icon: Building, 
      title: 'Project Management', 
      description: 'Track projects, tasks, budgets, and deadlines in one place' 
    },
    { 
      icon: Users, 
      title: 'Team Management', 
      description: 'HR, attendance, payroll, and employee management' 
    },
    { 
      icon: BarChart3, 
      title: 'Financial Control', 
      description: 'Invoicing, payments, accounting, and reporting' 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Building className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-slate-900">BuildFlow</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-success rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-success-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Welcome to BuildFlow!
          </h1>
          
          <p className="text-lg text-slate-600 mb-6 max-w-xl mx-auto">
            Your agency account for <strong className="text-slate-900">{agencyName}</strong> has been successfully created.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              <Star className="w-4 h-4 mr-2" />
              {getPlanName(plan)} Plan
            </Badge>
            <Badge variant="outline" className="px-4 py-2 border-slate-200">
              <Clock className="w-4 h-4 mr-2" />
              14-Day Free Trial
            </Badge>
            <Badge variant="outline" className="px-4 py-2 border-slate-200">
              <Shield className="w-4 h-4 mr-2" />
              No Credit Card Required
            </Badge>
          </div>
        </div>

        {/* Email Verification Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Mail className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800 ml-2">
            <strong>Action Required:</strong> We've sent a verification email to{' '}
            <strong>{email}</strong>. Please check your inbox and click the verification link to activate your account.
          </AlertDescription>
        </Alert>

        {/* Next Steps */}
        <Card className="mb-10 shadow-lg border-slate-200/50">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Getting Started</CardTitle>
            <CardDescription>Follow these steps to set up your agency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    step.status === 'pending' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`font-semibold ${
                        step.status === 'pending' ? 'text-slate-900' : 'text-slate-700'
                      }`}>
                        {step.title}
                      </h3>
                      {step.status === 'pending' && (
                        <Badge className="bg-emerald-600 text-white text-xs">
                          Next Step
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 h-12 px-8">
                Sign In to Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8">
              <Mail className="mr-2 h-5 w-5" />
              Resend Verification Email
            </Button>
          </div>
          
          <p className="text-sm text-slate-500">
            Didn't receive the email? Check your spam folder or contact{' '}
            <a href="mailto:support@buildflow.com" className="text-emerald-600 hover:underline">
              support@buildflow.com
            </a>
          </p>
        </div>

        {/* Feature Preview */}
        <Card className="bg-card border overflow-hidden">
          <CardContent className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">What's Waiting for You</h2>
              <p className="text-slate-400">
                Powerful tools designed to help your agency succeed
              </p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500">
            Need help getting started?{' '}
            <a href="#" className="text-emerald-600 hover:underline">View our documentation</a>
            {' '}or{' '}
            <a href="#" className="text-emerald-600 hover:underline">contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupSuccess;
