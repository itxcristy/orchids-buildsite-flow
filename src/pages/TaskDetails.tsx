/**
 * Task Details Page
 * Complete task view with comments, time tracking, dependencies, and all features
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Link2,
  CheckSquare,
  Plus,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { projectService, Task, TaskComment, TimeTracking } from "@/services/api/project-service";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  blocked: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [timeHours, setTimeHours] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeDescription, setTimeDescription] = useState('');
  const [submittingTime, setSubmittingTime] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await projectService.getTask(id, profile, user?.id);
      setTask(data);
    } catch (error: any) {
      console.error('Error loading task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load task",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [id, profile, user?.id, toast]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await projectService.getTaskComments(id, profile, user?.id);
      setComments(data);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  }, [id, profile, user?.id]);

  const loadTimeTracking = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await projectService.getTaskTimeTracking(id, profile, user?.id);
      setTimeEntries(data);
    } catch (error: any) {
      console.error('Error loading time tracking:', error);
    }
  }, [id, profile, user?.id]);

  useEffect(() => {
    if (id) {
      loadTask();
      loadComments();
      loadTimeTracking();
    }
  }, [id, loadTask, loadComments, loadTimeTracking]);

  const handleTaskSaved = () => {
    loadTask();
    loadComments();
    loadTimeTracking();
    setShowEditForm(false);
  };

  const handleAddComment = async () => {
    if (!id || !commentText.trim()) return;
    
    setSubmittingComment(true);
    try {
      await projectService.createTaskComment(id, commentText.trim(), profile, user?.id);
      setCommentText('');
      loadComments();
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLogTime = async () => {
    if (!id || !timeHours || !timeDate) return;
    
    const hours = parseFloat(timeHours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid number of hours",
        variant: "destructive"
      });
      return;
    }
    
    setSubmittingTime(true);
    try {
      await projectService.logTime(id, hours, timeDate, timeDescription || null, profile, user?.id);
      setTimeHours('');
      setTimeDescription('');
      setTimeDate(new Date().toISOString().split('T')[0]);
      loadTimeTracking();
      loadTask(); // Refresh task to update actual_hours
      toast({
        title: "Success",
        description: "Time logged successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log time",
        variant: "destructive"
      });
    } finally {
      setSubmittingTime(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Task not found</p>
            <Button onClick={() => navigate('/project-management')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, "PPP");
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatDateSafe = (dateString: string | null | undefined, formatStr: string = "MMM dd, yyyy") => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, formatStr);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const totalHoursLogged = timeEntries.reduce((sum, entry) => sum + Number(entry.hours_logged || 0), 0);
  const progress = task.estimated_hours && task.estimated_hours > 0
    ? Math.min((totalHoursLogged / task.estimated_hours) * 100, 100)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/project-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            {task.project?.name && (
              <p className="text-muted-foreground">Project: {task.project.name}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowEditForm(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Task
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[task.status] || statusColors.todo}>
              {task.status ? task.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={priorityColors[task.priority] || priorityColors.medium}>
              {task.priority.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalHoursLogged.toFixed(1)}h / {task.estimated_hours || 0}h
            </p>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const assignmentCount = task.assignments?.length || 0;
                const hasPrimaryAssignee = task.assignee_id && !task.assignments?.some(a => a.user_id === task.assignee_id);
                return assignmentCount + (hasPrimaryAssignee ? 1 : 0);
              })()}
            </div>
            <p className="text-xs text-muted-foreground">assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1">{task.description || 'No description provided'}</p>
                </div>
                {task.task_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Task Type</p>
                    <p className="mt-1">{task.task_type}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="mt-1">{formatDate(task.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="mt-1">{formatDate(task.due_date)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Hours</p>
                    <p className="mt-1">{task.estimated_hours || 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual Hours</p>
                    <p className="mt-1">{task.actual_hours || 0}h</p>
                  </div>
                </div>
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {task.checklist && task.checklist.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Checklist</p>
                    <div className="space-y-2">
                      {task.checklist.map((item: any, idx: number) => {
                        const text = typeof item === 'string' ? item : item.text || '';
                        const completed = typeof item === 'object' ? (item.completed || false) : false;
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                            <input
                              type="checkbox"
                              checked={completed}
                              disabled
                              className="h-4 w-4"
                            />
                            <span className={completed ? "line-through text-muted-foreground" : ""}>
                              {text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.assignments && task.assignments.length > 0 ? (
                  <div className="space-y-3">
                    {task.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={assignment.user?.avatar_url} />
                            <AvatarFallback>
                              {assignment.user?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{assignment.user?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              Assigned {formatDateSafe(assignment.assigned_at, "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {task.assignee_id && (!task.assignments || !task.assignments.some(a => a.user_id === task.assignee_id)) ? (
                  <div className="flex items-center gap-3 p-2 border rounded">
                    <Avatar>
                      <AvatarImage src={task.assignee?.avatar_url} />
                      <AvatarFallback>
                        {task.assignee?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{task.assignee?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">Primary Assignee</p>
                    </div>
                  </div>
                ) : null}
                {(!task.assignments || task.assignments.length === 0) && !task.assignee_id && (
                  <p className="text-muted-foreground">No assignees</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={submittingComment || !commentText.trim()}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {submittingComment ? "Adding..." : "Add Comment"}
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4 mt-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-4 border rounded">
                    <Avatar>
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback>
                        {comment.user?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{comment.user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateSafe(comment.created_at, "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <p className="mt-1 text-sm">{comment.comment}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Log Time */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={timeDate}
                    onChange={(e) => setTimeDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hours</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    placeholder="What did you work on?"
                  />
                </div>
                <div className="md:col-span-4">
                  <Button 
                    onClick={handleLogTime} 
                    disabled={submittingTime || !timeHours || !timeDate}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {submittingTime ? "Logging..." : "Log Time"}
                  </Button>
                </div>
              </div>

              {/* Time Entries */}
              <div className="space-y-2 mt-6">
                <h4 className="font-medium">Time Entries</h4>
                {timeEntries.length > 0 ? (
                  <div className="space-y-2">
                    {timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{entry.user?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateSafe(entry.date, "MMM dd, yyyy")}
                            {entry.description && ` • ${entry.description}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{Number(entry.hours_logged).toFixed(2)}h</p>
                          {entry.billable && (
                            <Badge variant="outline" className="text-xs">Billable</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No time entries yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use the Edit Task button to manage assignments
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Form Dialog */}
      <TaskFormDialog
        task={task}
        onTaskSaved={handleTaskSaved}
        open={showEditForm}
        onOpenChange={setShowEditForm}
        trigger={<div style={{ display: 'none' }} />}
      />
    </div>
  );
}
