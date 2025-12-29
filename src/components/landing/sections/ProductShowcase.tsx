import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { 
  Play, 
  ChevronRight,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Menu
} from 'lucide-react';
import { SectionTitle } from '../fragments';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DashboardView = () => (
  <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white font-display">Welcome back, Sarah</h3>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Here's what's happening today</p>
      </div>
      <div className="flex gap-2">
        <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-800 text-[10px] sm:text-xs text-zinc-400">This Week</div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {[
        { label: 'Revenue', value: '₹12.4L', change: '+12%', trend: 'up' },
        { label: 'Projects', value: '24', change: '+3', trend: 'up' },
        { label: 'Tasks Done', value: '147', change: '+28', trend: 'up' },
        { label: 'Team Load', value: '78%', change: '-5%', trend: 'down' },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04]"
        >
          <div className="text-[10px] sm:text-xs text-zinc-500 mb-0.5 sm:mb-1">{stat.label}</div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-sm sm:text-xl font-semibold text-white font-display">{stat.value}</span>
            <span className={`text-[10px] sm:text-xs ${stat.trend === 'up' ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {stat.change}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="sm:col-span-2 rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-zinc-300">Revenue Trend</span>
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] sm:text-xs">
            <span>+24%</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
        <div className="h-20 sm:h-32 flex items-end gap-1 sm:gap-2">
          {[45, 62, 38, 75, 55, 90, 68, 82, 95, 78, 88, 100].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-500/70 to-blue-400/30"
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
            />
          ))}
        </div>
      </div>
      
      <div className="rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04] p-3 sm:p-4">
        <span className="text-xs sm:text-sm font-medium text-zinc-300">Recent Activity</span>
        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
          {[
            { text: 'Invoice #234 paid', time: '2m ago' },
            { text: 'New task assigned', time: '15m ago' },
            { text: 'Project completed', time: '1h ago' },
          ].map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-zinc-400 flex-1 truncate">{activity.text}</span>
              <span className="text-[8px] sm:text-[10px] text-zinc-600 flex-shrink-0">{activity.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ProjectsView = () => (
  <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold text-white font-display">Active Projects</h3>
      <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-500/20 text-[10px] sm:text-xs text-blue-400">+ New</div>
    </div>
    
    <div className="space-y-2 sm:space-y-3">
      {[
        { name: 'Brand Redesign', client: 'Acme Corp', progress: 75, status: 'On Track', color: 'emerald' },
        { name: 'Mobile App', client: 'TechStart', progress: 45, status: 'In Progress', color: 'blue' },
        { name: 'Website Launch', client: 'FinServ', progress: 90, status: 'Review', color: 'purple' },
        { name: 'Marketing Campaign', client: 'RetailCo', progress: 30, status: 'Starting', color: 'orange' },
      ].map((project, i) => (
        <motion.div
          key={project.name}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-${project.color}-500/20 flex items-center justify-center flex-shrink-0`}>
              <FileText className={`w-4 h-4 sm:w-5 sm:h-5 text-${project.color}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-medium text-white truncate">{project.name}</span>
                <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-${project.color}-500/20 text-${project.color}-400 flex-shrink-0`}>
                  {project.status}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-zinc-500">{project.client}</span>
            </div>
            <div className="hidden sm:block w-24 lg:w-32">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">Progress</span>
                <span className="text-xs text-zinc-400">{project.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-${project.color}-500 rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors hidden sm:block" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const TeamView = () => (
  <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold text-white font-display">Team Members</h3>
      <div className="text-[10px] sm:text-xs text-zinc-500">8 members active</div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      {[
        { name: 'Sarah Chen', role: 'Project Lead', tasks: 12, status: 'online', color: 'bg-blue-500' },
        { name: 'Mike Wilson', role: 'Developer', tasks: 8, status: 'online', color: 'bg-emerald-500' },
        { name: 'Anna Smith', role: 'Designer', tasks: 6, status: 'away', color: 'bg-purple-500' },
        { name: 'John Davis', role: 'Marketing', tasks: 4, status: 'online', color: 'bg-orange-500' },
        { name: 'Lisa Park', role: 'Content', tasks: 5, status: 'online', color: 'bg-pink-500' },
        { name: 'Tom Brown', role: 'Developer', tasks: 9, status: 'offline', color: 'bg-cyan-500' },
      ].map((member, i) => (
        <motion.div
          key={member.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-shrink-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${member.color} flex items-center justify-center text-[10px] sm:text-sm font-medium text-white`}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-zinc-900 ${
                member.status === 'online' ? 'bg-emerald-400' : 
                member.status === 'away' ? 'bg-yellow-400' : 'bg-zinc-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-medium text-white truncate">{member.name}</div>
              <div className="text-[10px] sm:text-xs text-zinc-500">{member.role}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs sm:text-sm font-medium text-zinc-400">{member.tasks}</div>
              <div className="text-[8px] sm:text-[10px] text-zinc-600">tasks</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const SettingsView = () => (
  <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
    <h3 className="text-base sm:text-lg font-semibold text-white font-display mb-4 sm:mb-6">Settings</h3>
    
    <div className="space-y-2 sm:space-y-4">
      {[
        { label: 'Notifications', description: 'Email and push notification preferences', enabled: true },
        { label: 'Two-Factor Auth', description: 'Add extra security to your account', enabled: true },
        { label: 'Auto-save', description: 'Automatically save changes', enabled: true },
        { label: 'Dark Mode', description: 'Use dark theme across the app', enabled: true },
        { label: 'Analytics', description: 'Share usage data to improve the product', enabled: false },
      ].map((setting, i) => (
        <motion.div
          key={setting.label}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-zinc-800/50 border border-white/[0.04]"
        >
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-xs sm:text-sm font-medium text-white">{setting.label}</div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">{setting.description}</div>
          </div>
          <div className={`w-8 h-5 sm:w-10 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors flex-shrink-0 ${setting.enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}>
            <motion.div
              className="w-4 h-4 rounded-full bg-white"
              animate={{ x: setting.enabled ? 12 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const views: Record<string, React.FC> = {
  dashboard: DashboardView,
  projects: ProjectsView,
  team: TeamView,
  settings: SettingsView,
};

export const ProductShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ActiveView = views[activeTab];
  
  return (
    <section ref={ref} className="relative py-16 sm:py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.05),transparent_50%)]" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionTitle
          badge="Product"
          title="See it in action"
          description="Experience how Drena transforms the way agencies work, from first glance to daily operations."
        />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 sm:mt-16"
        >
          <div className="relative rounded-xl sm:rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="absolute -inset-px bg-gradient-to-b from-white/[0.08] to-transparent rounded-xl sm:rounded-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/[0.06] bg-zinc-900/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <Menu className="w-4 h-4 text-zinc-400" />
                </button>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80" />
                </div>
              </div>
              <div className="hidden sm:block px-3 sm:px-4 py-1 rounded-md bg-zinc-800/60 text-[10px] sm:text-xs text-zinc-500 font-mono">
                app.drena.io/{activeTab}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] sm:text-xs text-zinc-500">Live</span>
              </div>
            </div>
            
            <div className="flex relative">
              <div className={`
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
                absolute md:relative z-20
                w-48 h-full
                border-r border-white/[0.06] bg-zinc-900/95 md:bg-zinc-900/30 
                py-3 sm:py-4
                transition-transform duration-300
              `}>
                <div className="px-3 sm:px-4 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs font-bold text-white">D</span>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white font-display">Drena</div>
                      <div className="text-[8px] sm:text-[10px] text-zinc-500">Agency Pro</div>
                    </div>
                  </div>
                </div>
                
                <nav className="space-y-0.5 sm:space-y-1 px-1.5 sm:px-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-left transition-all ${
                        activeTab === tab.id 
                          ? 'bg-white/[0.08] text-white' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {sidebarOpen && (
                <div 
                  className="absolute inset-0 bg-black/50 z-10 md:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              
              <div className="flex-1 min-h-[320px] sm:min-h-[400px] md:min-h-[480px] bg-zinc-900/20">
                <ActiveView />
              </div>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4"
          >
            <button className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs sm:text-sm text-zinc-300 hover:bg-white/[0.08] transition-colors">
              <Play className="w-3 h-3 sm:w-4 sm:h-4" />
              Watch full demo
            </button>
            <span className="text-xs sm:text-sm text-zinc-600">2 min walkthrough</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
