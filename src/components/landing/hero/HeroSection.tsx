import { Link } from 'react-router-dom';
import { ArrowRight, Play, Shield, Clock, CheckCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { COMPANY_NAME, DASHBOARD_PREVIEW_DATA } from '../shared/constants';
import { cn } from '@/lib/utils';

export function HeroSection() {
  return (
    <section className="relative pt-8 pb-20 md:pt-16 md:pb-32 overflow-hidden">
      <HeroBackground />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-600 mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Trusted by 500+ agencies across India
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] animate-fade-in-up">
            The complete ERP
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mt-2">
              built for agencies
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            {COMPANY_NAME} unifies projects, invoicing, HR, CRM, and inventory into one powerful 
            platform. Stop juggling tools. Start growing your agency.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Link to="/register">
              <Button size="lg" className="h-14 px-8 text-base font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-base font-semibold gap-2 border-2"
            >
              <Play className="h-4 w-4" />
              Watch 2-min Demo
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span>Setup in 5 minutes</span>
            </div>
          </div>
        </div>

        <HeroProductPreview />
      </div>
    </section>
  );
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute right-0 top-1/3 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-3xl" />
      <div className="absolute left-0 bottom-0 w-[400px] h-[400px] rounded-full bg-emerald-500/3 blur-3xl" />
    </div>
  );
}

function HeroProductPreview() {
  return (
    <div className="mt-16 md:mt-20 relative animate-fade-in-up" style={{ animationDelay: '400ms' }}>
      <div className="absolute -inset-4 bg-gradient-to-t from-background via-background/50 to-transparent z-10 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl">
        <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-2xl shadow-emerald-900/10 overflow-hidden">
          <BrowserChrome />
          <div className="p-4 md:p-6 bg-muted/30">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-background text-xs text-muted-foreground border border-border">
          <Shield className="h-3 w-3 text-emerald-500" />
          app.drena.io/dashboard
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  const { stats, recentProjects, recentInvoices, teamActivity } = DASHBOARD_PREVIEW_DATA;
  
  return (
    <div className="grid grid-cols-12 gap-3 md:gap-4">
      <Sidebar />
      
      <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-4">
        <StatsRow stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProjectsCard projects={recentProjects} />
          <InvoicesCard invoices={recentInvoices} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RevenueChart />
          <ActivityFeed activities={teamActivity} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const menuItems = [
    { icon: '📊', label: 'Dashboard', active: true },
    { icon: '📁', label: 'Projects' },
    { icon: '👥', label: 'CRM' },
    { icon: '📄', label: 'Invoices' },
    { icon: '🧑‍💼', label: 'Employees' },
    { icon: '📦', label: 'Inventory' },
    { icon: '📈', label: 'Reports' },
  ];

  return (
    <div className="hidden md:block col-span-3 lg:col-span-2 space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <span className="font-bold text-sm">Haal</span>
      </div>
      {menuItems.map((item, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            item.active
              ? 'bg-emerald-500/10 text-emerald-700 font-medium'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatsRow({ stats }: { stats: typeof DASHBOARD_PREVIEW_DATA.stats }) {
  const icons = [TrendingUp, Users, DollarSign, CheckCircle];
  const colors = ['emerald', 'blue', 'violet', 'amber'];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div key={i} className="p-4 rounded-xl bg-background border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <Icon className={cn('h-4 w-4', `text-${colors[i]}-500`)} />
            </div>
            <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
            <div className={cn(
              'text-xs mt-1',
              stat.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'
            )}>
              {stat.change} this month
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectsCard({ projects }: { projects: typeof DASHBOARD_PREVIEW_DATA.recentProjects }) {
  return (
    <div className="p-4 rounded-xl bg-background border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Active Projects</h3>
        <Badge variant="secondary" className="text-xs">4 Active</Badge>
      </div>
      <div className="space-y-3">
        {projects.map((project, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{project.name}</span>
              <span className="text-xs text-muted-foreground">{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  project.progress >= 80 ? 'bg-emerald-500' : 
                  project.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                )}
                style={{ width: `${project.progress}%` }} 
              />
            </div>
            <div className="text-xs text-muted-foreground">{project.client}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoicesCard({ invoices }: { invoices: typeof DASHBOARD_PREVIEW_DATA.recentInvoices }) {
  const statusColors = {
    paid: 'bg-emerald-500/10 text-emerald-700',
    pending: 'bg-amber-500/10 text-amber-700',
    overdue: 'bg-red-500/10 text-red-700',
  };
  
  return (
    <div className="p-4 rounded-xl bg-background border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Recent Invoices</h3>
        <Badge variant="secondary" className="text-xs">₹16.6L</Badge>
      </div>
      <div className="space-y-2">
        {invoices.map((invoice, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <div className="text-sm font-medium">{invoice.number}</div>
              <div className="text-xs text-muted-foreground">{invoice.client}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{invoice.amount}</div>
              <Badge className={cn('text-[10px] px-1.5', statusColors[invoice.status as keyof typeof statusColors])}>
                {invoice.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueChart() {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  
  return (
    <div className="lg:col-span-2 p-4 rounded-xl bg-background border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Revenue Overview</h3>
        <Badge variant="outline" className="text-xs">2024</Badge>
      </div>
      <div className="h-32 flex items-end gap-1">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-emerald-500/80 rounded-t hover:bg-emerald-500 transition-colors"
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] text-muted-foreground">{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ activities }: { activities: typeof DASHBOARD_PREVIEW_DATA.teamActivity }) {
  return (
    <div className="p-4 rounded-xl bg-background border border-border">
      <h3 className="font-semibold text-sm mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
              {activity.user.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium">{activity.user}</span>
                <span className="text-muted-foreground"> {activity.action} </span>
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="hidden lg:block p-4 rounded-xl bg-background border border-border">
      <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
      <div className="space-y-2">
        {['New Project', 'Create Invoice', 'Add Lead', 'Log Time'].map((action, i) => (
          <div 
            key={i} 
            className="px-3 py-2 rounded-lg bg-muted/50 text-xs font-medium hover:bg-muted cursor-pointer transition-colors"
          >
            + {action}
          </div>
        ))}
      </div>
    </div>
  );
}
