import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  isVisible?: boolean;
}

export function FadeIn({ 
  children, 
  className, 
  delay = 0, 
  duration = 500, 
  isVisible = true 
}: AnimatedProps) {
  return (
    <div
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {children}
    </div>
  );
}

export function FadeInScale({ 
  children, 
  className, 
  delay = 0, 
  duration = 500, 
  isVisible = true 
}: AnimatedProps) {
  return (
    <div
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.97)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {children}
    </div>
  );
}

export function SlideInLeft({ 
  children, 
  className, 
  delay = 0, 
  duration = 500, 
  isVisible = true 
}: AnimatedProps) {
  return (
    <div
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {children}
    </div>
  );
}

export function BlurIn({ 
  children, 
  className, 
  delay = 0, 
  duration = 600, 
  isVisible = true 
}: AnimatedProps) {
  return (
    <div
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(4px)',
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ 
  children, 
  className, 
  delay = 0, 
  duration = 400, 
  isVisible = true 
}: AnimatedProps) {
  return (
    <div
      className={cn('transition-all', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.9)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({ 
  children, 
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
