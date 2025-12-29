import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from '@/utils/agencyUtils';
import { getDepartmentsForSelectionAuto } from '@/services/api/department-selector-service';

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  budget?: number;
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
  onDepartmentSaved: () => void;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
  onDepartmentSaved,
}: DepartmentFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    manager_id: "",
    parent_department_id: "",
    budget: "",
  });
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (open) {
      // Fetch data when dialog opens
      fetchDepartments();
      fetchProfiles();
      
      // Set form data based on whether we're editing or creating
      if (department && department.id) {
        // Editing existing department - populate with current values
        const managerId = department.manager_id && String(department.manager_id).trim() !== "" 
          ? String(department.manager_id) 
          : "__none__";
        const parentId = department.parent_department_id && String(department.parent_department_id).trim() !== "" 
          ? String(department.parent_department_id) 
          : "__none__";
        
        setFormData({
          name: department.name || "",
          description: department.description || "",
          manager_id: managerId,
          parent_department_id: parentId,
          budget: department.budget ? String(department.budget) : "",
        });
      } else {
        // Creating new department - reset form
        setFormData({
          name: "",
          description: "",
          manager_id: "__none__",
          parent_department_id: "__none__",
          budget: "",
        });
      }
    } else {
      // Reset form when dialog closes
      setFormData({
        name: "",
        description: "",
        manager_id: "__none__",
        parent_department_id: "__none__",
        budget: "",
      });
    }
  }, [open, department]);

  const fetchDepartments = async () => {
    try {
      if (!user?.id) {
        setDepartments([]);
        return;
      }
      
      // Use standardized department fetching service
      const departmentsData = await getDepartmentsForSelectionAuto(profile, user.id);
      
      // Filter out the current department if editing (can't be parent of itself)
      const filteredDepartments = department && department.id
        ? departmentsData.filter(d => d.id !== department.id)
        : departmentsData;
      
      // Transform to component format
      setDepartments(filteredDepartments.map(d => ({
        id: d.id,
        name: d.name
      })));
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
      setDepartments([]);
    }
  };

  const fetchProfiles = async () => {
    try {
      const agencyId = profile?.agency_id;
      
      let query = db
        .from("profiles")
        .select("user_id, full_name")
        .eq("is_active", true);
      
      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      
      const { data, error } = await query.order("full_name");

      if (error) throw error;
      if (data) {
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get agency_id from profile or fetch from database
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency ID not found. Please ensure you are logged in to an agency account.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const departmentData: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        manager_id: formData.manager_id && formData.manager_id !== "__none__" ? formData.manager_id : null,
        parent_department_id: formData.parent_department_id && formData.parent_department_id !== "__none__" ? formData.parent_department_id : null,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        is_active: true,
      };

      // Only add agency_id when creating new department
      if (!department) {
        departmentData.agency_id = agencyId;
      }

      if (department) {
        const { error } = await db
          .from("departments")
          .update(departmentData)
          .eq("id", department.id);

        if (error) throw error;
        toast({ 
          title: "Success", 
          description: "Department updated successfully" 
        });
      } else {
        const { error } = await db
          .from("departments")
          .insert([departmentData]);

        if (error) throw error;
        toast({ 
          title: "Success", 
          description: "Department created successfully" 
        });
      }

      onDepartmentSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving department:", error);
      const errorMessage = (error as any)?.message || (error as any)?.detail || "Failed to save department";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {department ? "Edit Department" : "Create Department"}
          </DialogTitle>
          <DialogDescription>
            {department 
              ? "Update the department information below." 
              : "Fill in the details to create a new department."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Parent Department</Label>
            <Select
              value={formData.parent_department_id}
              onValueChange={(value) => setFormData({ ...formData, parent_department_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent department (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (Top Level)</SelectItem>
                {departments
                  .filter(d => d.id !== department?.id)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Department Manager</Label>
            <Select
              value={formData.manager_id}
              onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Manager Assigned</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : department ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}