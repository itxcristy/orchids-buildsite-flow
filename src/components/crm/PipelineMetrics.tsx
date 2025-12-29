/**
 * PipelineMetrics Component
 * Analytics dashboard for pipeline performance
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Clock, Target, BarChart3 } from 'lucide-react';
import { PipelineMetrics as Metrics, PipelineStage } from '@/services/api/crm-service';

interface PipelineMetricsProps {
  metrics: Metrics;
  stages: PipelineStage[];
}

export const PipelineMetrics: React.FC<PipelineMetricsProps> = ({ metrics, stages }) => {
  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Total Pipeline Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Weighted Pipeline Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Weighted Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{formatCurrency(metrics.weightedValue)}</div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on probability
          </p>
        </CardContent>
      </Card>

      {/* Average Time to Close */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time in Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {Object.values(metrics.averageTimeInStage).length > 0
                ? `${Math.round(
                    Object.values(metrics.averageTimeInStage).reduce((a, b) => a + b, 0) /
                    Object.values(metrics.averageTimeInStage).length
                  )}d`
                : '0d'}
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      {/* Stage Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stage Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage) => {
              const count = metrics.stageCounts[stage.stage_name] || 0;
              const value = metrics.stageValues[stage.stage_name] || 0;
              const avgTime = metrics.averageTimeInStage[stage.stage_name] || 0;
              const conversionRate = metrics.conversionRates[stage.stage_name];
              const percentage = metrics.totalLeads > 0
                ? (count / metrics.totalLeads) * 100
                : 0;

              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || '#6b7280' }}
                      />
                      <span className="font-medium">{stage.stage_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{count} leads</span>
                      <span className="font-semibold">{formatCurrency(value)}</span>
                      {avgTime > 0 && (
                        <span className="text-muted-foreground">{avgTime}d avg</span>
                      )}
                      {conversionRate !== undefined && (
                        <span className="text-muted-foreground">{conversionRate}% conv</span>
                      )}
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
