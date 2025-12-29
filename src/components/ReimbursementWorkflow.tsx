import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, MessageSquare, Download, Upload, Eye, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  description: string;
  business_purpose: string;
  status: string;
  mileage_distance?: number;
  mileage_rate?: number;
  mileage_amount?: number;
  receipt_required: boolean;
  policy_violation?: string;
  created_at: string;
  currency: string;
  employee?: {
    full_name: string;
    department: string;
  };
  category?: {
    name: string;
  };
}

interface WorkflowState {
  id: string;
  state: string;
  actor_id: string;
  action_date: string;
  comments?: string;
  actor?: {
    full_name: string;
  };
}

interface ReimbursementWorkflowProps {
  requestId: string;
  onStatusChange?: (newStatus: string) => void;
}

const stateConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Draft' },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: Upload, label: 'Submitted' },
  manager_review: { color: 'bg-yellow-100 text-yellow-800', icon: Eye, label: 'Manager Review' },
  finance_review: { color: 'bg-purple-100 text-purple-800', icon: DollarSign, label: 'Finance Review' },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
  paid: { color: 'bg-emerald-100 text-emerald-800', icon: DollarSign, label: 'Paid' }
};

export const ReimbursementWorkflow: React.FC<ReimbursementWorkflowProps> = ({ 
  requestId, 
  onStatusChange 
}) => {
  const { user, profile } = useAuth();
  const [request, setRequest] = useState<ReimbursementRequest | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return'>('approve');
  const [comments, setComments] = useState('');
  const { toast } = useToast();

  const { execute: loadRequest, loading: loadingRequest } = useAsyncOperation();
  const { execute: loadWorkflow, loading: loadingWorkflow } = useAsyncOperation();
  const { execute: submitAction, loading: submittingAction } = useAsyncOperation({
    onSuccess: () => {
      toast({ title: 'Action completed successfully' });
      setIsActionDialogOpen(false);
      setComments('');
      loadRequest(fetchRequest);
      loadWorkflow(fetchWorkflow);
    }
  });

  const fetchRequest = async () => {
    // Try with employee_id foreign key first, fall back to user_id if it doesn't exist
    let data, error;
    
    try {
      const result = await db
        .from('reimbursement_requests')
        .select(`
          *,
          employee:profiles!reimbursement_requests_employee_id_fkey(full_name, department),
          category:expense_categories(name)
        `)
        .eq('id', requestId)
        .single();
      data = result.data;
      error = result.error;
    } catch (err: any) {
      // If employee_id foreign key doesn't exist, try with user_id
      if (err?.message?.includes('employee_id') || err?.code === '42703') {
        const result = await db
          .from('reimbursement_requests')
          .select(`
            *,
            employee:profiles!reimbursement_requests_user_id_fkey(full_name, department),
            category:expense_categories(name)
          `)
          .eq('id', requestId)
          .single();
        data = result.data;
        error = result.error;
      } else {
        throw err;
      }
    }
    
    // If still error, try without foreign key joins
    if (error) {
      const result = await db
        .from('reimbursement_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    setRequest(data as unknown as ReimbursementRequest);
    return data;
  };

  const fetchWorkflow = async () => {
    const { data, error } = await db
      .from('reimbursement_workflow_states')
      .select(`
        *,
        actor:profiles!reimbursement_workflow_states_actor_id_fkey(full_name)
      `)
      .eq('request_id', requestId)
      .order('action_date', { ascending: true });

    if (error) throw error;
    setWorkflowStates((data || []) as unknown as WorkflowState[]);
    return data;
  };

  const handleAction = async () => {
    if (!request) return;

    let nextState = '';
    switch (actionType) {
      case 'approve':
        if (request.status === 'submitted') nextState = 'manager_review';
        else if (request.status === 'manager_review') nextState = 'finance_review';
        else if (request.status === 'finance_review') nextState = 'approved';
        break;
      case 'reject':
        nextState = 'rejected';
        break;
      case 'return':
        nextState = 'submitted';
        break;
    }

    return submitAction(async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const agencyId = await getAgencyId(profile, user.id);
      if (!agencyId) throw new Error('Agency ID not found');
      
      // Create workflow state entry
      const { error: workflowError } = await db
        .from('reimbursement_workflow_states')
        .insert({
          request_id: requestId,
          state: nextState,
          actor_id: user.id,
          comments: comments || null
        });

      if (workflowError) throw workflowError;

      // Update request status
      const { error: updateError } = await db
        .from('reimbursement_requests')
        .update({ status: nextState })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create notification for employee
      if (nextState === 'approved' || nextState === 'rejected') {
        await db.rpc('create_notification', {
          p_user_id: request.employee_id,
          p_type: 'in_app',
          p_category: 'update',
          p_title: `Reimbursement Request ${nextState.charAt(0).toUpperCase() + nextState.slice(1)}`,
          p_message: `Your reimbursement request for $${request.amount} has been ${nextState}.`,
          p_action_url: '/reimbursements'
        });
      }

      onStatusChange?.(nextState);
    });
  };

  const calculateProgress = () => {
    if (!request) return 0;
    
    const stateOrder = ['draft', 'submitted', 'manager_review', 'finance_review', 'approved', 'paid'];
    const currentIndex = stateOrder.indexOf(request.status);
    
    if (request.status === 'rejected') return 100; // Show as complete but red
    return ((currentIndex + 1) / stateOrder.length) * 100;
  };

  const canTakeAction = () => {
    if (!request) return false;
    
    // This would need to check user roles and permissions
    // For now, returning true for demonstration
    return ['submitted', 'manager_review', 'finance_review'].includes(request.status);
  };

  useEffect(() => {
    loadRequest(fetchRequest);
    loadWorkflow(fetchWorkflow);
  }, [requestId]);

  if (loadingRequest) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="md" text="Loading request details..." />
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Request not found</p>
        </CardContent>
      </Card>
    );
  }

  const StateIcon = stateConfig[request.status as keyof typeof stateConfig]?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Request Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <StateIcon className="w-5 h-5" />
                <span>Reimbursement Request</span>
              </CardTitle>
              <CardDescription>
                {request.employee?.full_name} • {request.category?.name}
              </CardDescription>
            </div>
            <Badge className={stateConfig[request.status as keyof typeof stateConfig]?.color}>
              {stateConfig[request.status as keyof typeof stateConfig]?.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
              <p className="text-lg font-semibold">${request.amount}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p>{new Date(request.expense_date).toLocaleDateString()}</p>
            </div>
            {request.mileage_distance && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Mileage</Label>
                <p>{request.mileage_distance} miles @ ${request.mileage_rate}/mile</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Receipt Required</Label>
              <p>{request.receipt_required ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
            <p className="mt-1">{request.description}</p>
          </div>

          {request.business_purpose && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Purpose</Label>
              <p className="mt-1">{request.business_purpose}</p>
            </div>
          )}

          {request.policy_violation && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-yellow-600" />
                <Label className="text-sm font-medium text-yellow-800">Policy Violation</Label>
              </div>
              <p className="text-sm text-yellow-700 mt-1">{request.policy_violation}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Request Progress</span>
              <span>{Math.round(calculateProgress())}%</span>
            </div>
            <Progress 
              value={calculateProgress()} 
              className={`h-2 ${request.status === 'rejected' ? 'bg-red-100' : ''}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow History</CardTitle>
          <CardDescription>Timeline of actions taken on this request</CardDescription>
        </CardHeader>
        
        <CardContent>
          {loadingWorkflow ? (
            <LoadingSpinner size="sm" text="Loading workflow..." />
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {workflowStates.map((state, index) => {
                  const StateIcon = stateConfig[state.state as keyof typeof stateConfig]?.icon || Clock;
                  const isLast = index === workflowStates.length - 1;
                  
                  return (
                    <div key={state.id} className="flex items-start space-x-3">
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full ${stateConfig[state.state as keyof typeof stateConfig]?.color}`}>
                          <StateIcon className="w-4 h-4" />
                        </div>
                        {!isLast && <div className="w-px h-6 bg-border mt-2" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            {stateConfig[state.state as keyof typeof stateConfig]?.label}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(state.action_date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {state.actor?.full_name || 'System'}
                        </p>
                        {state.comments && (
                          <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                            {state.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canTakeAction() && (
        <Card>
          <CardHeader>
            <CardTitle>Take Action</CardTitle>
            <CardDescription>Review and approve or reject this request</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex space-x-2">
              <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    onClick={() => setActionType('approve')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </DialogTrigger>
                
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    onClick={() => setActionType('reject')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {actionType === 'approve' ? 'Approve' : 'Reject'} Request
                    </DialogTitle>
                    <DialogDescription>
                      Add comments about your decision (optional)
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter your comments..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsActionDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAction}
                        disabled={submittingAction}
                        variant={actionType === 'approve' ? 'default' : 'destructive'}
                      >
                        {submittingAction && <LoadingSpinner size="sm" className="mr-2" />}
                        {actionType === 'approve' ? 'Approve' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};