import React from 'react';
import { Loader2, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'refresh' | 'network';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  text,
  className,
  fullScreen = false
}) => {
  const renderSpinner = () => {
    const spinnerClass = cn(sizeClasses[size], 'animate-spin', className);

    switch (variant) {
      case 'refresh':
        return <RefreshCw className={spinnerClass} />;
      case 'network':
        return <Wifi className={spinnerClass} />;
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-current',
                  size === 'sm' ? 'w-1 h-1' : 
                  size === 'md' ? 'w-2 h-2' :
                  size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className={cn(spinnerClass, 'rounded-full bg-current')} />
        );
      default:
        return <Loader2 className={spinnerClass} />;
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="text-muted-foreground">
        {renderSpinner()}
      </div>
      {text && (
        <p className={cn(
          'text-muted-foreground font-medium',
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-background p-6 rounded-lg shadow-lg border">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Specialized loading components for different use cases
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

export const InlineLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center space-x-2 p-2">
    <LoadingSpinner size="sm" />
    {text && <span className="text-sm text-muted-foreground">{text}</span>}
  </div>
);

export const ButtonLoader: React.FC = () => (
  <LoadingSpinner size="sm" className="mr-2" />
);

export const TableLoader: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="md" text="Loading data..." />
  </div>
);

export const NetworkLoader: React.FC<{ text?: string }> = ({ text = 'Connecting...' }) => (
  <LoadingSpinner variant="network" size="md" text={text} />
);