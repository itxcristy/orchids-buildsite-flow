/**
 * Task Form Dialog
 * Comprehensive task creation and editing with all enterprise features
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Edit, X, Clock, Users, Link2, FileText, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { projectService, Task } from '@/services/api/project-service';
import { selectRecords } from '@/services/api/postgresql-service';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';
import { getProjectsForSelectionAuto } from '@/services/api/project-selector-service';

interface TaskFormDialogProps {
  task?: Task;
  onTaskSaved: () => void;
  trigger?: React.ReactNode;
  projectId?: string; // Pre-select project if provided
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Controlled open change handler
}

export function TaskFormDialog({ task, onTaskSaved, trigger, projectId, open: controlledOpen, onOpenChange }: TaskFormDialogProps) {
  const { user, profile } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeInput, setAssigneeInput] = useState('none');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
  const [checklistInput, setChecklistInput] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Task>>({
    title: "",
    description: "",
    project_id: projectId || null,
    assignee_id: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    start_date: null,
    estimated_hours: undefined,
    task_type: "",
  });

  // Load task data when editing
  useEffect(() => {
    if (task && open) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        project_id: task.project_id || null,
        assignee_id: task.assignee_id || null,
        status: task.status || "todo",
        priority: task.priority || "medium",
        due_date: task.due_date || null,
        start_date: task.start_date || null,
        estimated_hours: task.estimated_hours || undefined,
        task_type: task.task_type || "",
      });
      
      // Load assignees from task assignments
      if (task.assignments && task.assignments.length > 0) {
        setAssignees(task.assignments.map(a => a.user_id));
      } else if (task.assignee_id) {
        setAssignees([task.assignee_id]);
      } else {
        setAssignees([]);
      }
      
      // Load tags, dependencies, checklist
      setTags(Array.isArray(task.tags) ? task.tags : []);
      setDependencies(Array.isArray(task.dependencies) ? task.dependencies : []);
      setChecklistItems(Array.isArray(task.checklist) 
        ? task.checklist.map((item: any, idx: number) => ({
            id: item.id || `item-${idx}`,
            text: typeof item === 'string' ? item : item.text || '',
            completed: typeof item === 'object' ? (item.completed || false) : false
          }))
        : []);
    } else if (open && !task) {
      // Reset form for new task
      setFormData({
        title: "",
        description: "",
        project_id: projectId || null,
        assignee_id: null,
        status: "todo",
        priority: "medium",
        due_date: null,
        start_date: null,
        estimated_hours: undefined,
        task_type: "",
      });
      setAssignees([]);
      setTags([]);
      setDependencies([]);
      setChecklistItems([]);
      setAssigneeInput("none");
    }
  }, [task, open, projectId]);

  // Fetch projects and employees when dialog opens
  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchEmployees();
    }
  }, [open]);

  const fetchProjects = async () => {
    try {
      // Use standardized project fetching service
      const projectsData = await getProjectsForSelectionAuto(profile, user?.id, {
        includeInactive: false
      });
      
      // Transform to component format
      setProjects(projectsData.map(p => ({ 
        id: p.id, 
        name: p.name 
      })));
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      
      // Transform to component format
      const transformedEmployees = employeesData.map(emp => ({
        id: emp.user_id,
        full_name: emp.full_name
      }));
      
      setEmployees(transformedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    }
  };

  const addAssignee = (userId: string) => {
    if (userId && !assignees.includes(userId)) {
      setAssignees([...assignees, userId]);
      setAssigneeInput('');
    }
  };

  const removeAssignee = (userId: string) => {
    setAssignees(assignees.filter(id => id !== userId));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addDependency = (taskId: string) => {
    if (taskId && taskId !== task?.id && !dependencies.includes(taskId)) {
      setDependencies([...dependencies, taskId]);
    }
  };

  const removeDependency = (taskId: string) => {
    setDependencies(dependencies.filter(id => id !== taskId));
  };

  const addChecklistItem = () => {
    if (checklistInput.trim()) {
      setChecklistItems([...checklistItems, {
        id: `item-${Date.now()}`,
        text: checklistInput.trim(),
        completed: false
      }]);
      setChecklistInput('');
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems(checklistItems.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeChecklistItem = (itemId: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const taskData: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        project_id: formData.project_id || null,
        assignee_id: formData.assignee_id || null,
        status: formData.status || "todo",
        priority: formData.priority || "medium",
        due_date: formData.due_date || null,
        start_date: formData.start_date || null,
        estimated_hours: formData.estimated_hours || null,
        task_type: formData.task_type || null,
        tags: tags,
        dependencies: dependencies,
        checklist: checklistItems,
      };

      if (task?.id) {
        // Update existing task
        await projectService.updateTask(task.id, taskData, profile, user?.id);
        
        // Update assignees
        if (assignees.length > 0) {
          // Get current assignments
          const existingTask = await projectService.getTask(task.id, profile, user?.id);
          const existingAssigneeIds = existingTask?.assignments?.map((a: any) => a.user_id) || [];
          
          // Remove assignments that are no longer in the list
          for (const existingId of existingAssigneeIds) {
            if (!assignees.includes(existingId)) {
              await projectService.unassignTask(task.id, existingId, profile, user?.id);
            }
          }
          
          // Add new assignments (only for users not already assigned)
          for (const userId of assignees) {
            if (!existingAssigneeIds.includes(userId)) {
              await projectService.assignTask(task.id, userId, user?.id || '', profile);
            }
          }
        } else {
          // If no assignees, remove all existing assignments
          const existingTask = await projectService.getTask(task.id, profile, user?.id);
          if (existingTask?.assignments) {
            for (const assignment of existingTask.assignments) {
              await projectService.unassignTask(task.id, assignment.user_id, profile, user?.id);
            }
          }
        }
        
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const newTask = await projectService.createTask(taskData, profile, user?.id);
        
        // Add assignees (only if not already assigned via assignee_id)
        if (assignees.length > 0 && newTask.id) {
          for (const userId of assignees) {
            // assignTask will check for duplicates, so safe to call
            await projectService.assignTask(newTask.id, userId, user?.id || '', profile);
          }
        }
        
        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      // Reset form first
      setFormData({
        title: "",
        description: "",
        project_id: projectId || null,
        assignee_id: null,
        status: "todo",
        priority: "medium",
        due_date: null,
        start_date: null,
        estimated_hours: undefined,
        task_type: "",
      });
      setAssignees([]);
      setTags([]);
      setDependencies([]);
      setChecklistItems([]);
      
      // Close dialog and refresh
      setOpen(false);
      onTaskSaved();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      New Task
    </Button>
  );

  const editTrigger = (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlledOpen && (
        <DialogTrigger asChild>
          {trigger || (task ? editTrigger : defaultTrigger)}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details below." : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task_type">Task Type</Label>
                <Input
                  id="task_type"
                  value={formData.task_type || ""}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value || null })}
                  placeholder="e.g., Bug, Feature, Research"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
              />
            </div>
          </div>

          {/* Dates & Time */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? (
                        format(new Date(formData.start_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date ? new Date(formData.start_date) : undefined}
                      onSelect={(date) => setFormData({ ...formData, start_date: date ? date.toISOString().split('T')[0] : null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? (
                        format(new Date(formData.due_date), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date ? new Date(formData.due_date) : undefined}
                      onSelect={(date) => setFormData({ ...formData, due_date: date ? date.toISOString().split('T')[0] : null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours || ""}
                  onChange={(e) => 
                    setFormData({ 
                      ...formData, 
                      estimated_hours: e.target.value ? parseFloat(e.target.value) : null 
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Assignments</h3>
            <div className="space-y-2">
              <Label>Primary Assignee</Label>
              <Select
                value={formData.assignee_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Assignee</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label>Additional Assignees</Label>
                <div className="flex gap-2">
                  <Select
                    value={assigneeInput || "none"}
                    onValueChange={(value) => {
                      if (value && value !== "none") {
                        setAssigneeInput(value);
                        addAssignee(value);
                      } else {
                        setAssigneeInput("none");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select assignee...</SelectItem>
                      {employees
                        .filter(emp => !assignees.includes(emp.id))
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              {assignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignees.map((userId) => {
                    const emp = employees.find(e => e.id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {emp?.full_name || userId}
                        <button
                          type="button"
                          onClick={() => removeAssignee(userId)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Tags</h3>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Enter tag and press Enter"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Checklist</h3>
            <div className="flex gap-2">
              <Input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add checklist item"
              />
              <Button type="button" onClick={addChecklistItem} variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="h-4 w-4"
                    />
                    <span className={cn("flex-1", item.completed && "line-through text-muted-foreground")}>
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
