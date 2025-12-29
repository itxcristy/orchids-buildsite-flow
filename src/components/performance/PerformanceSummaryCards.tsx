import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, ListTodo, TrendingUp, Calendar, Zap } from "lucide-react";
import { PerformanceSummary } from "@/services/api/performance-service";

interface PerformanceSummaryCardsProps {
  summary: PerformanceSummary;
  loading?: boolean;
}

export function PerformanceSummaryCards({ summary, loading }: PerformanceSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Work Hours",
      value: `${summary.totalWorkHours.toFixed(1)}h`,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Tasks Completed",
      value: `${summary.tasksCompleted}`,
      subtitle: `of ${summary.tasksAssigned}`,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Tasks Assigned",
      value: `${summary.tasksAssigned}`,
      icon: ListTodo,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Completion Rate",
      value: `${summary.completionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "On-Time Rate",
      value: `${summary.onTimeCompletionRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Attendance Rate",
      value: `${summary.attendanceRate.toFixed(1)}%`,
      icon: Calendar,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Overtime Hours",
      value: `${summary.overtimeHours.toFixed(1)}h`,
      icon: Zap,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Avg Completion Time",
      value: `${summary.averageCompletionTime.toFixed(1)}h`,
      icon: Clock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
