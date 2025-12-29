import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface Resource {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  availability: number;
  current_projects: number;
  utilization: number;
  total_hours?: number;
  estimated_hours?: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  assigned_to: string;
  estimated_hours: number;
  actual_hours: number;
}

interface ResourceManagementProps {
  resources: Resource[];
  projects: Project[];
}

export function ResourceManagement({ resources, projects }: ResourceManagementProps) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const getResourceProjects = (resourceId: string) => {
    return projects.filter(project => project.assigned_to === resourceId);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60) return 'text-green-600';
    if (utilization < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization < 60) return 'Under-utilized';
    if (utilization < 80) return 'Optimal';
    if (utilization < 95) return 'Fully utilized';
    return 'Over-allocated';
  };

  const calculateResourceMetrics = () => {
    const totalResources = resources.length;
    const availableResources = resources.filter(r => r.availability > 0).length;
    const overUtilized = resources.filter(r => r.utilization > 90).length;
    const avgUtilization = resources.reduce((sum, r) => sum + r.utilization, 0) / totalResources;

    return {
      totalResources,
      availableResources,
      overUtilized,
      avgUtilization
    };
  };

  const metrics = calculateResourceMetrics();

  return (
    <div className="space-y-6">
      {/* Resource Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.availableResources} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              across all resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over-allocated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overUtilized}</div>
            <p className="text-xs text-muted-foreground">
              resources at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.availableResources / metrics.totalResources) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              available capacity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resource Overview</TabsTrigger>
          <TabsTrigger value="allocation">Allocation Matrix</TabsTrigger>
          <TabsTrigger value="planning">Capacity Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedResource(resource)}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {resource.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{resource.name}</CardTitle>
                      <CardDescription>{resource.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Utilization</span>
                      <span className={getUtilizationColor(resource.utilization)}>
                        {resource.utilization}%
                      </span>
                    </div>
                    <Progress value={resource.utilization} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {getUtilizationStatus(resource.utilization)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Availability</span>
                      </div>
                      <p className="font-medium">{resource.availability}%</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Rate</span>
                      </div>
                      <p className="font-medium">
                        {resource.hourly_rate > 0 ? `$${resource.hourly_rate.toFixed(2)}/hr` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {resource.current_projects} projects
                    </Badge>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Allocation Matrix</CardTitle>
              <CardDescription>
                Project assignments and workload distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Resource</th>
                      <th className="text-left p-4">Role</th>
                      <th className="text-left p-4">Current Projects</th>
                      <th className="text-left p-4">Hours/Week</th>
                      <th className="text-left p-4">Utilization</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => (
                      <tr key={resource.id} className="border-b hover:bg-muted/25">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {resource.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{resource.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{resource.role}</td>
                        <td className="p-4">{resource.current_projects}</td>
                        <td className="p-4">
                          {resource.estimated_hours ? Math.round(resource.estimated_hours) : 
                           Math.round(40 * (resource.utilization / 100))}h
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Progress value={resource.utilization} className="w-20 h-2" />
                            <span className={`text-sm ${getUtilizationColor(resource.utilization)}`}>
                              {resource.utilization}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={resource.utilization > 90 ? "destructive" : 
                                   resource.utilization > 80 ? "default" : "secondary"}
                          >
                            {getUtilizationStatus(resource.utilization)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Capacity Planning</CardTitle>
              <CardDescription>
                Future resource needs and capacity forecasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Capacity Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold">Current Capacity</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {resources.reduce((sum, r) => sum + r.availability, 0)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Available now</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold">Projected Need</h4>
                      <p className="text-2xl font-bold text-orange-600">120%</p>
                      <p className="text-sm text-muted-foreground">Next quarter</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold">Gap</h4>
                      <p className="text-2xl font-bold text-red-600">-15%</p>
                      <p className="text-sm text-muted-foreground">Shortage</p>
                    </div>
                  </Card>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Recommendations</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900">Hire Additional Developer</h5>
                        <p className="text-sm text-blue-700">
                          Consider hiring 1-2 senior developers to meet projected demand
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-yellow-900">Redistribute Workload</h5>
                        <p className="text-sm text-yellow-700">
                          Balance assignments across team members to optimize utilization
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-green-900">Upskill Existing Team</h5>
                        <p className="text-sm text-green-700">
                          Provide training to increase productivity and capabilities
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resource Detail Modal would go here */}
      {selectedResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedResource.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedResource.name}</CardTitle>
                    <CardDescription>{selectedResource.role}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedResource(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Hourly Rate</h4>
                    <p className="text-lg">
                      {selectedResource.hourly_rate > 0 ? `$${selectedResource.hourly_rate.toFixed(2)}` : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">Availability</h4>
                    <p className="text-lg">{selectedResource.availability}%</p>
                  </div>
                  {selectedResource.total_hours !== undefined && (
                    <>
                      <div>
                        <h4 className="font-medium">Total Hours Logged</h4>
                        <p className="text-lg">{Math.round(selectedResource.total_hours)}h</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Estimated Hours</h4>
                        <p className="text-lg">{Math.round(selectedResource.estimated_hours || 0)}h</p>
                      </div>
                    </>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Current Projects</h4>
                  <div className="space-y-2">
                    {getResourceProjects(selectedResource.id).map((project) => (
                      <div key={project.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span>{project.title}</span>
                        <Badge>{project.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}