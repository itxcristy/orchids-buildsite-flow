import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getApiBaseUrl } from '@/config/api';
import { PageContainer, PageHeader } from '@/components/layout';
import { Loader2, Shield, Settings, Building2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SetupStatus {
  setupComplete: boolean;
}

export default function SuperAdminDashboard() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  // Basic client-side guard to ensure agency in URL matches current agency context
  const currentAgencyId = typeof window !== 'undefined' ? localStorage.getItem('agency_id') : null;
  if (agencyId && currentAgencyId && agencyId !== currentAgencyId) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Access Restricted
              </CardTitle>
              <CardDescription>
                You don't have permission to manage this agency. Please switch to the correct workspace.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Extra safety: if somehow a non-super_admin reaches here, bounce them
  if (userRole && userRole !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchSetupStatus = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const agencyDatabase = localStorage.getItem('agency_database') || '';

        const response = await fetch(
          `${apiBaseUrl}/api/agencies/check-setup?database=${encodeURIComponent(agencyDatabase)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
              'X-Agency-Database': agencyDatabase,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch setup status');
        }

        const data = await response.json();
        const isComplete = !!data.setupComplete;
        setSetupStatus({ setupComplete: isComplete });
        
        // If setup is incomplete, redirect to the better setup progress page
        if (!isComplete) {
          navigate('/agency-setup-progress', { replace: true });
        }
      } catch (error: any) {
        console.error('Error loading agency setup status:', error);
        toast({
          title: 'Unable to load setup status',
          description: error?.message || 'We could not determine your agency setup state.',
          variant: 'destructive',
        });
        setSetupStatus({ setupComplete: false });
        // On error, assume setup needed and redirect to progress page
        navigate('/agency-setup-progress', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchSetupStatus();
  }, [toast, navigate]);

  if (loading) {
    return (
      <PageContainer>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  const profileStepCompleted = setupStatus?.setupComplete ? 1 : 0;
  const totalSteps = 5;
  const progress = (profileStepCompleted / totalSteps) * 100;

  return (
    <PageContainer>
      <PageHeader
        title="Super Admin Dashboard"
        description="Configure and monitor your agency from a single control center."
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              SUPER ADMIN
            </Badge>
            <Badge variant={setupStatus?.setupComplete ? 'default' : 'secondary'}>
              {setupStatus?.setupComplete ? 'Ready for Launch' : 'Setup Incomplete'}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Onboarding Progress Tracker */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Onboarding Progress
            </CardTitle>
            <CardDescription>
              Track and complete the core steps required to launch your agency.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Setup</span>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />

            <div className="space-y-3 mt-4">
              <StepRow
                title="Agency Profile"
                description="Company profile, legal details, and contact information."
                completed={!!setupStatus?.setupComplete}
                href="/agency-setup"
              />
              <StepRow
                title="Branding & Identity"
                description="Logo, colors, and visual identity."
                completed={!!setupStatus?.setupComplete}
                href="/agency-setup"
              />
              <StepRow
                title="Pages & Modules"
                description="Enable or disable modules like CRM, Analytics, and Payroll."
                completed={false}
              />
              <StepRow
                title="Roles & Permissions"
                description="Define who can access which parts of your agency."
                completed={false}
                href="/assign-user-roles"
              />
              <StepRow
                title="Billing & Plan"
                description="Verify your subscription plan and usage."
                completed={false}
                href="/financial-management"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agency Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Agency Snapshot
            </CardTitle>
            <CardDescription>
              High-level view of your workspace status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Setup Status</p>
                <p className="text-sm font-medium">
                  {setupStatus?.setupComplete ? 'Complete' : 'In Progress'}
                </p>
              </div>
              {setupStatus?.setupComplete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Primary Role</p>
                <p className="text-sm font-medium capitalize">{userRole || 'super_admin'}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>

            <Button
              className="w-full mt-2"
              variant={setupStatus?.setupComplete ? 'outline' : 'default'}
              onClick={() => {
                if (setupStatus?.setupComplete) {
                  navigate('/agency-setup');
                } else {
                  navigate('/agency-setup-progress');
                }
              }}
            >
              {setupStatus?.setupComplete ? 'Review Setup Wizard' : 'View Setup Progress'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

interface StepRowProps {
  title: string;
  description: string;
  completed: boolean;
  href?: string;
}

function StepRow({ title, description, completed, href }: StepRowProps) {
  const content = (
    <div className="flex items-start justify-between gap-3 p-3 rounded-md border hover:bg-muted/60 transition-colors cursor-pointer">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          {title}
          {completed && (
            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600">
              Completed
            </Badge>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="mt-1">
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Shield className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href}>
        {content}
      </a>
    );
  }

  return content;
}

