import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { GlowOrb } from '../fragments';

export const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 lg:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950" />
      
      <GlowOrb color="blue" size="2xl" position={{ top: '20%', left: '10%' }} blur="3xl" />
      <GlowOrb color="emerald" size="xl" position={{ bottom: '20%', right: '10%' }} blur="3xl" />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-zinc-400 mb-6">
            <Zap className="w-3 h-3 text-yellow-400" />
            Start your free trial today
          </span>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold text-white tracking-tight leading-tight"
        >
          Ready to transform how
          <br />
          <span className="text-zinc-500">your agency operates?</span>
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto"
        >
          Join 500+ agencies already using Drena to streamline operations, delight clients, and grow faster.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
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
          
          <Link to="/contact">
            <Button 
              size="lg" 
              variant="outline"
              className="group border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.2] text-white font-medium px-8 h-12 text-base rounded-xl transition-all duration-300"
            >
              Talk to Sales
            </Button>
          </Link>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-10 flex items-center justify-center gap-8 flex-wrap"
        >
          {[
            { icon: Clock, text: '14-day free trial' },
            { icon: Shield, text: 'No credit card required' },
            { icon: Zap, text: 'Setup in 5 minutes' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">
              <item.icon className="w-4 h-4 text-zinc-600" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-16 p-6 rounded-2xl bg-zinc-900/50 border border-white/[0.06] inline-flex items-center gap-6"
        >
          <div className="flex -space-x-3">
            {['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500'].map((color, i) => (
              <div 
                key={i}
                className={`w-10 h-10 rounded-full ${color} ring-2 ring-zinc-900 flex items-center justify-center text-xs font-medium text-white`}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-zinc-800 ring-2 ring-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-400">
              +96
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-white font-medium">Join this month's cohort</div>
            <div className="text-xs text-zinc-500 mt-0.5">100+ agencies signed up in the last 30 days</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
