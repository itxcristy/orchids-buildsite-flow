/**
 * Task Kanban Board
 * Comprehensive task management with multiple views and full functionality
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, 
  Calendar, 
  User, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  List,
  Kanban as KanbanIcon,
  Calendar as CalendarIcon,
  GanttChart,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { TaskFormDialog } from "./TaskFormDialog";
import { projectService, Task } from "@/services/api/project-service";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColumns = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'in_review', title: 'In Review', color: 'bg-yellow-100' },
  { id: 'blocked', title: 'Blocked', color: 'bg-orange-100' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100' },
];

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800',
};

interface TaskKanbanBoardProps {
  projectId?: string;
}

type ViewMode = 'kanban' | 'list' | 'calendar' | 'timeline';

export function TaskKanbanBoard({ projectId }: TaskKanbanBoardProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (projectId) {
        filters.project_id = projectId;
      }
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      if (priorityFilter !== 'all') {
        filters.priority = [priorityFilter];
      }
      if (assigneeFilter !== 'all') {
        filters.assignee_id = assigneeFilter;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const data = await projectService.getTasks(filters, profile, user?.id);
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await projectService.updateTask(taskId, { 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      } as any, profile, user?.id);

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTask) return;

    try {
      await projectService.deleteTask(deleteTask.id, profile, user?.id);
      setTasks(tasks.filter(task => task.id !== deleteTask.id));
      setDeleteTask(null);
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== status) {
      updateTaskStatus(taskId, status);
    }
  };

  // Get unique assignees for filter
  const assignees = Array.from(new Set(
    tasks
      .map(t => t.assignee_id)
      .filter(Boolean)
      .concat(
        tasks.flatMap(t => t.assignments?.map(a => a.user_id) || [])
      )
  ));

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all') {
      if (task.assignee_id !== assigneeFilter && 
          !task.assignments?.some(a => a.user_id === assigneeFilter)) {
        return false;
      }
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.project?.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters and Views */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                fetchTasks();
              }}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            fetchTasks();
          }}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusColumns.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value) => {
            setPriorityFilter(value);
            fetchTasks();
          }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <KanbanIcon className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <TaskFormDialog onTaskSaved={fetchTasks} projectId={projectId} />
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className={`${column.color} rounded-lg p-4 min-h-[500px]`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.id as Task['status'])}
            >
              <h4 className="font-medium mb-4 flex items-center justify-between">
                {column.title}
                <Badge variant="secondary">
                  {filteredTasks.filter(task => task.status === column.id).length}
                </Badge>
              </h4>

              <div className="space-y-3">
                {filteredTasks
                  .filter(task => task.status === column.id)
                  .map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-move hover:shadow-md transition-shadow bg-white"
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle 
                            className="text-sm font-medium line-clamp-2 cursor-pointer"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            {task.title}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/tasks/${task.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <TaskFormDialog
                                  task={task}
                                  onTaskSaved={fetchTasks}
                                  trigger={
                                    <div className="flex items-center cursor-pointer w-full">
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </div>
                                  }
                                />
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteTask(task)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={priorityColors[task.priority] || priorityColors.medium}
                          >
                            {task.priority}
                          </Badge>

                          {task.estimated_hours && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {task.estimated_hours}h
                            </div>
                          )}
                        </div>

                        {task.due_date && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(task.due_date), "MMM dd")}
                          </div>
                        )}

                        {task.project?.name && (
                          <Badge variant="outline" className="text-xs">
                            {task.project.name}
                          </Badge>
                        )}

                        {/* Show assignees */}
                        {task.assignments && task.assignments.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.assignments.slice(0, 3).map((assignment) => (
                              <Avatar key={assignment.id} className="h-5 w-5">
                                <AvatarImage src={assignment.user?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {assignment.user?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {task.assignments.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{task.assignments.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {task.assignee_id && (!task.assignments || task.assignments.length === 0) && (
                          <div className="flex items-center text-xs">
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarImage src={task.assignee?.avatar_url} />
                              <AvatarFallback>
                                {task.assignee?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{task.assignee?.full_name || 'Unassigned'}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Task</th>
                    <th className="text-left p-4">Project</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Priority</th>
                    <th className="text-left p-4">Assignees</th>
                    <th className="text-left p-4">Due Date</th>
                    <th className="text-left p-4">Hours</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {task.project?.name || '-'}
                      </td>
                      <td className="p-4">
                        <Badge className={statusColumns.find(c => c.id === task.status)?.color || 'bg-gray-100'}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={priorityColors[task.priority] || priorityColors.medium}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {task.assignments && task.assignments.length > 0 ? (
                            <>
                              {task.assignments.slice(0, 3).map((assignment) => (
                                <Avatar key={assignment.id} className="h-6 w-6">
                                  <AvatarImage src={assignment.user?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {assignment.user?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {task.assignments.length > 3 && (
                                <span className="text-xs">+{task.assignments.length - 3}</span>
                              )}
                            </>
                          ) : task.assignee_id ? (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {task.assignee?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : '-'}
                      </td>
                      <td className="p-4">
                        {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <TaskFormDialog
                            task={task}
                            onTaskSaved={fetchTasks}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTask(task)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No tasks found. Create your first task to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Calendar view coming soon...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Timeline view coming soon...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
