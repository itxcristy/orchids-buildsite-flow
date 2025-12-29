/**
 * User Selector Component
 * Allows selecting users for direct messages and team chats
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, User } from 'lucide-react';
import { selectRecords } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email?: string;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface UserSelectorProps {
  onSelect: (userId: string, userName: string) => void;
  onCancel: () => void;
  multiSelect?: boolean;
  selectedUserIds?: string[];
  excludeUserIds?: string[];
  showDepartments?: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  onSelect,
  onCancel,
  multiSelect = false,
  selectedUserIds = [],
  excludeUserIds = [],
  showDepartments = true,
}) => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const id = await getAgencyId(profile, user?.id);
        setAgencyId(id);
        
        if (!id) {
          setLoading(false);
          return;
        }

        // Fetch all active profiles in the agency
        const profiles = await selectRecords<UserProfile>('profiles', {
          filters: [
            { column: 'agency_id', operator: 'eq', value: id },
            { column: 'is_active', operator: 'eq', value: true },
          ],
        });

        // Filter out current user and excluded users
        const filtered = profiles.filter(
          (p) => p.user_id !== user?.id && !excludeUserIds.includes(p.user_id)
        );

        setUsers(filtered);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadUsers();
    }
  }, [user?.id, profile?.agency_id]);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower) ||
      user.position?.toLowerCase().includes(searchLower)
    );
  });

  // Group users by department
  const groupedUsers = showDepartments
    ? filteredUsers.reduce((acc, user) => {
        const dept = user.department || 'No Department';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(user);
        return acc;
      }, {} as Record<string, UserProfile[]>)
    : { 'All Users': filteredUsers };

  const handleUserClick = (userId: string, userName: string) => {
    if (multiSelect) {
      // Toggle selection for multi-select
      if (selectedUserIds.includes(userId)) {
        // Deselect - remove from selection
        // Note: This requires parent to handle deselection
        // For now, we'll just call onSelect and let parent handle it
        return;
      }
      // Add to selection
      onSelect(userId, userName);
    } else {
      // Single select - immediately select
      onSelect(userId, userName);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading users...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">
            {multiSelect ? 'Select Team Members' : 'Select User'}
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {Object.entries(groupedUsers).map(([department, deptUsers]) => (
            <div key={department}>
              {showDepartments && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                  {department}
                </h4>
              )}
              <div className="space-y-1">
                {deptUsers.map((userProfile) => {
                  const isSelected = selectedUserIds.includes(userProfile.user_id);
                  return (
                    <button
                      key={userProfile.user_id}
                      type="button"
                      onClick={() =>
                        handleUserClick(
                          userProfile.user_id,
                          userProfile.full_name || 'Unknown User'
                        )
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className={`h-8 w-8 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                        <AvatarImage src={userProfile.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(userProfile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {userProfile.full_name || 'Unknown User'}
                        </div>
                        {userProfile.position && (
                          <div
                            className={`text-xs truncate ${
                              isSelected
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {userProfile.position}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Badge variant="secondary" className="shrink-0">
                          ✓
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchTerm ? 'No users found' : 'No users available'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
