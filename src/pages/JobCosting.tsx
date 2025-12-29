import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Briefcase, Clock, DollarSign, Target, Edit, Trash2, X, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { selectRecords, updateRecord } from '@/services/api/postgresql-service';
import JobFormDialog from '@/components/JobFormDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import JobCostItemsDialog from '@/components/JobCostItemsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const JobCosting = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [costItemsDialogOpen, setCostItemsDialogOpen] = useState(false);
  const [selectedJobForCosts, setSelectedJobForCosts] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchJobs();
    fetchClients();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      if (!profile?.agency_id) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const jobsData = await selectRecords('jobs', {
        where: { agency_id: profile.agency_id },
        orderBy: 'created_at DESC',
      });

      // Fetch client names for display
      const clientIds = [...new Set(jobsData.map((j: any) => j.client_id).filter(Boolean))];
      let clientMap = new Map();
      if (clientIds.length > 0) {
        const clientsData = await selectRecords('clients', {
          filters: [{ column: 'id', operator: 'in', value: clientIds }],
        });
        clientsData.forEach((c: any) => {
          clientMap.set(c.id, c.company_name || c.name || 'Unknown Client');
        });
      }

      // Add client names to jobs
      const jobsWithClients = jobsData.map((job: any) => ({
        ...job,
        client_name: clientMap.get(job.client_id) || 'No Client',
      }));

      setJobs(jobsWithClients);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      if (!profile?.agency_id) return;
      const clientsData = await selectRecords('clients', {
        where: { agency_id: profile.agency_id },
        orderBy: 'company_name ASC',
      });
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleNewJob = () => {
    setSelectedJob(null);
    setJobFormOpen(true);
  };

  const handleEditJob = (job: any) => {
    setSelectedJob(job);
    setJobFormOpen(true);
  };

  const handleDeleteJob = (job: any) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleJobSaved = () => {
    fetchJobs();
  };

  const handleJobDeleted = () => {
    fetchJobs();
  };

  const handleAddCosts = (job: any) => {
    setSelectedJobForCosts(job);
    setCostItemsDialogOpen(true);
  };

  const handleCostItemsUpdated = async () => {
    // Recalculate actual_cost for the job
    if (selectedJobForCosts?.id) {
      try {
        const costItems = await selectRecords('job_cost_items', {
          where: { job_id: selectedJobForCosts.id },
        });
        const totalCost = costItems.reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.total_cost?.toString() || '0') || 0);
        }, 0);

        await updateRecord('jobs', { actual_cost: totalCost }, { id: selectedJobForCosts.id }, user?.id);

        // Update the selected job in state
        setSelectedJobForCosts((prev: any) => ({
          ...prev,
          actual_cost: totalCost,
        }));

        fetchJobs(); // Refresh jobs list
      } catch (error) {
        console.error('Error updating actual cost:', error);
        toast({
          title: 'Warning',
          description: 'Cost items saved but failed to update job total. Please refresh.',
          variant: 'destructive',
        });
      }
    }
  };

  // Mock data for demonstration - replace with real data from jobs state
  const jobStats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(job => job.status === 'in_progress').length,
    totalBudget: jobs.reduce((sum, job) => sum + (job.budget || 0), 0),
    actualCosts: jobs.reduce((sum, job) => sum + (job.actual_cost || 0), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesClient = clientFilter === 'all' || job.client_id === clientFilter;
    
    const matchesDateRange = 
      !dateRangeFilter.start && !dateRangeFilter.end ||
      (!dateRangeFilter.start || (job.start_date && job.start_date >= dateRangeFilter.start)) &&
      (!dateRangeFilter.end || (job.end_date && job.end_date <= dateRangeFilter.end));
    
    return matchesSearch && matchesStatus && matchesClient && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate profit/loss
  const calculateProfit = (job: any) => {
    const budget = parseFloat(job.budget?.toString() || '0') || 0;
    const actual = parseFloat(job.actual_cost?.toString() || '0') || 0;
    return budget - actual;
  };

  const exportToCSV = () => {
    const headers = ['Job Number', 'Title', 'Client', 'Status', 'Budget', 'Actual Cost', 'Profit/Loss', 'Start Date', 'End Date'];
    const rows = filteredJobs.map(job => [
      job.job_number || '',
      job.title || '',
      job.client_name || '',
      job.status || '',
      job.budget || 0,
      job.actual_cost || 0,
      calculateProfit(job),
      job.start_date || '',
      job.end_date || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Jobs exported to CSV',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Job Costing</h1>
          <p className="text-muted-foreground">Track and manage job costs and profitability</p>
        </div>
        <Button onClick={handleNewJob}>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{jobStats.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{jobStats.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">₹{jobStats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Actual Costs</p>
                <p className="text-2xl font-bold">₹{jobStats.actualCosts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, number, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || client.name || client.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date From</label>
                  <Input
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date To</label>
                  <Input
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setClientFilter('all');
                    setDateRangeFilter({ start: '', end: '' });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Jobs Content */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Job List</TabsTrigger>
          <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading jobs...</div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs found. Create your first job to get started.
                </div>
              ) : (
                <>
                  {paginatedJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {job.job_number} • {job.client_name || 'No client assigned'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-semibold">₹{(job.budget || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Actual Cost</p>
                          <p className="font-semibold">₹{(job.actual_cost || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Hours (Est/Act)</p>
                          <p className="font-semibold">{job.estimated_hours || 0}/{job.actual_hours || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit/Loss</p>
                          <p className={`font-semibold ${calculateProfit(job) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{calculateProfit(job).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {job.start_date && job.end_date && (
                            <>
                              {new Date(job.start_date).toLocaleDateString()} - {new Date(job.end_date).toLocaleDateString()}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditJob(job)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleAddCosts(job)}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Add Costs
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/invoices?job_id=${job.id}&client_id=${job.client_id}`)}
                            title="Create invoice for this job"
                          >
                            Invoice
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/quotations?job_id=${job.id}&client_id=${job.client_id}`)}
                            title="Create quotation for this job"
                          >
                            Quote
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/project-management?job_id=${job.id}`)}
                            title="Link to project"
                          >
                            Project
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteJob(job)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid gap-6">
            {/* Budget vs Actual */}
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No jobs to analyze</p>
                  ) : (
                    jobs.map((job) => {
                      const budget = parseFloat(job.budget?.toString() || '0') || 0;
                      const actual = parseFloat(job.actual_cost?.toString() || '0') || 0;
                      const percentage = budget > 0 ? (actual / budget) * 100 : 0;
                      const isOverBudget = actual > budget;
                      
                      return (
                        <div key={job.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{job.title}</span>
                            <span className={isOverBudget ? 'text-red-600' : 'text-green-600'}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 relative">
                            <div
                              className={`h-4 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                            {percentage > 100 && (
                              <div
                                className="bg-red-600 h-4 rounded-full absolute top-0"
                                style={{ width: `${((percentage - 100) / percentage) * 100}%`, left: '100%' }}
                              />
                            )}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Budget: ₹{budget.toLocaleString()}</span>
                            <span>Actual: ₹{actual.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const categoryTotals: { [key: string]: number } = {};
                    jobs.forEach((job: any) => {
                      // This would need to fetch cost items, but for now show placeholder
                    });
                    
                    return (
                      <p className="text-center text-muted-foreground py-8">
                        Cost breakdown will be calculated from job cost items
                      </p>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Profitability Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Profitability Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold">₹{jobStats.totalBudget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Actual</p>
                    <p className="text-2xl font-bold">₹{jobStats.actualCosts.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className={`text-2xl font-bold ${(jobStats.totalBudget - jobStats.actualCosts) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{(jobStats.totalBudget - jobStats.actualCosts).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className={`text-2xl font-bold ${jobStats.totalBudget > 0 && ((jobStats.totalBudget - jobStats.actualCosts) / jobStats.totalBudget * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {jobStats.totalBudget > 0 
                        ? `${((jobStats.totalBudget - jobStats.actualCosts) / jobStats.totalBudget * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <JobFormDialog
        isOpen={jobFormOpen}
        onClose={() => setJobFormOpen(false)}
        job={selectedJob}
        onJobSaved={handleJobSaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={handleJobDeleted}
        itemType="Job"
        itemName={jobToDelete?.title || ''}
        itemId={jobToDelete?.id || ''}
        tableName="jobs"
      />

      <JobCostItemsDialog
        isOpen={costItemsDialogOpen}
        onClose={() => {
          setCostItemsDialogOpen(false);
          setSelectedJobForCosts(null);
        }}
        jobId={selectedJobForCosts?.id || ''}
        jobTitle={selectedJobForCosts?.title}
        onItemsUpdated={handleCostItemsUpdated}
      />
    </div>
  );
};

export default JobCosting;