import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Position,
  Connection,
  addEdge,
  MarkerType,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2,
  Users,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  UserCheck,
  Link,
  Lock,
  Unlock,
  X,
  Save,
  Eye,
  Search,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  BarChart3,
} from "lucide-react";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";

// Department interface
interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  budget?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  manager?: {
    full_name: string;
  } | null;
  parent_department?: {
    name: string;
  } | null;
  _count?: {
    team_assignments: number;
  };
}

// Custom Department Node Component
const DepartmentNode = ({ data }: { data: any }) => {
  const { 
    dept, 
    onDepartmentClick, 
    onExpand, 
    isExpanded, 
    hasChildren, 
    members = [], 
    isLoading = false, 
    isLocked = false, 
    onToggleLock = () => {}, 
    connectionMode = false 
  } = data || {};

  return (
    <div 
      className={`border-2 rounded-lg p-3 bg-card hover:shadow-lg transition-all w-[220px] relative ${
        data.level === 0 
          ? 'border-primary shadow-md bg-primary/10' 
          : 'border-border hover:border-primary/50'
      } ${isLocked ? 'opacity-70' : ''} ${connectionMode ? 'ring-2 ring-primary/50' : ''} ${
        connectionMode ? 'cursor-default' : 'cursor-pointer'
      } ${!dept.is_active ? 'opacity-60 border-dashed border-muted-foreground/50' : ''}`}
      onClick={() => !connectionMode && onDepartmentClick(dept)}
    >
      {/* Connection Handles */}
      {connectionMode && !isLocked && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="source"
            className="!bg-primary !border-2 !border-white !w-4 !h-4"
            style={{ bottom: -8 }}
          />
          <Handle
            type="target"
            position={Position.Top}
            id="target"
            className="!bg-green-500 !border-2 !border-white !w-4 !h-4"
            style={{ top: -8 }}
          />
        </>
      )}

      {/* Lock/Unlock Button */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(dept.id);
          }}
          title={isLocked ? "Unlock node" : "Lock node"}
        >
          {isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
      </div>
      
      <div className="flex flex-col gap-1.5">
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-sm truncate flex-1">
            {dept.name}
          </h3>
          {!dept.is_active && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Inactive
            </Badge>
          )}
        </div>
        
        {/* Manager */}
        {dept.manager && (
          <div className="flex items-center gap-1">
            <UserCheck className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">
              {dept.manager.full_name}
            </p>
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            <Users className="h-2.5 w-2.5 mr-1" />
            {dept._count?.team_assignments || 0}
          </Badge>
          {dept.budget && dept.budget > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              ₹{(dept.budget / 1000).toFixed(0)}K
            </Badge>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(dept.id);
            }}
            className="h-6 w-full mt-1.5 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show
              </>
            )}
          </Button>
        )}

        {/* Members Preview */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t">
            {isLoading ? (
              <div className="flex items-center justify-center py-1">
                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            ) : members.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {members.length} members
                </p>
                <div className="space-y-0.5 max-h-20 overflow-y-auto">
                  {members.slice(0, 2).map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1 p-1 rounded bg-muted/50"
                    >
                      <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-2 w-2 text-primary" />
                      </div>
                      <p className="text-xs truncate flex-1">{member.full_name}</p>
                    </div>
                  ))}
                  {members.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{members.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-1">
                No members
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  department: DepartmentNode,
};

// Department Hierarchy Tree Component
interface DepartmentHierarchyViewProps {
  departments: Department[];
  expandedDepartments: Set<string>;
  setExpandedDepartments: (set: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  departmentMembers: Record<string, Array<{
    id: string;
    full_name: string;
    position_title?: string;
    role_in_department: string;
  }>>;
  setDepartmentMembers: (members: Record<string, Array<{
    id: string;
    full_name: string;
    position_title?: string;
    role_in_department: string;
  }>>) => void;
  onDepartmentClick: (dept: Department) => void;
  db: any;
  onRefresh?: () => void;
}

export const DepartmentHierarchyView: React.FC<DepartmentHierarchyViewProps> = ({
  departments,
  expandedDepartments,
  setExpandedDepartments,
  departmentMembers,
  setDepartmentMembers,
  onDepartmentClick,
  db,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());
  const reactFlowInstance = useRef<any>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [lockedNodes, setLockedNodes] = useState<Set<string>>(new Set());
  const [pendingConnections, setPendingConnections] = useState<Map<string, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [showInactiveDepartments, setShowInactiveDepartments] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterManager, setFilterManager] = useState<string>("all");
  const [showStats, setShowStats] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Filter departments
  const filteredDepartments = useMemo(() => {
    let filtered = showInactiveDepartments 
      ? departments 
      : departments.filter(d => d.is_active);
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.manager?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterManager !== "all") {
      filtered = filtered.filter(dept => dept.manager_id === filterManager);
    }
    
    return filtered;
  }, [departments, showInactiveDepartments, searchTerm, filterManager]);

  // Simple layout: organize by levels
  const buildHierarchy = useCallback(() => {
    if (filteredDepartments.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const HORIZONTAL_SPACING = 200;
    const VERTICAL_SPACING = 180;
    const START_Y = 50;
    const CARD_WIDTH = 220;

    // Build parent-child map
    const childrenMap = new Map<string, Department[]>();
    const parentMap = new Map<string, string>();
    
    filteredDepartments.forEach(dept => {
      if (dept.parent_department_id && dept.parent_department_id.trim() !== "") {
        const parentId = dept.parent_department_id;
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(dept);
        parentMap.set(dept.id, parentId);
      }
    });

    // Find root departments (no parent or parent not in filtered list)
    const roots = filteredDepartments.filter(dept => {
      if (!dept.parent_department_id || dept.parent_department_id.trim() === "") {
        return true;
      }
      return !filteredDepartments.some(d => d.id === dept.parent_department_id);
    });

    // Calculate levels
    const getLevel = (deptId: string, visited = new Set<string>()): number => {
      if (visited.has(deptId)) return 0; // Cycle protection
      visited.add(deptId);
      
      const parentId = parentMap.get(deptId);
      if (!parentId || !filteredDepartments.some(d => d.id === parentId)) {
        return 0;
      }
      return getLevel(parentId, visited) + 1;
    };

    // Group by level
    const levelMap = new Map<number, Department[]>();
    filteredDepartments.forEach(dept => {
      const level = getLevel(dept.id);
      if (!levelMap.has(level)) {
        levelMap.set(level, []);
      }
      levelMap.get(level)!.push(dept);
    });

    // Position nodes by level
    const nodePositions = new Map<string, { x: number; y: number }>();
    const maxLevel = Math.max(...Array.from(levelMap.keys()));

    for (let level = 0; level <= maxLevel; level++) {
      const levelDepts = levelMap.get(level) || [];
      const levelWidth = levelDepts.length * (CARD_WIDTH + HORIZONTAL_SPACING) - HORIZONTAL_SPACING;
      let currentX = -levelWidth / 2;

      levelDepts.forEach(dept => {
        const y = START_Y + (level * VERTICAL_SPACING);
        nodePositions.set(dept.id, { x: currentX, y });
        currentX += CARD_WIDTH + HORIZONTAL_SPACING;
      });
    }

    // Create nodes
    const newNodes: Node[] = filteredDepartments.map(dept => {
      const pos = nodePositions.get(dept.id) || { x: 0, y: 0 };
      const hasChildren = childrenMap.has(dept.id);
      const isExpanded = expandedDepartments.has(dept.id);
      const members = departmentMembers[dept.id] || [];
      const isLoading = loadingMembers.has(dept.id);
      const level = getLevel(dept.id);

      return {
        id: dept.id,
        type: 'department',
        position: pos,
        data: {
          dept,
          level,
          onDepartmentClick,
          onExpand: (id: string) => {
            setExpandedDepartments(prev => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
                fetchDepartmentMembers(id);
              }
              return next;
            });
          },
          isExpanded,
          hasChildren,
          members,
          isLoading,
          isLocked: lockedNodes.has(dept.id),
          onToggleLock: (id: string) => {
            setLockedNodes(prev => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          },
          connectionMode,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        draggable: !lockedNodes.has(dept.id),
      };
    });

    // Create edges
    const newEdges: Edge[] = [];
    filteredDepartments.forEach(dept => {
      if (dept.parent_department_id && filteredDepartments.some(d => d.id === dept.parent_department_id)) {
        newEdges.push({
          id: `edge-${dept.parent_department_id}-${dept.id}`,
          source: dept.parent_department_id,
          target: dept.id,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: '#3b82f6',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
            width: 20,
            height: 20,
          },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [filteredDepartments, expandedDepartments, departmentMembers, loadingMembers, lockedNodes, connectionMode, onDepartmentClick, setExpandedDepartments]);

  // Fetch department members
  const fetchDepartmentMembers = useCallback(async (departmentId: string) => {
    if (departmentMembers[departmentId]) return;
    
    setLoadingMembers(prev => new Set(prev).add(departmentId));
    try {
      const { data: assignmentsData, error: assignmentsError } = await db
        .from("team_assignments")
        .select("id, user_id, position_title, role_in_department")
        .eq("department_id", departmentId)
        .eq("is_active", true);

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setDepartmentMembers((prev: Record<string, { id: string; full_name: string; position_title?: string; role_in_department: string; }[]>) => ({ ...prev, [departmentId]: [] }));
        return;
      }

      const userIds = assignmentsData.map((ta: any) => ta.user_id);
      const { data: profilesData, error: profilesError } = await db
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name]));
      
      const members = assignmentsData.map((ta: any) => ({
        id: ta.id,
        full_name: profileMap.get(ta.user_id) || "Unknown",
        position_title: ta.position_title,
        role_in_department: ta.role_in_department,
      }));

      setDepartmentMembers((prev: Record<string, { id: string; full_name: string; position_title?: string; role_in_department: string; }[]>) => ({ ...prev, [departmentId]: members }));
    } catch (error: any) {
      logError("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to fetch department members",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(prev => {
        const next = new Set(prev);
        next.delete(departmentId);
        return next;
      });
    }
  }, [departmentMembers, db, toast, setDepartmentMembers]);

  // Build hierarchy when dependencies change
  useEffect(() => {
    buildHierarchy();
  }, [buildHierarchy]);

  // Auto-expand on initial load
  useEffect(() => {
    if (departments.length > 0 && expandedDepartments.size === 0) {
      setExpandedDepartments(new Set(departments.map(d => d.id)));
    }
  }, [departments, expandedDepartments.size, setExpandedDepartments]);

  // Handle connections
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    
    if (params.source === params.target) {
      toast({
        title: "Invalid Connection",
        description: "A department cannot be connected to itself",
        variant: "destructive",
      });
      return;
    }

    const targetDept = departments.find(d => d.id === params.target);
    if (targetDept?.parent_department_id && targetDept.parent_department_id !== params.source) {
      toast({
        title: "Connection Exists",
        description: "This department already has a parent. Remove the existing connection first.",
        variant: "destructive",
      });
      return;
    }

    setPendingConnections(prev => {
      const next = new Map(prev);
      next.set(params.target!, params.source!);
      return next;
    });

    // Add edge immediately
    const newEdge: Edge = {
      id: `edge-${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: '#3b82f6',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#3b82f6',
        width: 20,
        height: 20,
      },
    };

    setEdges(prev => addEdge(newEdge, prev));
  }, [departments, toast, setEdges]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      setPendingConnections(prev => {
        const next = new Map(prev);
        next.delete(edge.target);
        return next;
      });
    });
  }, []);

  // Save connections
  const saveConnections = useCallback(async () => {
    if (pendingConnections.size === 0) {
      toast({
        title: "No Changes",
        description: "No new connections to save",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updates = Array.from(pendingConnections.entries()).map(async ([childId, parentId]) => {
        const { error } = await db
          .from("departments")
          .update({ parent_department_id: parentId })
          .eq("id", childId);
        if (error) throw error;
      });

      await Promise.all(updates);

      // Convert dashed edges to solid
      setEdges(prevEdges => prevEdges.map(edge => {
        if (pendingConnections.has(edge.target)) {
          return {
            ...edge,
            style: {
              ...edge.style,
              strokeDasharray: undefined,
            },
          };
        }
        return edge;
      }));

      toast({
        title: "Success",
        description: `Saved ${pendingConnections.size} connection(s) successfully`,
      });

      setPendingConnections(new Map());
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      logError("Error saving connections:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save connections",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [pendingConnections, db, toast, onRefresh, setEdges]);

  // Statistics
  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter(d => d.is_active).length,
    inactive: departments.filter(d => !d.is_active).length,
    withManager: departments.filter(d => d.manager_id).length,
    rootDepartments: departments.filter(d => !d.parent_department_id || d.parent_department_id.trim() === "").length,
    totalEmployees: departments.reduce((sum, d) => sum + (d._count?.team_assignments || 0), 0),
    totalBudget: departments.reduce((sum, d) => sum + (d.budget || 0), 0),
  }), [departments]);

  // Managers for filter
  const managers = useMemo(() => {
    const unique = new Map<string, string>();
    departments
      .filter(d => d.manager_id && d.manager)
      .forEach(d => unique.set(d.manager_id!, d.manager!.full_name));
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [departments]);

  // Check for roots
  const hasRootDepartments = filteredDepartments.some(
    d => (!d.parent_department_id || d.parent_department_id.trim() === "") ||
         !filteredDepartments.some(p => p.id === d.parent_department_id)
  );

  // Zoom controls
  const handleZoomIn = () => {
    reactFlowInstance.current?.zoomIn();
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    reactFlowInstance.current?.zoomOut();
    setZoomLevel(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleFitView = () => {
    reactFlowInstance.current?.fitView({ padding: 0.3, duration: 400 });
    setZoomLevel(1);
  };

  // Export hierarchy document
  const exportHierarchyDocument = useCallback(() => {
    const lines: string[] = [];
    lines.push("=".repeat(60));
    lines.push("DEPARTMENT HIERARCHY STRUCTURE");
    lines.push("=".repeat(60));
    lines.push(`Generated on: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("DETAILED RELATIONSHIPS:");
    lines.push("-".repeat(60));
    lines.push("");

    departments.forEach(dept => {
      if (dept.parent_department_id && dept.parent_department_id.trim() !== "") {
        const parent = departments.find(p => p.id === dept.parent_department_id);
        if (parent) {
          lines.push(`• ${dept.name} is under ${parent.name}`);
        }
      } else {
        lines.push(`• ${dept.name} (Root Department - No Parent)`);
      }
    });

    lines.push("");
    lines.push("-".repeat(60));
    lines.push("STATISTICS:");
    lines.push("-".repeat(60));
    lines.push(`Total Departments: ${stats.total}`);
    lines.push(`Active Departments: ${stats.active}`);
    lines.push(`Root Departments: ${stats.rootDepartments}`);
    lines.push(`Total Employees: ${stats.totalEmployees}`);
    lines.push("=".repeat(60));

    const textContent = lines.join("\n");
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `department-hierarchy-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Hierarchy document exported successfully",
    });
  }, [departments, stats, toast]);

  if (!hasRootDepartments) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          No department hierarchy available. Create departments and set parent departments to build the hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterManager} onValueChange={setFilterManager}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {managers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showStats ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportHierarchyDocument}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      {showStats && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Departments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rootDepartments}</p>
                <p className="text-sm text-muted-foreground">Root Departments</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={connectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => setConnectionMode(!connectionMode)}
              >
                <Link className="h-4 w-4 mr-2" />
                {connectionMode ? "Exit Connection Mode" : "Connection Mode"}
              </Button>
              
              {!connectionMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={buildHierarchy}
                    title="Reset layout"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Layout
                  </Button>
                  <Button
                    variant={showInactiveDepartments ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactiveDepartments(!showInactiveDepartments)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showInactiveDepartments ? "Show Active Only" : "Show All"}
                  </Button>
                  <div className="flex items-center gap-1 border rounded-md">
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 px-2">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2 min-w-[50px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 px-2">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleFitView} className="h-8 px-2">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              
              {pendingConnections.size > 0 && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveConnections}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : `Save ${pendingConnections.size} Connection(s)`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPendingConnections(new Map());
                      setEdges(prev => prev.filter(e => !pendingConnections.has(e.target)));
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {connectionMode ? (
                "Drag from one department to another to create a connection"
              ) : (
                <>
                  Drag nodes to reposition • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl/Cmd</kbd> + Drag to pan
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ReactFlow Canvas */}
      <div className="w-full h-[700px] border rounded-lg bg-background overflow-hidden relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={connectionMode ? onConnect : undefined}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: '#3b82f6',
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
                width: 20,
                height: 20,
              },
            }}
            connectionLineStyle={{
              stroke: '#3b82f6',
              strokeWidth: 2,
            }}
            fitViewOptions={{ padding: 0.3, duration: 400 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => {
              reactFlowInstance.current = instance;
              setTimeout(() => {
                if (nodes.length > 0) {
                  instance.fitView({ padding: 0.3, duration: 400 });
                }
              }, 300);
            }}
            onMove={(_, viewport) => {
              setZoomLevel(viewport.zoom);
            }}
          >
            <Controls />
            <Background color="#e5e7eb" gap={16} />
            <MiniMap 
              nodeColor={(node) => {
                return node.data?.level === 0 ? '#3b82f6' : '#94a3b8';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading hierarchy...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
