/**
 * Project Management Service
 * Comprehensive API service for project and task management
 */

import { selectRecords, selectOne, insertRecord, updateRecord, deleteRecord } from './postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import { useAuth } from '@/hooks/useAuth';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_code: string | null;
  project_type: string | null;
  status: 'planning' | 'active' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  budget: number | null;
  actual_cost: number | null;
  allocated_budget: number | null;
  cost_center: string | null;
  currency: string;
  client_id: string | null;
  project_manager_id: string | null;
  account_manager_id: string | null;
  assigned_team: string[];
  departments: string[];
  tags: string[];
  categories: string[];
  custom_fields: Record<string, any>;
  progress: number;
  agency_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    id: string;
    name: string;
    company_name: string | null;
  };
  project_manager?: {
    id: string;
    full_name: string;
  };
  account_manager?: {
    id: string;
    full_name: string;
  };
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  progress: number;
  assignee_id: string | null;
  created_by: string | null;
  completed_at: string | null;
  tags: string[];
  attachments: any[];
  checklist: any[];
  dependencies: string[];
  custom_fields: Record<string, any>;
  agency_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    full_name: string;
  };
  assignments?: Array<{
    id: string;
    user_id: string;
    user: {
      id: string;
      full_name: string;
    };
  }>;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  agency_id: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  parent_comment_id: string | null;
  attachments: any[];
  mentions: string[];
  agency_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface TimeTracking {
  id: string;
  task_id: string;
  user_id: string;
  date: string;
  hours_logged: number;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  billable: boolean;
  hourly_rate: number | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

export interface ProjectFilters {
  status?: string[];
  client_id?: string;
  project_manager_id?: string;
  priority?: string[];
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  budget_range?: {
    min: number;
    max: number;
  };
  search?: string;
}

export interface TaskFilters {
  project_id?: string;
  assignee_id?: string;
  status?: string[];
  priority?: string[];
  due_date_range?: {
    start: string;
    end: string;
  };
  tags?: string[];
  search?: string;
}

class ProjectService {
  /**
   * Get agency ID from auth context
   */
  private async getAgencyId(profile: any, userId: string | null | undefined): Promise<string> {
    const agencyId = await getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found. Please ensure you are logged in.');
    }
    return agencyId;
  }

  /**
   * Generate project code
   */
  private async generateProjectCode(agencyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const projects = await selectRecords('projects', {
      where: { agency_id: agencyId },
      filters: [
        { column: 'project_code', operator: 'like', value: `PRJ-${year}-%` }
      ]
    });
    
    const nextNumber = (projects.length || 0) + 1;
    return `PRJ-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Projects CRUD
   */
  async getProjects(filters?: ProjectFilters, profile?: any, userId?: string | null): Promise<Project[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const where: any = { agency_id: agencyId };
    const queryFilters: any[] = [];

    if (filters?.status && filters.status.length > 0) {
      queryFilters.push({ column: 'status', operator: 'in', value: filters.status });
    }
    if (filters?.client_id) {
      where.client_id = filters.client_id;
    }
    if (filters?.project_manager_id) {
      where.project_manager_id = filters.project_manager_id;
    }
    if (filters?.priority && filters.priority.length > 0) {
      queryFilters.push({ column: 'priority', operator: 'in', value: filters.priority });
    }
    if (filters?.search) {
      queryFilters.push({
        column: '__or__',
        operator: 'or',
        value: `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%`
      });
    }

    const projects = await selectRecords('projects', {
      where,
      filters: queryFilters.length > 0 ? queryFilters : undefined,
      orderBy: 'created_at DESC'
    });

    // Fetch related data
    const clientIds = [...new Set(projects.map((p: any) => p.client_id).filter(Boolean))];
    const managerIds = [...new Set([
      ...projects.map((p: any) => p.project_manager_id).filter(Boolean),
      ...projects.map((p: any) => p.account_manager_id).filter(Boolean)
    ])].filter(Boolean);

    const clients = clientIds.length > 0 ? await selectRecords('clients', {
      where: { agency_id: agencyId, id: { operator: 'in', value: clientIds } }
    }) : [];

    const managers = managerIds.length > 0 ? await selectRecords('profiles', {
      where: { agency_id: agencyId, user_id: { operator: 'in', value: managerIds } }
    }) : [];

    const clientMap = new Map(clients.map((c: any) => [c.id, c]));
    const managerMap = new Map(managers.map((m: any) => [m.user_id, m]));

    return projects.map((project: any) => ({
      ...project,
      assigned_team: Array.isArray(project.assigned_team) ? project.assigned_team : 
                    typeof project.assigned_team === 'string' ? JSON.parse(project.assigned_team || '[]') : [],
      departments: Array.isArray(project.departments) ? project.departments : 
                   typeof project.departments === 'string' ? JSON.parse(project.departments || '[]') : [],
      tags: Array.isArray(project.tags) ? project.tags : 
            typeof project.tags === 'string' ? JSON.parse(project.tags || '[]') : [],
      categories: Array.isArray(project.categories) ? project.categories : 
                  typeof project.categories === 'string' ? JSON.parse(project.categories || '[]') : [],
      custom_fields: typeof project.custom_fields === 'object' ? project.custom_fields : 
                     typeof project.custom_fields === 'string' ? JSON.parse(project.custom_fields || '{}') : {},
      client: project.client_id ? clientMap.get(project.client_id) : undefined,
      project_manager: project.project_manager_id ? managerMap.get(project.project_manager_id) : undefined,
      account_manager: project.account_manager_id ? managerMap.get(project.account_manager_id) : undefined,
    }));
  }

  async getProject(id: string, profile?: any, userId?: string | null): Promise<Project | null> {
    const agencyId = await this.getAgencyId(profile, userId);
    const project = await selectOne('projects', { id, agency_id: agencyId });
    
    if (!project) return null;

    // Fetch related data
    const [client, projectManager, accountManager] = await Promise.all([
      project.client_id ? selectOne('clients', { id: project.client_id, agency_id: agencyId }) : null,
      project.project_manager_id ? selectOne('profiles', { user_id: project.project_manager_id, agency_id: agencyId }) : null,
      project.account_manager_id ? selectOne('profiles', { user_id: project.account_manager_id, agency_id: agencyId }) : null,
    ]);

    return {
      ...project,
      assigned_team: Array.isArray(project.assigned_team) ? project.assigned_team : 
                    typeof project.assigned_team === 'string' ? JSON.parse(project.assigned_team || '[]') : [],
      departments: Array.isArray(project.departments) ? project.departments : 
                   typeof project.departments === 'string' ? JSON.parse(project.departments || '[]') : [],
      tags: Array.isArray(project.tags) ? project.tags : 
            typeof project.tags === 'string' ? JSON.parse(project.tags || '[]') : [],
      categories: Array.isArray(project.categories) ? project.categories : 
                  typeof project.categories === 'string' ? JSON.parse(project.categories || '[]') : [],
      custom_fields: typeof project.custom_fields === 'object' ? project.custom_fields : 
                     typeof project.custom_fields === 'string' ? JSON.parse(project.custom_fields || '{}') : {},
      client: client || undefined,
      project_manager: projectManager ? { id: projectManager.user_id, full_name: projectManager.full_name } : undefined,
      account_manager: accountManager ? { id: accountManager.user_id, full_name: accountManager.full_name } : undefined,
    };
  }

  async createProject(data: Partial<Project>, profile?: any, userId?: string | null): Promise<Project> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const projectData: any = {
      name: data.name,
      description: data.description || null,
      project_code: data.project_code || await this.generateProjectCode(agencyId),
      project_type: data.project_type || null,
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      deadline: data.deadline || null,
      budget: data.budget || null,
      actual_cost: data.actual_cost || 0,
      allocated_budget: data.allocated_budget || null,
      cost_center: data.cost_center || null,
      currency: data.currency || 'USD',
      client_id: data.client_id || null,
      project_manager_id: data.project_manager_id || null,
      account_manager_id: data.account_manager_id || null,
      assigned_team: JSON.stringify(data.assigned_team || []),
      departments: JSON.stringify(data.departments || []),
      tags: JSON.stringify(data.tags || []),
      categories: JSON.stringify(data.categories || []),
      custom_fields: JSON.stringify(data.custom_fields || {}),
      progress: data.progress || 0,
      agency_id: agencyId,
      created_by: userId || null,
    };

    const project = await insertRecord('projects', projectData, userId, agencyId);
    return this.getProject(project.id, profile, userId) as Promise<Project>;
  }

  async updateProject(id: string, data: Partial<Project>, profile?: any, userId?: string | null): Promise<Project> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.project_code !== undefined) updateData.project_code = data.project_code;
    if (data.project_type !== undefined) updateData.project_type = data.project_type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.end_date !== undefined) updateData.end_date = data.end_date;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.actual_cost !== undefined) updateData.actual_cost = data.actual_cost;
    if (data.allocated_budget !== undefined) updateData.allocated_budget = data.allocated_budget;
    if (data.cost_center !== undefined) updateData.cost_center = data.cost_center;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.client_id !== undefined) updateData.client_id = data.client_id;
    if (data.project_manager_id !== undefined) updateData.project_manager_id = data.project_manager_id;
    if (data.account_manager_id !== undefined) updateData.account_manager_id = data.account_manager_id;
    if (data.assigned_team !== undefined) updateData.assigned_team = JSON.stringify(data.assigned_team);
    if (data.departments !== undefined) updateData.departments = JSON.stringify(data.departments);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.categories !== undefined) updateData.categories = JSON.stringify(data.categories);
    if (data.custom_fields !== undefined) updateData.custom_fields = JSON.stringify(data.custom_fields);
    if (data.progress !== undefined) updateData.progress = data.progress;

    await updateRecord('projects', updateData, { id, agency_id: agencyId }, userId);
    return this.getProject(id, profile, userId) as Promise<Project>;
  }

  async deleteProject(id: string, profile?: any, userId?: string | null): Promise<void> {
    const agencyId = await this.getAgencyId(profile, userId);
    await deleteRecord('projects', { id, agency_id: agencyId }, userId);
  }

  /**
   * Tasks CRUD
   */
  async getTasks(filters?: TaskFilters, profile?: any, userId?: string | null): Promise<Task[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const where: any = { agency_id: agencyId };
    const queryFilters: any[] = [];

    if (filters?.project_id) {
      where.project_id = filters.project_id;
    }
    if (filters?.assignee_id) {
      where.assignee_id = filters.assignee_id;
    }
    if (filters?.status && filters.status.length > 0) {
      queryFilters.push({ column: 'status', operator: 'in', value: filters.status });
    }
    if (filters?.priority && filters.priority.length > 0) {
      queryFilters.push({ column: 'priority', operator: 'in', value: filters.priority });
    }
    if (filters?.search) {
      queryFilters.push({
        column: '__or__',
        operator: 'or',
        value: `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      });
    }

    const tasks = await selectRecords('tasks', {
      where,
      filters: queryFilters.length > 0 ? queryFilters : undefined,
      orderBy: 'created_at DESC'
    });

    // Fetch related data
    const projectIds = [...new Set(tasks.map((t: any) => t.project_id).filter(Boolean))];
    const assigneeIds = [...new Set(tasks.map((t: any) => t.assignee_id).filter(Boolean))].filter(Boolean);

    const projects = projectIds.length > 0 ? await selectRecords('projects', {
      where: { agency_id: agencyId, id: { operator: 'in', value: projectIds } }
    }) : [];

    const assignees = assigneeIds.length > 0 ? await selectRecords('profiles', {
      where: { agency_id: agencyId, user_id: { operator: 'in', value: assigneeIds } }
    }) : [];

    const projectMap = new Map(projects.map((p: any) => [p.id, p]));
    const assigneeMap = new Map(assignees.map((a: any) => [a.user_id, a]));

    return tasks.map((task: any) => ({
      ...task,
      tags: Array.isArray(task.tags) ? task.tags : 
            typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : 
                   typeof task.attachments === 'string' ? JSON.parse(task.attachments || '[]') : [],
      checklist: Array.isArray(task.checklist) ? task.checklist : 
                 typeof task.checklist === 'string' ? JSON.parse(task.checklist || '[]') : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : 
                    typeof task.dependencies === 'string' ? JSON.parse(task.dependencies || '[]') : [],
      custom_fields: typeof task.custom_fields === 'object' ? task.custom_fields : 
                     typeof task.custom_fields === 'string' ? JSON.parse(task.custom_fields || '{}') : {},
      project: task.project_id ? projectMap.get(task.project_id) : undefined,
      assignee: task.assignee_id ? assigneeMap.get(task.assignee_id) : undefined,
    }));
  }

  async getTask(id: string, profile?: any, userId?: string | null): Promise<Task | null> {
    const agencyId = await this.getAgencyId(profile, userId);
    const task = await selectOne('tasks', { id, agency_id: agencyId });
    
    if (!task) return null;

    // Fetch assignments
    const assignments = await selectRecords('task_assignments', {
      where: { task_id: id, agency_id: agencyId }
    });

    const assigneeIds = [...new Set([
      task.assignee_id,
      ...assignments.map((a: any) => a.user_id)
    ].filter(Boolean))].filter(Boolean);

    const assignees = assigneeIds.length > 0 ? await selectRecords('profiles', {
      where: { agency_id: agencyId, user_id: { operator: 'in', value: assigneeIds } }
    }) : [];

    const assigneeMap = new Map(assignees.map((a: any) => [a.user_id, a]));

    // Fetch project if task has project_id
    let project = null;
    if (task.project_id) {
      project = await selectOne('projects', { id: task.project_id, agency_id: agencyId });
    }

    return {
      ...task,
      tags: Array.isArray(task.tags) ? task.tags : 
            typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : 
                   typeof task.attachments === 'string' ? JSON.parse(task.attachments || '[]') : [],
      checklist: Array.isArray(task.checklist) ? task.checklist : 
                 typeof task.checklist === 'string' ? JSON.parse(task.checklist || '[]') : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : 
                    typeof task.dependencies === 'string' ? JSON.parse(task.dependencies || '[]') : [],
      custom_fields: typeof task.custom_fields === 'object' ? task.custom_fields : 
                     typeof task.custom_fields === 'string' ? JSON.parse(task.custom_fields || '{}') : {},
      assignee: task.assignee_id ? assigneeMap.get(task.assignee_id) : undefined,
      project: project ? {
        id: project.id,
        name: project.name
      } : undefined,
      assignments: assignments.map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        user: assigneeMap.get(a.user_id) ? {
          id: a.user_id,
          full_name: assigneeMap.get(a.user_id).full_name
        } : undefined
      })).filter((a: any) => a.user)
    };
  }

  async createTask(data: Partial<Task>, profile?: any, userId?: string | null): Promise<Task> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const taskData: any = {
      title: data.title,
      description: data.description || null,
      task_type: data.task_type || null,
      project_id: data.project_id || null,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
      start_date: data.start_date || null,
      estimated_hours: data.estimated_hours || null,
      actual_hours: data.actual_hours || 0,
      progress: data.progress || 0,
      assignee_id: data.assignee_id || null,
      tags: JSON.stringify(data.tags || []),
      attachments: JSON.stringify(data.attachments || []),
      checklist: JSON.stringify(data.checklist || []),
      dependencies: JSON.stringify(data.dependencies || []),
      custom_fields: JSON.stringify(data.custom_fields || {}),
      agency_id: agencyId,
      created_by: userId || null,
    };

    const task = await insertRecord('tasks', taskData, userId, agencyId);
    
    // Create task assignment if assignee_id is provided
    if (data.assignee_id && userId) {
      try {
        await this.assignTask(task.id, data.assignee_id, userId, profile);
      } catch (error) {
        console.warn('Failed to create initial task assignment:', error);
      }
    }
    
    return this.getTask(task.id, profile, userId) as Promise<Task>;
  }

  async updateTask(id: string, data: Partial<Task>, profile?: any, userId?: string | null): Promise<Task> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.task_type !== undefined) updateData.task_type = data.task_type;
    if (data.project_id !== undefined) updateData.project_id = data.project_id;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      } else if (data.status !== 'completed') {
        updateData.completed_at = null;
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.due_date !== undefined) updateData.due_date = data.due_date;
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.estimated_hours !== undefined) updateData.estimated_hours = data.estimated_hours;
    if (data.actual_hours !== undefined) updateData.actual_hours = data.actual_hours;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.assignee_id !== undefined) {
      updateData.assignee_id = data.assignee_id;
      
      // Ensure task assignment exists if assignee_id is set
      if (data.assignee_id && userId) {
        try {
          const existingTask = await this.getTask(id, profile, userId);
          const isAssigned = existingTask?.assignments?.some(a => a.user_id === data.assignee_id);
          if (!isAssigned) {
            await this.assignTask(id, data.assignee_id, userId, profile);
          }
        } catch (error) {
          console.warn('Failed to update task assignment:', error);
        }
      }
    }
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.attachments !== undefined) updateData.attachments = JSON.stringify(data.attachments);
    if (data.checklist !== undefined) updateData.checklist = JSON.stringify(data.checklist);
    if (data.dependencies !== undefined) updateData.dependencies = JSON.stringify(data.dependencies);
    if (data.custom_fields !== undefined) updateData.custom_fields = JSON.stringify(data.custom_fields);

    await updateRecord('tasks', updateData, { id, agency_id: agencyId }, userId);
    return this.getTask(id, profile, userId) as Promise<Task>;
  }

  async deleteTask(id: string, profile?: any, userId?: string | null): Promise<void> {
    const agencyId = await this.getAgencyId(profile, userId);
    await deleteRecord('tasks', { id, agency_id: agencyId }, userId);
  }

  /**
   * Task Assignments
   */
  async assignTask(taskId: string, userId: string, assignedBy: string, profile?: any): Promise<TaskAssignment> {
    const agencyId = await this.getAgencyId(profile, assignedBy);
    
    // Check if assignment already exists
    const existing = await selectOne('task_assignments', {
      task_id: taskId,
      user_id: userId,
      agency_id: agencyId
    });
    
    if (existing) {
      // Return existing assignment instead of creating duplicate
      return existing as TaskAssignment;
    }
    
    const assignment = await insertRecord('task_assignments', {
      task_id: taskId,
      user_id: userId,
      assigned_by: assignedBy,
      agency_id: agencyId,
    }, assignedBy, agencyId);
    
    // Create notification for the assigned user
    try {
      // Get task details directly from database (more reliable than getTask which might fail on project fetch)
      const task = await selectOne('tasks', {
        id: taskId,
        agency_id: agencyId
      });
      
      if (!task) {
        console.warn('Task not found for notification creation:', taskId);
        return assignment as TaskAssignment;
      }
      
      // Get assigner's profile for the notification message
      let assignerName = 'Someone';
      try {
        const assignerProfile = await selectOne('profiles', {
          user_id: assignedBy,
          agency_id: agencyId
        });
        if (assignerProfile) {
          assignerName = (assignerProfile as any).full_name || 'Someone';
        }
      } catch (error) {
        console.warn('Failed to fetch assigner profile for notification:', error);
      }
      
      const taskTitle = (task as any).title || 'Task';
      
      // Get project name if project_id exists
      let projectName = '';
      if ((task as any).project_id) {
        try {
          const project = await selectOne('projects', {
            id: (task as any).project_id,
            agency_id: agencyId
          });
          if (project) {
            projectName = ` in ${(project as any).name}`;
          }
        } catch (error) {
          // Project fetch failed, but continue without project name
          console.warn('Failed to fetch project for notification:', error);
        }
      }
      
      // Determine priority based on task priority
      let notificationPriority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
      const taskPriority = (task as any).priority;
      if (taskPriority === 'critical' || taskPriority === 'urgent') {
        notificationPriority = 'urgent';
      } else if (taskPriority === 'high') {
        notificationPriority = 'high';
      } else if (taskPriority === 'low') {
        notificationPriority = 'low';
      }
      
      // Create notification message
      const notificationMessage = `${assignerName} assigned you a task: "${taskTitle}"${projectName}.`;
      
      // Create action URL to navigate to the task
      const actionUrl = `/project-management?task=${taskId}`;
      
      // Create the notification
      await insertRecord('notifications', {
        user_id: userId,
        type: 'in_app',
        category: 'update',
        title: 'New Task Assignment',
        message: notificationMessage,
        priority: notificationPriority,
        action_url: actionUrl,
        metadata: {
          task_id: taskId,
          assigned_by: assignedBy,
          task_title: taskTitle,
          project_id: (task as any).project_id || null,
          project_name: projectName ? projectName.replace(' in ', '') : null,
        },
      }, assignedBy, agencyId);
    } catch (error) {
      // Log error but don't fail the assignment if notification creation fails
      console.error('Failed to create notification for task assignment:', error);
    }
    
    return assignment as TaskAssignment;
  }

  async unassignTask(taskId: string, userId: string, profile?: any, currentUserId?: string | null): Promise<void> {
    const agencyId = await this.getAgencyId(profile, currentUserId);
    await deleteRecord('task_assignments', { task_id: taskId, user_id: userId, agency_id: agencyId }, currentUserId);
  }

  /**
   * Task Comments
   */
  async getTaskComments(taskId: string, profile?: any, userId?: string | null): Promise<TaskComment[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const comments = await selectRecords('task_comments', {
      where: { task_id: taskId, agency_id: agencyId },
      orderBy: 'created_at ASC'
    });

    const userIds = [...new Set(comments.map((c: any) => c.user_id))];
    const users = userIds.length > 0 ? await selectRecords('profiles', {
      where: { agency_id: agencyId, user_id: { operator: 'in', value: userIds } }
    }) : [];

    const userMap = new Map(users.map((u: any) => [u.user_id, u]));

    return comments.map((comment: any) => ({
      ...comment,
      attachments: Array.isArray(comment.attachments) ? comment.attachments : 
                   typeof comment.attachments === 'string' ? JSON.parse(comment.attachments || '[]') : [],
      mentions: Array.isArray(comment.mentions) ? comment.mentions : 
                typeof comment.mentions === 'string' ? JSON.parse(comment.mentions || '[]') : [],
      user: userMap.get(comment.user_id) ? {
        id: userMap.get(comment.user_id).user_id,
        full_name: userMap.get(comment.user_id).full_name,
        avatar_url: userMap.get(comment.user_id).avatar_url
      } : undefined
    }));
  }

  async createTaskComment(taskId: string, comment: string, profile?: any, userId?: string | null): Promise<TaskComment> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const commentData = await insertRecord('task_comments', {
      task_id: taskId,
      user_id: userId!,
      comment,
      attachments: JSON.stringify([]),
      mentions: JSON.stringify([]),
      agency_id: agencyId,
    }, userId, agencyId);
    
    return this.getTaskComments(taskId, profile, userId).then(comments => 
      comments.find(c => c.id === commentData.id)!
    );
  }

  /**
   * Time Tracking
   */
  async getTaskTimeTracking(taskId: string, profile?: any, userId?: string | null): Promise<TimeTracking[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    const timeEntries = await selectRecords('task_time_tracking', {
      where: { task_id: taskId, agency_id: agencyId },
      orderBy: 'date DESC'
    });

    const userIds = [...new Set(timeEntries.map((t: any) => t.user_id))];
    const users = userIds.length > 0 ? await selectRecords('profiles', {
      where: { agency_id: agencyId, user_id: { operator: 'in', value: userIds } }
    }) : [];

    const userMap = new Map(users.map((u: any) => [u.user_id, u]));

    return timeEntries.map((entry: any) => ({
      ...entry,
      user: userMap.get(entry.user_id) ? {
        id: userMap.get(entry.user_id).user_id,
        full_name: userMap.get(entry.user_id).full_name
      } : undefined
    }));
  }

  async logTime(taskId: string, hours: number, date: string, description: string | null, profile?: any, userId?: string | null): Promise<TimeTracking> {
    const agencyId = await this.getAgencyId(profile, userId);
    
    // Calculate start_time and end_time based on hours
    const now = new Date();
    const startTime = new Date(now);
    const endTime = new Date(now.getTime() + (hours * 60 * 60 * 1000)); // Add hours in milliseconds
    const durationMinutes = Math.round(hours * 60);
    
    const timeEntry = await insertRecord('task_time_tracking', {
      task_id: taskId,
      user_id: userId!,
      date,
      hours_logged: hours,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      description: description || null,
      billable: true,
      agency_id: agencyId,
    }, userId, agencyId);
    
    // Update task actual_hours
    const task = await this.getTask(taskId, profile, userId);
    if (task) {
      const totalHours = await this.getTaskTimeTracking(taskId, profile, userId).then(entries =>
        entries.reduce((sum, e) => sum + Number(e.hours_logged), 0)
      );
      await this.updateTask(taskId, { actual_hours: totalHours }, profile, userId);
    }
    
    return timeEntry as TimeTracking;
  }

  /**
   * Integration Methods - Enhanced project fetching with related data
   */

  /**
   * Get project with full client details
   */
  async getProjectWithClient(id: string, profile?: any, userId?: string | null): Promise<Project | null> {
    const project = await this.getProject(id, profile, userId);
    if (!project || !project.client_id) return project;

    const agencyId = await this.getAgencyId(profile, userId);
    const client = await selectOne('clients', { id: project.client_id, agency_id: agencyId });
    
    if (client) {
      return {
        ...project,
        client: {
          id: client.id,
          name: client.name,
          company_name: client.company_name,
          email: client.email,
          phone: client.phone,
          contact_person: client.contact_person,
          contact_email: client.contact_email,
          contact_phone: client.contact_phone,
          address: client.address,
          payment_terms: client.payment_terms,
          industry: client.industry,
          status: client.status
        }
      };
    }

    return project;
  }

  /**
   * Get project with financial summary (invoices, payments, revenue)
   */
  async getProjectWithFinancials(id: string, profile?: any, userId?: string | null): Promise<Project & { financials?: any } | null> {
    const project = await this.getProject(id, profile, userId);
    if (!project) return null;

    const agencyId = await this.getAgencyId(profile, userId);
    
    // Fetch invoices for client (if project has client)
    let financials: any = {
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      invoiceCount: 0
    };

    if (project.client_id) {
      try {
        const invoices = await selectRecords('invoices', {
          filters: [
            { column: 'agency_id', operator: 'eq', value: agencyId },
            { column: 'client_id', operator: 'eq', value: project.client_id }
          ],
          orderBy: 'issue_date DESC'
        });

        const totalInvoiced = invoices.reduce((sum: number, inv: any) => {
          return sum + (parseFloat(inv.total_amount) || 0);
        }, 0);

        const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid' || inv.status === 'partial');
        const totalPaid = paidInvoices.reduce((sum: number, inv: any) => {
          return sum + (parseFloat(inv.total_amount) || 0);
        }, 0);

        financials = {
          totalInvoiced,
          totalPaid,
          outstanding: totalInvoiced - totalPaid,
          invoiceCount: invoices.length
        };
      } catch (error) {
        console.error('Error fetching project financials:', error);
      }
    }

    return {
      ...project,
      financials
    };
  }

  /**
   * Get all projects for a specific client
   */
  async getProjectsByClient(clientId: string, profile?: any, userId?: string | null): Promise<Project[]> {
    return this.getProjects({ client_id: clientId }, profile, userId);
  }

  /**
   * Get all projects for a specific employee
   * Checks assigned_team, project_manager_id, and account_manager_id
   */
  async getProjectsByEmployee(employeeId: string, profile?: any, userId?: string | null): Promise<Project[]> {
    const allProjects = await this.getProjects({}, profile, userId);
    
    return allProjects.filter((project: Project) => {
      // Check if employee is project manager or account manager
      if (project.project_manager_id === employeeId || project.account_manager_id === employeeId) {
        return true;
      }

      // Check if employee is in assigned_team
      if (project.assigned_team && Array.isArray(project.assigned_team)) {
        return project.assigned_team.some((member: any) => {
          const memberId = typeof member === 'string' ? member : member.user_id || member.id || String(member);
          return memberId === employeeId;
        });
      }

      return false;
    });
  }

  /**
   * Get project with team member details
   */
  async getProjectWithTeam(id: string, profile?: any, userId?: string | null): Promise<Project & { teamDetails?: any[] } | null> {
    const project = await this.getProject(id, profile, userId);
    if (!project || !project.assigned_team || project.assigned_team.length === 0) {
      return project;
    }

    const agencyId = await this.getAgencyId(profile, userId);
    const teamMemberIds = project.assigned_team.map((m: any) => 
      typeof m === 'string' ? m : m.user_id || m.id || String(m)
    );

    try {
      const profiles = await selectRecords('profiles', {
        filters: [
          { column: 'agency_id', operator: 'eq', value: agencyId },
          { column: 'user_id', operator: 'in', value: teamMemberIds }
        ]
      });

      const teamDetails = profiles.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        department: p.department,
        position: p.position,
        avatar_url: p.avatar_url
      }));

      return {
        ...project,
        teamDetails
      };
    } catch (error) {
      console.error('Error fetching team details:', error);
      return project;
    }
  }
}

export const projectService = new ProjectService();
export default projectService;
