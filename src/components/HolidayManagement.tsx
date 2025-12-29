import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, Plus, Search, Calendar as CalendarIcon, Trash2, Edit2, 
  CheckCircle, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import { HolidayFormDialog } from './HolidayFormDialog';
import { selectRecords, deleteRecord } from '@/services/api/postgresql-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Holiday {
  id: string;
  name: string;
  description: string | null;
  date: string;
  is_company_holiday: boolean;
  is_national_holiday: boolean;
  agency_id: string;
  created_at: string;
  // Computed fields for UI
  type: 'public' | 'company' | 'optional';
  is_mandatory: boolean;
}

export function HolidayManagement() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        console.warn('No agency_id available, cannot fetch holidays');
        setLoading(false);
        return;
      }
      
      // Fetch holidays from database using PostgreSQL service
      const data = await selectRecords<Holiday>('holidays', {
        where: { agency_id: agencyId },
        orderBy: 'date ASC'
      });
      
      // Map database fields to interface fields
      const mappedHolidays = data.map(holiday => ({
        ...holiday,
        type: (holiday.is_national_holiday ? 'public' : holiday.is_company_holiday ? 'company' : 'optional') as 'public' | 'company' | 'optional',
        is_mandatory: holiday.is_company_holiday || holiday.is_national_holiday
      }));
      
      setHolidays(mappedHolidays);
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load holidays",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id || profile?.user_id) {
      fetchHolidays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.user_id, profile?.agency_id]);

  const filteredHolidays = holidays.filter(holiday => {
    const matchesSearch = !searchTerm || holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         holiday.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || holiday.type === typeFilter;
    
    // Handle year filter - date can be in format 'YYYY-MM-DD' or Date object
    let matchesYear = true;
    if (yearFilter !== 'all') {
      try {
        const holidayDate = new Date(holiday.date);
        if (isNaN(holidayDate.getTime())) {
          // Invalid date, include it
          matchesYear = true;
        } else {
          const holidayYear = holidayDate.getFullYear().toString();
          matchesYear = holidayYear === yearFilter;
        }
      } catch (e) {
        // If date parsing fails, include it (better to show than hide)
        matchesYear = true;
      }
    }
    
    return matchesSearch && matchesType && matchesYear;
  });

  const handleDeleteHoliday = async () => {
    if (!deletingHoliday) return;
    
    try {
      // Delete holiday using PostgreSQL service
      await deleteRecord('holidays', { id: deletingHoliday.id });

      toast({
        title: "✅ Holiday Deleted",
        description: `"${deletingHoliday.name}" has been removed.`
      });

      // Refresh the list from database
      await fetchHolidays();
      setDeletingHoliday(null);
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete holiday",
        variant: "destructive"
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'public': return 'Public';
      case 'company': return 'Company';
      case 'optional': return 'Optional';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-red-100 text-red-800 border-red-200';
      case 'company': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'optional': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'public': return <CalendarDays className="h-4 w-4" />;
      case 'company': return <CalendarIcon className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Calculate stats
  const stats = {
    total: holidays.length,
    public: holidays.filter(h => h.type === 'public').length,
    company: holidays.filter(h => h.type === 'company').length,
    optional: holidays.filter(h => h.type === 'optional').length,
    upcomingCount: holidays.filter(h => new Date(h.date) > new Date()).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Holiday Management</h2>
          <p className="text-muted-foreground">
            Manage company holidays and observances
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Holiday
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.public}</div>
            <p className="text-sm text-muted-foreground">Public Holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.company}</div>
            <p className="text-sm text-muted-foreground">Company Holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.upcomingCount}</div>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holidays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">Public Holidays</SelectItem>
                <SelectItem value="company">Company Holidays</SelectItem>
                <SelectItem value="optional">Optional Holidays</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="mr-2 h-4 w-4" />
              {filteredHolidays.length} holidays found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holidays List */}
      {filteredHolidays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No holidays found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || typeFilter !== 'all' || yearFilter !== 'all' 
                ? 'Try adjusting your filters to see more holidays.'
                : 'Start by adding your first holiday.'}
            </p>
            {(!searchTerm && typeFilter === 'all' && yearFilter === 'all') && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredHolidays.map((holiday) => {
            const isPast = new Date(holiday.date) < new Date();
            
            return (
              <Card 
                key={holiday.id} 
                className={`transition-colors hover:shadow-md ${isPast ? 'opacity-70' : ''}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Date Display */}
                      <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs font-medium text-primary uppercase">
                          {format(new Date(holiday.date), 'MMM')}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {format(new Date(holiday.date), 'd')}
                        </span>
                      </div>
                      
                      {/* Holiday Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-lg truncate">{holiday.name}</h3>
                          <Badge variant="outline" className={getTypeColor(holiday.type)}>
                            {getTypeLabel(holiday.type)}
                          </Badge>
                          {holiday.is_mandatory && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mandatory
                            </Badge>
                          )}
                          {isPast && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Past
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(holiday.date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        
                        {holiday.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingHoliday(holiday)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeletingHoliday(holiday)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <HolidayFormDialog
        open={showCreateDialog || !!editingHoliday}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingHoliday(null);
          }
        }}
        onHolidayCreated={fetchHolidays}
        editHoliday={editingHoliday ? {
          id: editingHoliday.id,
          name: editingHoliday.name,
          description: editingHoliday.description,
          date: editingHoliday.date,
          is_company_holiday: editingHoliday.is_company_holiday,
          is_national_holiday: editingHoliday.is_national_holiday
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingHoliday} onOpenChange={(open) => !open && setDeletingHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Holiday
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingHoliday?.name}"</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHoliday}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Holiday
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}