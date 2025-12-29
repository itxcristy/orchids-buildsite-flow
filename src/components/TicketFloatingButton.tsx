import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Loader2, AlertCircle, CheckCircle2, HelpCircle, Sparkles, X, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getConsoleLogger } from '@/utils/consoleLogger';
import { createPublicTicket } from '@/services/system-tickets';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ticket-button-visible';

export function TicketFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'error',
  });

  // Load visibility state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsVisible(saved === 'true');
    }
  }, []);

  // Update error counts periodically
  useEffect(() => {
    const updateCounts = () => {
      try {
        const logger = getConsoleLogger();
        setErrorCount(logger.getLogsByLevel('error').length);
        setWarningCount(logger.getLogsByLevel('warn').length);
      } catch (error) {
        // Silently handle errors
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem(STORAGE_KEY, String(newVisibility));
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both title and description',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const logger = getConsoleLogger();
      const errorLogs = includeLogs ? logger.getErrorLogs(50) : [];
      const browserInfo = logger.getBrowserInfo();

      await createPublicTicket({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        console_logs: errorLogs.length > 0 ? errorLogs : undefined,
        browser_info: browserInfo,
        page_url: window.location.href,
        error_details: errorLogs.length > 0 ? {
          error_count: errorLogs.filter(l => l.level === 'error').length,
          warning_count: errorLogs.filter(l => l.level === 'warn').length,
          recent_errors: errorLogs.slice(-10),
        } : undefined,
      });

      toast({
        title: 'Success! 🎉',
        description: 'Your ticket has been created successfully. Our team will review it shortly.',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'error',
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = errorCount > 0 || warningCount > 0;
  const totalIssues = errorCount + warningCount;

  if (!isVisible) {
    // Show a small button to restore visibility
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={handleToggleVisibility}
          size="sm"
          className={cn(
            "rounded-full h-8 w-8 p-0 shadow-lg transition-all duration-300",
            "hover:scale-110 active:scale-95",
            "bg-gray-500 hover:bg-gray-600",
            "border border-white/20"
          )}
          aria-label="Show ticket button"
        >
          <ChevronUp className="h-4 w-4 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Button - Tiny Design */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="relative">
          {/* Pulse animation when errors detected */}
          {hasErrors && !isMinimized && (
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          )}
          
          {isMinimized ? (
            // Minimized state - small circle
            <Button
              onClick={handleMinimize}
              className={cn(
                "rounded-full h-10 w-10 p-0 shadow-lg transition-colors",
                "bg-primary hover:bg-primary/90",
                "text-primary-foreground",
                "border border-border"
              )}
              aria-label="Expand ticket button"
            >
              <ChevronUp className="h-4 w-4 text-white" />
              {hasErrors && (
                <Badge 
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]",
                    "bg-red-500 text-white font-bold",
                    "border border-white shadow-lg"
                  )}
                  variant="destructive"
                >
                  {totalIssues > 9 ? '9+' : totalIssues}
                </Badge>
              )}
            </Button>
          ) : (
            // Expanded state - main button
            <div className="relative group">
              <Button
                onClick={() => setIsOpen(true)}
                size="sm"
                className={cn(
                  "rounded-full h-10 w-10 p-0 shadow-lg transition-colors",
                  "bg-primary hover:bg-primary/90",
                  "text-primary-foreground",
                  "border border-border"
                )}
                aria-label="Report an issue or error"
              >
                {/* Icon */}
                <div className="flex items-center justify-center">
                  <HelpCircle className="h-5 w-5" strokeWidth={2.5} />
                </div>

                {/* Error Badge */}
                {hasErrors && (
                  <Badge 
                    className={cn(
                      "absolute -top-0.5 -right-0.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]",
                      "bg-red-500 hover:bg-red-600 text-white font-bold",
                      "border border-white shadow-lg",
                      "animate-bounce"
                    )}
                    variant="destructive"
                  >
                    {totalIssues > 9 ? '9+' : totalIssues}
                  </Badge>
                )}

                {/* Sparkle effect for attention */}
                {hasErrors && (
                  <Sparkles className="absolute top-0 right-0 h-2.5 w-2.5 text-yellow-300" />
                )}
              </Button>

              {/* Minimize button */}
              <Button
                onClick={handleMinimize}
                size="sm"
                className={cn(
                  "absolute -top-1 -left-1 h-5 w-5 p-0 rounded-full",
                  "bg-gray-600 hover:bg-gray-700 text-white",
                  "border border-white/30 shadow-md",
                  "opacity-0 group-hover:opacity-100 transition-opacity z-10"
                )}
                aria-label="Minimize"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>

              {/* Hide button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility();
                }}
                size="sm"
                className={cn(
                  "absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full",
                  "bg-red-500 hover:bg-red-600 text-white",
                  "border border-white/30 shadow-md",
                  "opacity-0 group-hover:opacity-100 transition-opacity z-10"
                )}
                aria-label="Hide ticket button"
              >
                <X className="h-3 w-3" />
              </Button>

              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block pointer-events-none z-20">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl whitespace-nowrap">
                  {hasErrors 
                    ? `⚠️ ${totalIssues} issue${totalIssues > 1 ? 's' : ''} detected` 
                    : 'Need help? Report an issue'}
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Creation Dialog - Improved Design */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="bg-card border-b border-border p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2">
                Found a bug or error? Let us know! We'll investigate and get back to you.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Error Summary Card */}
            {hasErrors && includeLogs && (
              <div className="p-4 bg-warning-light border border-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      Issues Detected
                    </div>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Errors:</span>
                        <Badge variant="destructive" className="text-xs">{errorCount}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Warnings:</span>
                        <Badge variant="outline" className="text-xs bg-yellow-100">{warningCount}</Badge>
                      </div>
                      <div className="mt-2 text-xs italic">
                        These will be automatically included in your ticket to help us debug faster.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-2">
              <Label htmlFor="ticket-title" className="text-base font-semibold">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ticket-title"
                placeholder="Brief description of the issue (e.g., 'Login button not working')"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-description" className="text-base font-semibold">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="ticket-description"
                placeholder="Please describe the issue in detail. What were you trying to do? What happened instead? Any error messages you saw?"
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-priority" className="text-base font-semibold">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="ticket-priority" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        High
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-category" className="text-base font-semibold">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, category: value }))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="ticket-category" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">🐛 Error/Bug</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="ui">🎨 UI/UX Issue</SelectItem>
                    <SelectItem value="performance">⚡ Performance</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Include Logs Checkbox */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="include-logs"
                  checked={includeLogs}
                  onCheckedChange={(checked) => setIncludeLogs(checked === true)}
                  disabled={isSubmitting || !hasErrors}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="include-logs" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Include console logs and error details
                  </Label>
                  {hasErrors && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalIssues} error{totalIssues > 1 ? 's' : ''} and warning{totalIssues > 1 ? 's' : ''} will be included
                    </p>
                  )}
                  {!hasErrors && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No errors detected. You can still include logs if needed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {includeLogs && hasErrors && (
              <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    This will include recent console errors and warnings, browser information, 
                    and the current page URL to help us debug the issue faster.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Actions */}
          <div className="flex justify-end gap-3 p-6 border-t bg-muted/30">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Ticket
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
