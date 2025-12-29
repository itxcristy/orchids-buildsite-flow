import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, User } from 'lucide-react';
import { useViewAsUser } from '@/contexts/ViewAsUserContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function ViewAsUserBanner() {
  const { viewingAs, exitViewAs } = useViewAsUser();
  const navigate = useNavigate();

  if (!viewingAs) return null;

  const handleExit = () => {
    exitViewAs();
    navigate('/dashboard');
  };

  const initials = viewingAs.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              Viewing as:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={viewingAs.avatar_url} alt={viewingAs.name} />
              <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {viewingAs.name}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">
                {viewingAs.email} • {viewingAs.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-amber-900 hover:text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/30"
        >
          <X className="h-4 w-4 mr-1" />
          Exit View As
        </Button>
      </div>
    </Alert>
  );
}

