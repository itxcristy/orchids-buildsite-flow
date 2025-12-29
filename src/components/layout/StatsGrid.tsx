import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsGridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export const StatsGrid = ({ 
  children, 
  className, 
  cols = 4 
}: StatsGridProps) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn("grid gap-4 lg:gap-6", gridCols[cols], className)}>
      {children}
    </div>
  );
};