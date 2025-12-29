import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/lib/uuid';
import { Checkbox } from '@/components/ui/checkbox';
import { insertRecord, updateRecord, selectOne } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHolidayCreated: () => void;
  editHoliday?: {
    id: string;
    name: string;
    description?: string | null;
    date: string;
    is_company_holiday: boolean;
    is_national_holiday: boolean;
  } | null;
}

const holidayTypes = [
  { value: 'public', label: 'Public Holiday', description: 'National/Government holiday' },
  { value: 'company', label: 'Company Holiday', description: 'Company-specific day off' },
  { value: 'optional', label: 'Optional Holiday', description: 'Flexible day off' }
];

export function HolidayFormDialog({ 
  open, 
  onOpenChange, 
  onHolidayCreated,
  editHoliday 
}: HolidayFormDialogProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // Initialize form data based on editHoliday or defaults
  const getInitialFormData = () => {
    if (editHoliday) {
      const holidayType = editHoliday.is_national_holiday ? 'public' : editHoliday.is_company_holiday ? 'company' : 'optional';
      return {
        name: editHoliday.name || '',
        description: editHoliday.description || '',
        date: editHoliday.date ? new Date(editHoliday.date) : undefined as Date | undefined,
        type: holidayType,
        is_mandatory: editHoliday.is_company_holiday || editHoliday.is_national_holiday
      };
    }
    return {
      name: '',
      description: '',
      date: undefined as Date | undefined,
      type: 'company' as 'public' | 'company' | 'optional',
      is_mandatory: true
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      if (editHoliday) {
        // Map database fields (is_company_holiday, is_national_holiday) to form fields
        let holidayType = 'company';
        if (editHoliday.is_national_holiday) {
          holidayType = 'public';
        } else if (editHoliday.is_company_holiday) {
          holidayType = 'company';
        } else {
          holidayType = 'optional';
        }
        
        setFormData({
          name: editHoliday.name,
          description: editHoliday.description || '',
          date: new Date(editHoliday.date),
          type: holidayType,
          is_mandatory: editHoliday.is_company_holiday || editHoliday.is_national_holiday
        });
      } else {
        setFormData({
          name: '',
          description: '',
          date: undefined,
          type: 'company',
          is_mandatory: true
        });
      }
    }
  }, [open, editHoliday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
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
      const holidayDate = format(formData.date, 'yyyy-MM-dd');
      
      // Check for duplicate holiday on the same date (only for new holidays)
      if (!editHoliday) {
        const existingHoliday = await selectOne('holidays', {
          agency_id: agencyId,
          date: holidayDate
        });
        
        if (existingHoliday) {
          toast({
            title: "Duplicate Holiday",
            description: `A holiday already exists on ${format(formData.date, 'MMMM d, yyyy')}. Please choose a different date.`,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      } else {
        // For updates, check if another holiday exists on this date (excluding current one)
        const existingHoliday = await selectOne('holidays', {
          agency_id: agencyId,
          date: holidayDate
        });
        
        if (existingHoliday && existingHoliday.id !== editHoliday.id) {
          toast({
            title: "Duplicate Holiday",
            description: `Another holiday already exists on ${format(formData.date, 'MMMM d, yyyy')}. Please choose a different date.`,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }
      
      // Map form fields to database schema
      // Type determines the flags:
      // - 'public' -> is_national_holiday = true, is_company_holiday = false
      // - 'company' -> is_company_holiday = true, is_national_holiday = false
      // - 'optional' -> both false
      const is_company_holiday = formData.type === 'company';
      const is_national_holiday = formData.type === 'public';
      
      const holidayData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        date: holidayDate,
        is_company_holiday,
        is_national_holiday,
        agency_id: agencyId
      };

      if (editHoliday) {
        // Update existing holiday using PostgreSQL service
        await updateRecord('holidays', holidayData, { id: editHoliday.id });

        toast({
          title: "✅ Holiday Updated",
          description: `${formData.name} has been updated.`
        });
      } else {
        // Create new holiday using PostgreSQL service
        await insertRecord('holidays', {
          id: generateUUID(),
          ...holidayData
        });

        toast({
          title: "✅ Holiday Created",
          description: `${formData.name} has been added to the calendar.`
        });
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        date: undefined,
        type: 'company',
        is_mandatory: true
      });

      onHolidayCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save holiday. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          <DialogDescription>
            {editHoliday 
              ? 'Update the holiday details below'
              : 'Add a new holiday to the company calendar'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Holiday Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New Year's Day"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for the holiday"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Holiday Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select holiday type" />
              </SelectTrigger>
              <SelectContent>
                {holidayTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mandatory"
                checked={formData.is_mandatory}
                onCheckedChange={(checked) => {
                  const isMandatory = checked as boolean;
                  // If unchecking mandatory, change type to optional
                  // If checking mandatory and type is optional, change to company
                  let newType = formData.type;
                  if (!isMandatory && formData.type !== 'optional') {
                    newType = 'optional';
                  } else if (isMandatory && formData.type === 'optional') {
                    newType = 'company';
                  }
                  setFormData({ 
                    ...formData, 
                    is_mandatory: isMandatory,
                    type: newType as 'public' | 'company' | 'optional'
                  });
                }}
                disabled={formData.type === 'public'} // Public holidays are always mandatory
              />
              <Label htmlFor="mandatory" className="text-sm cursor-pointer">
                Mandatory holiday (office closed)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-4">
              {formData.type === 'public' && 'Public holidays are always mandatory'}
              {formData.type === 'company' && 'Company holidays can be made optional'}
              {formData.type === 'optional' && 'Optional holidays are not mandatory'}
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editHoliday ? 'Update Holiday' : 'Create Holiday'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}