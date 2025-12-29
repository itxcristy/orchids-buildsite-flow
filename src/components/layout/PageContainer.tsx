import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div className={cn("space-y-8 p-4 sm:p-6 lg:p-8", className)}>
      {children}
    </div>
  );
};