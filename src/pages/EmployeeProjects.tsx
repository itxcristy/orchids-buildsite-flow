import React, { useState, useEffect } from 'react';
import { Clock, Target, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';

const EmployeeProjects = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignedWork();
    }
  }, [user]);

  const fetchAssignedWork = async () => {
    try {
      setLoading(true);
      
      // Fetch projects assigned to the user
      const { data: projectsData, error: projectsError } = await db
        .from('projects')
        .select('*')
        .or(`assigned_team.ilike.%${user?.id}%,created_by.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch jobs assigned to the user
      const { data: jobsData, error: jobsError } = await db
        .from('jobs')
        .select('*')
        .eq('assigned_to', user?.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setProjects(projectsData || []);
      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error fetching assigned work:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your assigned projects and jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'on_hold': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = (project: any) => {
    return project.progress || 0;
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return 'No deadline';
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.status === 'in_progress').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading your projects and jobs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Projects & Jobs</h1>
          <p className="text-muted-foreground">Track your assigned projects and job tasks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{stats.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{stats.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects and Jobs Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
          <TabsTrigger value="jobs">My Jobs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Assigned</h3>
                <p className="text-muted-foreground">You don't have any projects assigned yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusIcon(project.status)}
                          <span className="ml-1">{project.status?.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-semibold">₹{(project.budget || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="font-semibold">{getProgressPercentage(project)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-semibold">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deadline</p>
                        <p className="font-semibold">
                          {project.end_date ? getDaysRemaining(project.end_date) : 'No deadline'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Project Progress</span>
                        <span className="text-sm text-muted-foreground">{getProgressPercentage(project)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${getProgressPercentage(project)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        View Timeline
                      </Button>
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-1" />
                        Log Time
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="jobs" className="space-y-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Assigned</h3>
                <p className="text-muted-foreground">You don't have any jobs assigned yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {job.job_number} • {job.description}
                        </p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1">{job.status?.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-semibold">₹{(job.budget || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Hours</p>
                        <p className="font-semibold">{job.estimated_hours || 0}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Actual Hours</p>
                        <p className="font-semibold">{job.actual_hours || 0}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deadline</p>
                        <p className="font-semibold">
                          {job.end_date ? getDaysRemaining(job.end_date) : 'No deadline'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-1" />
                        Log Hours
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Update Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeProjects;