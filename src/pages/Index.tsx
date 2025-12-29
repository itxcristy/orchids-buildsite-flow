import { useAuth } from '@/hooks/useAuth';
import { RoleDashboard } from '@/components/dashboards/RoleDashboard';
import { AppRole } from '@/utils/roleUtils';

const Index = () => {
  const { userRole } = useAuth();
  
  // Use role-specific dashboard
  const role = (userRole as AppRole) || 'employee';
  
  return <RoleDashboard role={role} />;
};

export default Index;
