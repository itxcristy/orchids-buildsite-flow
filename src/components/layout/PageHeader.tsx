import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ 
  title, 
  description, 
  actions, 
  className 
}: PageHeaderProps) => {
  return (
    <div className={cn(
      "flex flex-col gap-4 mb-6",
      "lg:flex-row lg:items-start lg:justify-between lg:gap-6",
      className
    )}>
      <div className="space-y-1.5 min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-normal">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};