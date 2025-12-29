import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  href,
  onClick,
  className,
  icon,
  disabled = false,
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 relative overflow-hidden group';
  
  const variants = {
    primary: 'bg-white text-black hover:bg-[#e5e5e5] active:scale-[0.98]',
    secondary: 'bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]',
    ghost: 'text-[#888] hover:text-white',
  };
  
  const sizes = {
    sm: 'text-[13px] px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-[14px] px-5 py-2.5 rounded-lg gap-2',
    lg: 'text-[15px] px-6 py-3.5 rounded-lg gap-2',
  };

  const styles = cn(baseStyles, variants[variant], sizes[size], disabled && 'opacity-50 cursor-not-allowed', className);

  if (href) {
    return (
      <Link to={href} className={styles}>
        {children}
        {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={styles}>
      {children}
      {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </button>
  );
}

export function Badge({ 
  children, 
  variant = 'default',
  className 
}: { 
  children: ReactNode; 
  variant?: 'default' | 'success' | 'warning';
  className?: string;
}) {
  const variants = {
    default: 'border-white/[0.1] bg-white/[0.03] text-[#888]',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px]',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] font-medium text-[#3b82f6] tracking-[0.1em] uppercase mb-4">
      {children}
    </p>
  );
}

interface SectionTitleProps {
  children?: ReactNode;
  className?: string;
  badge?: string;
  title?: string;
  description?: string;
}

export function SectionTitle({ children, className, badge, title, description }: SectionTitleProps) {
  if (badge || title || description) {
    return (
      <div className={cn('text-center', className)}>
        {badge && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-zinc-400 mb-4">
            {badge}
          </span>
        )}
        {title && (
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <h2 className={cn(
      'text-[32px] md:text-[44px] font-semibold tracking-[-0.03em] leading-tight',
      className
    )}>
      {children}
    </h2>
  );
}

export function SectionDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[17px] text-[#888] leading-relaxed', className)}>
      {children}
    </p>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('max-w-[1120px] mx-auto px-6', className)}>
      {children}
    </div>
  );
}

export function Section({ 
  id, 
  children, 
  className,
  dark = false,
}: { 
  id?: string; 
  children: ReactNode; 
  className?: string;
  dark?: boolean;
}) {
  return (
    <section 
      id={id} 
      className={cn(
        'py-24 md:py-32',
        dark && 'bg-[#050505]',
        className
      )}
    >
      {children}
    </section>
  );
}
