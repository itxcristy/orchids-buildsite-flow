import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, User } from "lucide-react";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";

interface Department {
  id: string;
  name: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  department: string;
}

interface TeamAssignment {
  id: string;
  user_id: string;
  department_id: string;
  position_title?: string;
  role_in_department: string;
  profiles: {
    full_name: string;
  } | null;
  departments: {
    name: string;
  } | null;
}

export function TeamAssignmentPanel() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [roleInDepartment, setRoleInDepartment] = useState("member");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchDepartments(),
      fetchProfiles(),
      fetchAssignments(),
    ]);
  };

  const fetchDepartments = async () => {
    const { data, error } = await db
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
      return;
    }

    if (data) {
      setDepartments(data);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await db
      .from("profiles")
      .select("user_id, full_name, department")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    if (data) {
      setProfiles(data);
    }
  };

  const fetchAssignments = async () => {
    const { data, error } = await db
      .from("team_assignments")
      .select(`
        id,
        user_id,
        department_id,
        position_title,
        role_in_department
      `)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching assignments:", error);
      return;
    }

    if (data) {
      // Fetch profile and department data separately
      const assignmentsWithDetails = await Promise.all(
        data.map(async (assignment) => {
          const [profileResult, departmentResult] = await Promise.all([
            db.from("profiles").select("full_name").eq("user_id", assignment.user_id).single(),
            db.from("departments").select("name").eq("id", assignment.department_id).single()
          ]);

          return {
            ...assignment,
            profiles: profileResult.data ? { full_name: profileResult.data.full_name } : null,
            departments: departmentResult.data ? { name: departmentResult.data.name } : null
          };
        })
      );
      
      setAssignments(assignmentsWithDetails);
    }
  };

  const handleAssignment = async () => {
    if (!selectedUser || !selectedDepartment) {
      toast({
        title: "Missing Information",
        description: "Please select both a user and department",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, deactivate any existing assignments for this user
      await db
        .from("team_assignments")
        .update({ is_active: false })
        .eq("user_id", selectedUser)
        .eq("is_active", true);

      // Get agency_id from user's profile
      const { data: profileData } = await db
        .from("profiles")
        .select("agency_id")
        .eq("user_id", selectedUser)
        .single();

      const agencyId = profileData?.agency_id || null;

      // Create new assignment
      const { error } = await db
        .from("team_assignments")
        .insert([{
          user_id: selectedUser,
          department_id: selectedDepartment,
          position_title: positionTitle || null,
          role_in_department: roleInDepartment,
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
          agency_id: agencyId,
        }]);

      if (error) throw error;

      toast({ title: "Team assignment successful" });
      
      // Reset form
      setSelectedUser("");
      setSelectedDepartment("");
      setPositionTitle("");
      setRoleInDepartment("member");
      
      // Refresh data
      fetchAssignments();
    } catch (error) {
      console.error("Error assigning team member:", error);
      toast({
        title: "Error",
        description: "Failed to assign team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await db
        .from("team_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId);

      if (error) throw error;

      toast({ title: "Assignment removed successfully" });
      fetchAssignments();
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "manager": return "default";
      case "supervisor": return "secondary";
      case "lead": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Employee</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Position Title</Label>
              <Input
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g., Senior Developer"
              />
            </div>

            <div>
              <Label>Role in Department</Label>
              <Select value={roleInDepartment} onValueChange={setRoleInDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAssignment} disabled={loading} className="w-full">
            {loading ? "Assigning..." : "Assign to Department"}
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Current Department Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No team assignments found
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {assignment.profiles?.full_name || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.departments?.name || "Unknown Department"}
                        {assignment.position_title && ` • ${assignment.position_title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(assignment.role_in_department)}>
                      {assignment.role_in_department}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}