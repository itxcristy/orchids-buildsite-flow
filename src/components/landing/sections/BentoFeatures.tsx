import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { 
  FolderKanban, 
  Users, 
  TrendingUp, 
  IndianRupee,
  BarChart3,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import { SectionTitle } from '../fragments';

const KanbanPreview = () => {
  const columns = [
    { name: 'To Do', color: 'bg-zinc-600', tasks: [
      { title: 'Brand Guidelines', tag: 'Design', priority: 'high' },
      { title: 'User Research', tag: 'Research', priority: 'medium' },
    ]},
    { name: 'In Progress', color: 'bg-blue-500', tasks: [
      { title: 'Landing Page', tag: 'Dev', priority: 'high' },
    ]},
    { name: 'Done', color: 'bg-emerald-500', tasks: [
      { title: 'Logo Design', tag: 'Design', priority: 'low' },
      { title: 'Wireframes', tag: 'Design', priority: 'medium' },
    ]},
  ];
  
  return (
    <div className="flex gap-2 h-full p-3">
      {columns.map((col, colIdx) => (
        <motion.div 
          key={col.name}
          className="flex-1 flex flex-col gap-2"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: colIdx * 0.1, duration: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${col.color}`} />
            <span className="text-[10px] font-medium text-zinc-400">{col.name}</span>
            <span className="text-[9px] text-zinc-600 ml-auto">{col.tasks.length}</span>
          </div>
          
          {col.tasks.map((task, taskIdx) => (
            <motion.div
              key={task.title}
              className="p-2 rounded-lg bg-zinc-800/80 border border-white/[0.04] group hover:border-white/[0.1] transition-colors cursor-pointer"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: colIdx * 0.1 + taskIdx * 0.05 + 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -2 }}
            >
              <div className="text-[10px] font-medium text-zinc-300 mb-1.5">{task.title}</div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-500">{task.tag}</span>
                <div className={`w-1.5 h-1.5 rounded-full ml-auto ${
                  task.priority === 'high' ? 'bg-red-400' : 
                  task.priority === 'medium' ? 'bg-yellow-400' : 'bg-zinc-500'
                }`} />
              </div>
            </motion.div>
          ))}
          
          {col.name === 'To Do' && (
            <div className="p-2 rounded-lg border border-dashed border-zinc-700/50 flex items-center justify-center opacity-50">
              <Plus className="w-3 h-3 text-zinc-600" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

const FinancePreview = () => {
  const data = [35, 48, 42, 68, 55, 78, 82, 75, 92];
  const maxVal = Math.max(...data);
  
  return (
    <div className="h-full p-3 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-zinc-500">Monthly Revenue</div>
          <div className="text-lg font-semibold text-white font-display">₹4.2L</div>
        </div>
        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
          <TrendingUp className="w-3 h-3" />
          <span className="text-[10px] font-medium">+23%</span>
        </div>
      </div>
      
      <div className="flex-1 flex items-end gap-1">
        {data.map((val, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-gradient-to-t from-emerald-500/60 to-emerald-400/20 rounded-t"
            initial={{ height: 0 }}
            whileInView={{ height: `${(val / maxVal) * 100}%` }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
            viewport={{ once: true }}
          />
        ))}
      </div>
      
      <div className="flex justify-between mt-2 text-[8px] text-zinc-600">
        <span>Jan</span>
        <span>Sep</span>
      </div>
    </div>
  );
};

const TeamPreview = () => {
  const members = [
    { name: 'Sarah', role: 'Lead', status: 'online', color: 'bg-blue-500' },
    { name: 'Mike', role: 'Dev', status: 'online', color: 'bg-emerald-500' },
    { name: 'Anna', role: 'Design', status: 'away', color: 'bg-purple-500' },
    { name: 'John', role: 'PM', status: 'online', color: 'bg-orange-500' },
  ];
  
  return (
    <div className="h-full p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-zinc-500">Team Members</span>
        <span className="text-[10px] text-zinc-400">4 online</span>
      </div>
      
      <div className="space-y-2">
        {members.map((member, i) => (
          <motion.div
            key={member.name}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className={`w-7 h-7 rounded-full ${member.color} flex items-center justify-center text-[10px] font-medium text-white`}>
                {member.name[0]}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                member.status === 'online' ? 'bg-emerald-400' : 'bg-yellow-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-zinc-300">{member.name}</div>
              <div className="text-[8px] text-zinc-500">{member.role}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SalesPreview = () => {
  const stages = [
    { name: 'Leads', count: 142, width: '100%', color: 'bg-zinc-600' },
    { name: 'Qualified', count: 86, width: '60%', color: 'bg-blue-500/70' },
    { name: 'Proposal', count: 34, width: '35%', color: 'bg-blue-500' },
    { name: 'Won', count: 18, width: '20%', color: 'bg-emerald-500' },
  ];
  
  return (
    <div className="h-full p-3 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-zinc-500">Sales Pipeline</span>
        <span className="text-[10px] text-emerald-400">₹12.4L potential</span>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-2">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.name}
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <span className="text-[8px] text-zinc-500 w-12">{stage.name}</span>
            <div className="flex-1 h-5 bg-zinc-800/50 rounded overflow-hidden">
              <motion.div
                className={`h-full ${stage.color} rounded flex items-center justify-end pr-2`}
                initial={{ width: 0 }}
                whileInView={{ width: stage.width }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                viewport={{ once: true }}
              >
                <span className="text-[8px] font-medium text-white">{stage.count}</span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ReportsPreview = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div className="h-full p-3 flex flex-col">
      <div className="flex gap-1 mb-3">
        {['Overview', 'Tasks', 'Time'].map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`text-[9px] px-2 py-1 rounded transition-colors ${
              activeTab === i 
                ? 'bg-zinc-700 text-zinc-200' 
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-2">
        {[
          { label: 'Completed', value: '94%', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'On Time', value: '87%', icon: Clock, color: 'text-blue-400' },
          { label: 'Projects', value: '24', icon: FolderKanban, color: 'text-purple-400' },
          { label: 'Growth', value: '+18%', icon: TrendingUp, color: 'text-orange-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="p-2 rounded-lg bg-zinc-800/50 flex flex-col"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <stat.icon className={`w-3 h-3 ${stat.color} mb-1`} />
            <div className="text-sm font-semibold text-white font-display">{stat.value}</div>
            <div className="text-[8px] text-zinc-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const features = [
  {
    id: 'projects',
    title: 'Project Management',
    description: 'Kanban boards, timelines, and task tracking that adapts to how your team works.',
    icon: FolderKanban,
    color: 'blue',
    preview: KanbanPreview,
    size: 'large',
  },
  {
    id: 'finance',
    title: 'Finance & Billing',
    description: 'Track revenue, send invoices, and manage expenses in one place.',
    icon: IndianRupee,
    color: 'emerald',
    preview: FinancePreview,
    size: 'medium',
  },
  {
    id: 'team',
    title: 'Team Hub',
    description: 'Real-time collaboration with presence, chat, and activity feeds.',
    icon: Users,
    color: 'purple',
    preview: TeamPreview,
    size: 'medium',
  },
  {
    id: 'sales',
    title: 'Sales Pipeline',
    description: 'Visual pipeline to track deals from lead to close.',
    icon: TrendingUp,
    color: 'orange',
    preview: SalesPreview,
    size: 'medium',
  },
  {
    id: 'reports',
    title: 'Analytics & Reports',
    description: 'Insights that help you make better decisions faster.',
    icon: BarChart3,
    color: 'cyan',
    preview: ReportsPreview,
    size: 'medium',
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
  blue: { 
    bg: 'bg-blue-500/10', 
    border: 'group-hover:border-blue-500/30',
    icon: 'text-blue-400',
    glow: 'group-hover:shadow-blue-500/5'
  },
  emerald: { 
    bg: 'bg-emerald-500/10', 
    border: 'group-hover:border-emerald-500/30',
    icon: 'text-emerald-400',
    glow: 'group-hover:shadow-emerald-500/5'
  },
  purple: { 
    bg: 'bg-purple-500/10', 
    border: 'group-hover:border-purple-500/30',
    icon: 'text-purple-400',
    glow: 'group-hover:shadow-purple-500/5'
  },
  orange: { 
    bg: 'bg-orange-500/10', 
    border: 'group-hover:border-orange-500/30',
    icon: 'text-orange-400',
    glow: 'group-hover:shadow-orange-500/5'
  },
  cyan: { 
    bg: 'bg-cyan-500/10', 
    border: 'group-hover:border-cyan-500/30',
    icon: 'text-cyan-400',
    glow: 'group-hover:shadow-cyan-500/5'
  },
};

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const colors = colorMap[feature.color];
  const Preview = feature.preview;
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group relative rounded-2xl border border-white/[0.06] bg-zinc-950/50 backdrop-blur-sm overflow-hidden transition-all duration-500 ${colors.border} ${colors.glow} hover:shadow-2xl cursor-pointer ${
        feature.size === 'large' ? 'md:col-span-2 md:row-span-2' : ''
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className={`p-5 ${feature.size === 'large' ? 'md:p-6' : ''}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-xl ${colors.bg}`}>
            <feature.icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white font-display tracking-tight">{feature.title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{feature.description}</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
        </div>
        
        <div className={`rounded-xl bg-zinc-900/60 border border-white/[0.04] overflow-hidden ${
          feature.size === 'large' ? 'h-[280px]' : 'h-[160px]'
        }`}>
          <Preview />
        </div>
      </div>
    </motion.div>
  );
};

export const BentoFeatures = () => {
  const ref = useRef(null);
  
  return (
    <section ref={ref} className="relative py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_50%)]" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <SectionTitle
          badge="Features"
          title="Everything you need to run your agency"
          description="A complete toolkit designed for modern agencies, from project kickoff to final invoice."
        />
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
