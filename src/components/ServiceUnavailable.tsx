/**
 * Service Unavailable / 404 Error Page
 * Shows friendly error page with early-man.gif when services are down
 * Full-screen layout matching backend design
 */

import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceUnavailableProps {
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function ServiceUnavailable({
  title = 'Service Temporarily Unavailable',
  description = 'Our servers are taking a quick break. The early man is working hard to get things back up and running!',
  showRetry = true,
  onRetry
}: ServiceUnavailableProps) {
  // useNavigate will work if component is inside Router, otherwise we'll use window.location
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    try {
      navigate('/');
    } catch {
      // Fallback if navigate fails (not in Router context)
      window.location.href = '/';
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full py-12">
        {/* Large animated GIF */}
        <div className="flex justify-center mb-1">
          <img 
            src="/early-man.gif" 
            alt="Early man working on connections" 
            className="w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] object-contain"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-center -mt-2">
          {title}
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 text-center max-w-2xl">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {showRetry && (
            <Button 
              onClick={handleRetry} 
              className="flex-1 h-12 text-base"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Button>
          )}
          <Button 
            onClick={handleGoHome} 
            variant="outline"
            className="flex-1 h-12 text-base"
            size="lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Footer message */}
        <p className="text-sm text-muted-foreground mt-8 text-center">
          If this problem persists, please contact support or try again in a few minutes.
        </p>
      </div>
    </div>
  );
}

