import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className, hover = true, glow = false }: CardProps) {
  return (
    <div className={cn(
      'relative rounded-2xl bg-[#0a0a0a] border border-white/[0.06] overflow-hidden',
      hover && 'transition-all duration-300 hover:border-white/[0.12]',
      glow && 'hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.3)]',
      className
    )}>
      {children}
    </div>
  );
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'relative rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] overflow-hidden',
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function FeatureCard({ 
  icon, 
  iconColor = 'blue',
  title, 
  description, 
  children,
  className,
  label,
}: { 
  icon: ReactNode;
  iconColor?: 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan';
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  const iconColors = {
    blue: 'bg-[#3b82f6]/10 text-[#3b82f6]',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  };

  return (
    <Card className={cn('p-6 md:p-8 group', className)}>
      <div className="flex items-start justify-between mb-6">
        <div className={cn('p-2.5 rounded-xl', iconColors[iconColor])}>
          {icon}
        </div>
        {label && (
          <span className="text-[11px] font-medium text-[#666] tracking-[0.05em] uppercase">
            {label}
          </span>
        )}
      </div>
      <h3 className="text-[18px] md:text-[20px] font-semibold tracking-[-0.02em] mb-2">{title}</h3>
      <p className="text-[14px] md:text-[15px] text-[#888] leading-relaxed">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </Card>
  );
}

export function StatCard({ 
  value, 
  label, 
  className 
}: { 
  value: string; 
  label: string; 
  className?: string;
}) {
  return (
    <div className={cn('text-center', className)}>
      <div className="text-[40px] md:text-[56px] font-semibold tracking-[-0.04em] text-white">
        {value}
      </div>
      <div className="text-[13px] md:text-[14px] text-[#666] tracking-[0.02em] uppercase mt-1">
        {label}
      </div>
    </div>
  );
}

export function TestimonialCard({
  quote,
  author,
  role,
  metric,
  className,
}: {
  quote: string;
  author: string;
  role: string;
  metric: string;
  className?: string;
}) {
  return (
    <Card className={cn('p-6 md:p-8', className)}>
      <p className="text-[15px] md:text-[16px] text-[#ccc] leading-relaxed mb-6">
        "{quote}"
      </p>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-medium text-white">{author}</div>
          <div className="text-[13px] text-[#666]">{role}</div>
        </div>
        <div className="text-[12px] font-medium text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded">
          {metric}
        </div>
      </div>
    </Card>
  );
}
