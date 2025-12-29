/**
 * Page Request Center
 * Allows agencies to browse and request additional pages
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, DollarSign, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePageCatalog } from '@/hooks/usePageCatalog';
import { useAgencyPages, useAgencyPageRequests } from '@/hooks/useAgencyPages';
import { getApiBaseUrl } from '@/config/api';
import { PageContainer, PageHeader } from '@/components/layout';

export default function PageRequestCenter() {
  const { toast } = useToast();
  const { pages, loading: pagesLoading } = usePageCatalog({ is_active: true });
  const { pages: assignedPages, loading: assignedLoading } = useAgencyPages();
  const { requests, loading: requestsLoading, requestPage, fetchRequests } = useAgencyPageRequests();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [requestReason, setRequestReason] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  const assignedPageIds = new Set((assignedPages || []).map(p => p.page_id));
  const pendingRequestPageIds = new Set(
    (requests || []).filter(r => r.status === 'pending').map(r => r.page_id)
  );

  const availablePages = (pages || []).filter(page => {
    const matchesSearch = !searchQuery ||
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || page.category === filterCategory;
    const isNotAssigned = !assignedPageIds.has(page.id);
    return matchesSearch && matchesCategory && isNotAssigned;
  });

  const handleRequestPage = async () => {
    if (!selectedPage) return;

    try {
      await requestPage(selectedPage.id, requestReason);
      setIsRequestDialogOpen(false);
      setSelectedPage(null);
      setRequestReason('');
      toast({
        title: 'Request Submitted',
        description: 'Your page request has been submitted for review.',
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Page Request Center"
        description="Browse available pages and request access to additional features"
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{assignedPages.length}</div>
              <div className="text-sm text-muted-foreground">Pages Assigned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{availablePages.length}</div>
              <div className="text-sm text-muted-foreground">Available Pages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {(requests || []).filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Available Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Available Pages</CardTitle>
            <CardDescription>
              Request access to additional pages for your agency
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pagesLoading || assignedLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : availablePages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No additional pages available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availablePages.map((page) => {
                    const isPending = pendingRequestPageIds.has(page.id);
                    return (
                      <TableRow key={page.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{page.title}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {page.path}
                            </div>
                            {page.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {page.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{page.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {page.base_cost.toFixed(2)}/mo
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Badge variant="secondary">Request Pending</Badge>
                          ) : (
                            <Badge variant="outline">Available</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              setSelectedPage(page);
                              setIsRequestDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Request
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>
              Track the status of your page requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No page requests yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requests || []).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {request.path}
                        </div>
                      </TableCell>
                      <TableCell>
                        ${request.base_cost.toFixed(2)}/mo
                      </TableCell>
                      <TableCell>
                        {request.reason || <span className="text-muted-foreground">No reason provided</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Page Access</DialogTitle>
            <DialogDescription>
              Request access to: {selectedPage?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Page Information</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Path: <span className="font-mono">{selectedPage?.path}</span></div>
                <div>Category: {selectedPage?.category}</div>
                <div>Monthly Cost: ${selectedPage?.base_cost.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Request *
              </label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Explain why your agency needs access to this page..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Providing a reason helps with faster approval
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestPage}
              disabled={!requestReason.trim()}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

