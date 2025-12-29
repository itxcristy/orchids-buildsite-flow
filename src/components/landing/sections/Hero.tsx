import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GridPattern, GlowOrb } from '../fragments';
import { Link } from 'react-router-dom';

const TextReveal = ({ children, delay = 0 }: { children: string; delay?: number }) => {
  const words = children.split(' ');
  
  return (
    <span className="inline">
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.08,
              ease: [0.25, 0.4, 0.25, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

const ShimmerBadge = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] overflow-hidden group"
  >
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <Sparkles className="w-4 h-4 text-emerald-400" />
    <span className="text-sm font-medium text-zinc-300">
      Trusted by 500+ agencies worldwide
    </span>
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
  </motion.div>
);

const DashboardPreview = () => (
  <motion.div
    initial={{ opacity: 0, y: 60, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
    className="relative mt-16 lg:mt-24"
  >
    <div className="absolute -inset-4 bg-gradient-to-b from-blue-500/20 via-transparent to-transparent rounded-3xl blur-3xl opacity-40" />
    
    <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-zinc-900/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-zinc-800/60 text-xs text-zinc-500 font-mono">
            app.drena.io/dashboard
          </div>
        </div>
      </div>
      
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          <motion.div 
            className="col-span-12 lg:col-span-8 rounded-xl bg-zinc-900/60 border border-white/[0.06] p-5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-400">Revenue Overview</span>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">+24.5%</span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {[40, 65, 45, 80, 55, 90, 70, 95, 85, 100, 75, 110].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-500/80 to-blue-400/40 rounded-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 1 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                />
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            className="col-span-12 lg:col-span-4 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="text-xs text-zinc-500 mb-1">Active Projects</div>
              <div className="text-2xl font-semibold text-white font-display tracking-tight">147</div>
              <div className="mt-2 flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 -ml-2 first:ml-0" />
                ))}
                <span className="ml-1 text-xs text-zinc-500 self-center">+12 more</span>
              </div>
            </div>
            
            <div className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
              <div className="text-xs text-zinc-500 mb-1">Team Performance</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '87%' }}
                    transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-sm font-medium text-emerald-400">87%</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="col-span-12 grid grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            {[
              { label: 'Total Revenue', value: '₹24.5L', change: '+18%' },
              { label: 'Active Clients', value: '89', change: '+12' },
              { label: 'Tasks Done', value: '1,247', change: '+156' },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl bg-zinc-900/60 border border-white/[0.06] p-4">
                <div className="text-xs text-zinc-500 mb-1">{stat.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-white font-display">{stat.value}</span>
                  <span className="text-xs text-emerald-400">{stat.change}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
    
    <motion.div
      className="absolute -right-4 top-1/4 px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-xl"
      initial={{ opacity: 0, x: 20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 1.4, duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-zinc-400">Live sync enabled</span>
      </div>
    </motion.div>
    
    <motion.div
      className="absolute -left-4 bottom-1/3 px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] shadow-xl"
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-blue-400" />
        </div>
        <span className="text-xs text-zinc-400">AI insights ready</span>
      </div>
    </motion.div>
  </motion.div>
);

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      <GridPattern />
      <GlowOrb color="blue" size="xl" position={{ top: '10%', left: '20%' }} blur="3xl" />
      <GlowOrb color="emerald" size="lg" position={{ bottom: '20%', right: '15%' }} blur="3xl" />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <ShimmerBadge />
        
        <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-semibold text-white leading-[1.1] tracking-[-0.02em]">
          <TextReveal delay={0.2}>The operating system for</TextReveal>
          <br />
          <span className="text-zinc-500">
            <TextReveal delay={0.6}>modern agencies</TextReveal>
          </span>
        </h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Manage projects, track finances, automate workflows, and scale your agency 
          with one powerful platform built for the way you work.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/auth">
            <Button 
              size="lg" 
              className="relative group bg-white text-zinc-900 hover:bg-zinc-100 font-medium px-8 h-12 text-base rounded-xl transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </Link>
          
          <Button 
            size="lg" 
            variant="outline"
            className="group border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.2] text-white font-medium px-8 h-12 text-base rounded-xl transition-all duration-300"
          >
            <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            Watch Demo
          </Button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6 text-sm text-zinc-500"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>No credit card required</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>14-day free trial</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Cancel anytime</span>
          </div>
        </motion.div>
        
        <DashboardPreview />
      </div>
    </section>
  );
};
