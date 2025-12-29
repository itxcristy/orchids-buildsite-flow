import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Phone, Mail, Calendar, Users2, FileText, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import ActivityFormDialog from '@/components/ActivityFormDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const ActivityDetail = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState<any>(null);
  const [relatedLead, setRelatedLead] = useState<any>(null);
  const [relatedClient, setRelatedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (activityId) {
      fetchActivityDetails();
    }
  }, [activityId]);

  const fetchActivityDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('crm_activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) throw error;
      setActivity(data);

      // Fetch related lead
      if (data.lead_id) {
        const { data: leadData } = await db
          .from('leads')
          .select('*')
          .eq('id', data.lead_id)
          .single();
        setRelatedLead(leadData);
      }

      // Fetch related client
      if (data.client_id) {
        const { data: clientData } = await db
          .from('clients')
          .select('*')
          .eq('id', data.client_id)
          .single();
        setRelatedClient(clientData);
      }
    } catch (error: any) {
      console.error('Error fetching activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch activity details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setActivityFormOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleActivitySaved = () => {
    fetchActivityDetails();
    setActivityFormOpen(false);
  };

  const handleActivityDeleted = () => {
    if (relatedLead) {
      navigate(`/crm/leads/${relatedLead.id}`);
    } else {
      navigate('/crm');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'task': return FileText;
      case 'note': return FileText;
      default: return FileText;
    }
  };

  const getActivityStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Activity not found</p>
        <Button onClick={() => navigate('/crm')} className="mt-4">
          Back to CRM
        </Button>
      </div>
    );
  }

  const ActivityIcon = getActivityIcon(activity.activity_type);
  const StatusIcon = getActivityStatusIcon(activity.status);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (relatedLead) {
              navigate(`/crm/leads/${relatedLead.id}`);
            } else {
              navigate('/crm');
            }
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <ActivityIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{activity.subject}</h1>
              <p className="text-sm text-muted-foreground">
                {activity.activity_type} • {new Date(activity.activity_date).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge className={getStatusColor(activity.status)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {activity.status}
        </Badge>
        <Badge variant="outline">
          {activity.activity_type}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Activity Date</p>
                  <p className="font-medium">
                    {new Date(activity.activity_date).toLocaleString()}
                  </p>
                </div>
                {activity.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {new Date(activity.due_date).toLocaleString()}
                    </p>
                  </div>
                )}
                {activity.completed_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Date</p>
                    <p className="font-medium">
                      {new Date(activity.completed_date).toLocaleString()}
                    </p>
                  </div>
                )}
                {activity.duration && (
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{activity.duration} minutes</p>
                  </div>
                )}
                {activity.location && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{activity.location}</p>
                    </div>
                  </div>
                )}
                {activity.outcome && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Outcome</p>
                    <p className="font-medium">{activity.outcome}</p>
                  </div>
                )}
              </div>

              {activity.agenda && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Agenda</p>
                  <p className="text-sm whitespace-pre-wrap">{activity.agenda}</p>
                </div>
              )}

              {activity.attendees && activity.attendees.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Attendees</p>
                  <div className="flex flex-wrap gap-2">
                    {activity.attendees.map((attendee: string, index: number) => (
                      <Badge key={index} variant="outline">
                        <Users2 className="h-3 w-3 mr-1" />
                        {attendee}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {activity.attachments && activity.attachments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Attachments</p>
                  <div className="space-y-2">
                    {activity.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{attachment.name || attachment.filename}</span>
                        {attachment.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {relatedLead && (
            <Card>
              <CardHeader>
                <CardTitle>Related Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{relatedLead.company_name || relatedLead.name}</p>
                  <p className="text-sm text-muted-foreground">{relatedLead.lead_number}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/crm/leads/${relatedLead.id}`)}
                  >
                    View Lead
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {relatedClient && (
            <Card>
              <CardHeader>
                <CardTitle>Related Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{relatedClient.name || relatedClient.company_name}</p>
                  <p className="text-sm text-muted-foreground">{relatedClient.client_number}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/clients/${relatedClient.id}`)}
                  >
                    View Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(activity.updated_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ActivityFormDialog
        isOpen={activityFormOpen}
        onClose={() => setActivityFormOpen(false)}
        activity={activity}
        leadId={activity.lead_id}
        onActivitySaved={handleActivitySaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={handleActivityDeleted}
        itemType="Activity"
        itemName={activity.subject}
        itemId={activity.id}
        tableName="crm_activities"
      />
    </div>
  );
};

export default ActivityDetail;
