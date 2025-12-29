import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getApiBaseUrl } from '@/config/api';
import { PageContainer, PageHeader } from '@/components/layout';
import {
  Loader2,
  Building2,
  Users,
  Settings,
  CheckCircle2,
  ArrowRight,
  FileText,
  DollarSign,
  Briefcase,
  TrendingUp,
  Calendar,
  AlertCircle,
} from 'lucide-react';

const SETUP_STEPS = [
  { id: 1, title: 'Company Profile', icon: Building2, description: 'Basic company information and branding' },
  { id: 2, title: 'Business Details', icon: FileText, description: 'Legal and tax information' },
  { id: 3, title: 'Departments', icon: Briefcase, description: 'Organizational structure' },
  { id: 4, title: 'Financial Setup', icon: DollarSign, description: 'Currency, payment, and billing' },
  { id: 5, title: 'Team Members', icon: Users, description: 'Add your team' },
  { id: 6, title: 'Preferences', icon: Settings, description: 'System preferences' },
  { id: 7, title: 'Review', icon: CheckCircle2, description: 'Review and complete' },
];

interface SetupProgress {
  setupComplete: boolean;
  progress: number;
  completedSteps: string[];
  totalSteps: number;
  lastUpdated: string | null;
  agencyName?: string;
}

export default function AgencySetupProgress() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<SetupProgress | null>(null);

  // Redirect super admins immediately
  useEffect(() => {
    if (userRole === 'super_admin') {
      navigate('/system', { replace: true });
      return;
    }
  }, [userRole, navigate]);

  useEffect(() => {
    // Don't fetch if super admin (will be redirected)
    if (userRole === 'super_admin') {
      return;
    }
    
    const fetchProgress = async () => {
      try {
        const agencyDatabase = localStorage.getItem('agency_database');
        if (!agencyDatabase) {
          navigate('/dashboard');
          return;
        }

        const apiBaseUrl = getApiBaseUrl();
        
        const response = await fetch(`${apiBaseUrl}/api/agencies/check-setup?database=${encodeURIComponent(agencyDatabase)}&detailed=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-Agency-Database': agencyDatabase || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Ensure data has required structure with defaults
          const normalizedData: SetupProgress = {
            setupComplete: data.setupComplete || false,
            progress: data.progress || 0,
            completedSteps: Array.isArray(data.completedSteps) ? data.completedSteps : [],
            totalSteps: data.totalSteps || 7,
            lastUpdated: data.lastUpdated || null,
            agencyName: data.agencyName || '',
          };
          setProgressData(normalizedData);
          
          // If setup is complete, redirect to dashboard
          if (normalizedData.setupComplete) {
            toast({
              title: 'Setup Complete!',
              description: 'Your agency setup is already complete.',
            });
            setTimeout(() => navigate('/dashboard'), 2000);
          }
        } else {
          throw new Error('Failed to fetch progress');
        }
      } catch (error: any) {
        console.error('Error fetching setup progress:', error);
        toast({
          title: 'Error',
          description: 'Failed to load setup progress. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading setup progress...</p>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Progress</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't load your setup progress. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safely destructure with defaults to prevent undefined errors
  const { 
    progress = 0, 
    completedSteps = [], 
    totalSteps = 7, 
    lastUpdated = null, 
    agencyName = '', 
    setupComplete = false 
  } = progressData || {};

  return (
    <PageContainer>
      <PageHeader
        title="Agency setup progress"
        description={
          agencyName
            ? `${agencyName} – track and complete your initial configuration.`
            : 'Track your agency setup status and complete the remaining steps.'
        }
        actions={
          <Badge variant={setupComplete ? 'default' : 'outline'}>
            {progress}% complete
          </Badge>
        }
      />

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {/* Left column: progress + checklist */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Overall progress
              </CardTitle>
              <CardDescription>
                {setupComplete
                  ? 'Setup is complete. You can still review and adjust configuration at any time.'
                  : `${completedSteps.length} of ${totalSteps} steps completed`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedSteps.length} steps completed</span>
                <span>{totalSteps - completedSteps.length} steps remaining</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup checklist</CardTitle>
              <CardDescription>
                Work through each section to finalise your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SETUP_STEPS.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.title);
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <StepIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.title}</span>
                          {isCompleted && (
                            <Badge variant="outline" className="text-[10px]">
                              Complete
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: meta + actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status & actions</CardTitle>
              <CardDescription>Key information about your setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Setup status</p>
                  <p className="font-medium">
                    {setupComplete ? 'Complete' : 'In progress'}
                  </p>
                </div>
                <Badge variant={setupComplete ? 'default' : 'secondary'}>
                  {setupComplete ? 'Ready to use' : 'Needs attention'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Last updated</p>
                    <p className="text-xs">
                      {lastUpdated
                        ? new Date(lastUpdated).toLocaleString()
                        : 'Not updated yet'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to dashboard
                </Button>
                {!setupComplete && (
                  <Button
                    className="w-full"
                    onClick={() => navigate('/agency-setup')}
                  >
                    Continue setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {setupComplete && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Setup complete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your agency has been fully configured. You can now focus on
                  day-to-day operations and use all available modules.
                </p>
                <p>
                  You can adjust these settings at any time from the{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 align-baseline text-primary"
                    onClick={() => navigate('/settings')}
                  >
                    Settings
                  </Button>{' '}
                  area.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
