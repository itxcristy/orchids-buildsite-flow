import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskPerformance } from "@/services/api/performance-service";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, XCircle, ExternalLink, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TaskPerformanceListProps {
  tasks: TaskPerformance[];
  loading?: boolean;
}

type TaskFilter = 'all' | 'completed' | 'in_progress' | 'overdue' | 'pending';
type SortField = 'title' | 'status' | 'priority' | 'assigned_date' | 'due_date' | 'completed_date';
type SortOrder = 'asc' | 'desc';

export function TaskPerformanceList({ tasks, loading }: TaskPerformanceListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sortField, setSortField] = useState<SortField>('assigned_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Performance</CardTitle>
          <CardDescription>Loading tasks...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'in_progress') return task.status === 'in_progress';
    if (filter === 'overdue') return task.completion_status === 'overdue';
    if (filter === 'pending') return task.status === 'pending' || task.status === 'todo';
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'priority':
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority] || 0;
        bValue = priorityOrder[b.priority] || 0;
        break;
      case 'assigned_date':
        aValue = a.assigned_date ? new Date(a.assigned_date).getTime() : 0;
        bValue = b.assigned_date ? new Date(b.assigned_date).getTime() : 0;
        break;
      case 'due_date':
        aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
        bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
        break;
      case 'completed_date':
        aValue = a.completed_date ? new Date(a.completed_date).getTime() : 0;
        bValue = b.completed_date ? new Date(b.completed_date).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleTaskClick = (taskId: string) => {
    // Navigate to project management page - tasks are in the tasks tab
    navigate(`/project-management`);
    toast({
      title: "Navigate to Tasks Tab",
      description: "Please switch to the 'Tasks' tab in Project Management to view all tasks.",
    });
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Performance</CardTitle>
          <CardDescription>No tasks found for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No tasks assigned during this period
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      urgent: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[priority] || 'outline'}>
        {priority}
      </Badge>
    );
  };

  const getCompletionStatusBadge = (status: TaskPerformance['completion_status']) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'on-time': 'default',
      'late': 'secondary',
      'overdue': 'destructive',
      'pending': 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
          <div>
            <CardTitle>Task Performance</CardTitle>
            <CardDescription>
              {filteredTasks.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''} shown
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: TaskFilter) => setFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('title')}
                  >
                    Task
                    {sortField === 'title' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Project</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortField === 'status' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                    {sortField === 'priority' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('assigned_date')}
                  >
                    Assigned
                    {sortField === 'assigned_date' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('due_date')}
                  >
                    Due Date
                    {sortField === 'due_date' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-3"
                    onClick={() => handleSort('completed_date')}
                  >
                    Completed
                    {sortField === 'completed_date' && (
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow key={task.id} className="cursor-pointer hover:bg-accent" onClick={() => handleTaskClick(task.id)}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.project_name || 'No Project'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>
                    {task.assigned_date
                      ? format(new Date(task.assigned_date), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {task.due_date
                      ? format(new Date(task.due_date), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {task.completed_date
                      ? format(new Date(task.completed_date), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {task.estimated_hours && (
                        <div>Est: {task.estimated_hours}h</div>
                      )}
                      {task.actual_hours && (
                        <div>Act: {task.actual_hours}h</div>
                      )}
                      {task.time_taken_hours && (
                        <div className="text-muted-foreground">
                          Took: {task.time_taken_hours.toFixed(1)}h
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCompletionStatusBadge(task.completion_status)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
