import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { LoadingSpinner } from './LoadingSpinner';

interface LeaveBalance {
  leave_type_name: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
}

interface LeaveBalanceWidgetProps {
  employeeId?: string;
  year?: number;
  onRequestLeave?: () => void;
  compact?: boolean;
}

export const LeaveBalanceWidget: React.FC<LeaveBalanceWidgetProps> = ({
  employeeId,
  year = new Date().getFullYear(),
  onRequestLeave,
  compact = false
}) => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const { toast } = useToast();

  const { execute: loadBalances, loading } = useAsyncOperation({
    onError: (error) => toast({
      variant: 'destructive',
      title: 'Failed to load leave balances',
      description: error.message
    })
  });

  const fetchBalances = async () => {
    return loadBalances(async () => {
      const { data, error } = await db.rpc('get_leave_balance_summary', {
        p_employee_id: employeeId || undefined,
        p_year: year
      });

      if (error) throw error;
      setBalances((data || []) as LeaveBalance[]);
      return data;
    });
  };

  useEffect(() => {
    fetchBalances();
  }, [employeeId, year]);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const totalAllocated = balances.reduce((sum, b) => sum + Number(b.allocated_days), 0);
  const totalUsed = balances.reduce((sum, b) => sum + Number(b.used_days), 0);
  const totalPending = balances.reduce((sum, b) => sum + Number(b.pending_days), 0);
  const totalRemaining = balances.reduce((sum, b) => sum + Number(b.remaining_days), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="md" text="Loading leave balances..." />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Leave Balance {year}</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{totalRemaining}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{totalUsed}</div>
              <div className="text-xs text-muted-foreground">Used</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">{totalPending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
          
          {onRequestLeave && (
            <Button size="sm" onClick={onRequestLeave} className="w-full">
              <Plus className="w-3 h-3 mr-1" />
              Request Leave
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leave Balances {year}</CardTitle>
            <CardDescription>
              Your annual leave allowances and usage
            </CardDescription>
          </div>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalRemaining}</div>
            <div className="text-sm text-muted-foreground">Days Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalUsed}</div>
            <div className="text-sm text-muted-foreground">Days Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
            <div className="text-sm text-muted-foreground">Days Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{totalAllocated}</div>
            <div className="text-sm text-muted-foreground">Total Allocated</div>
          </div>
        </div>

        <Separator />

        {/* Detailed Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium">Leave Type Breakdown</h4>
          
          {balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No leave balances found for {year}</p>
              <p className="text-sm">Leave balances may not be initialized yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {balances.map((balance) => {
                const usagePercentage = totalAllocated > 0 ? 
                  ((Number(balance.used_days) + Number(balance.pending_days)) / Number(balance.allocated_days)) * 100 : 0;
                
                return (
                  <div key={balance.leave_type_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{balance.leave_type_name}</span>
                        {usagePercentage >= 90 && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {balance.remaining_days} / {balance.allocated_days} days
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Progress 
                        value={usagePercentage} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Used: {balance.used_days}</span>
                        {Number(balance.pending_days) > 0 && (
                          <span>Pending: {balance.pending_days}</span>
                        )}
                        <span className={getUsageColor(usagePercentage)}>
                          {usagePercentage.toFixed(1)}% used
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {onRequestLeave && (
          <>
            <Separator />
            <div className="flex justify-center">
              <Button onClick={onRequestLeave}>
                <Plus className="w-4 h-4 mr-2" />
                Request Leave
              </Button>
            </div>
          </>
        )}

        {/* Helpful Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Leave balances are updated automatically when requests are approved</p>
          <p>• Pending requests temporarily reduce your available balance</p>
          <p>• Contact HR if you notice any discrepancies</p>
        </div>
      </CardContent>
    </Card>
  );
};