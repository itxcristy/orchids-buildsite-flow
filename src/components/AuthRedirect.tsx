import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getApiBaseUrl } from '@/config/api';

export function AuthRedirect() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);

  useEffect(() => {
    // Reset redirection flag when user logs out
    if (!user) {
      setHasRedirected(false);
      setSetupChecked(false);
    }
  }, [user]);

  useEffect(() => {
    // Check setup status for new agency admins
    const checkSetupStatus = async () => {
      if (user && userRole === 'admin' && !setupChecked && location.pathname === '/auth') {
        try {
          const agencyDatabase = localStorage.getItem('agency_database');
          if (!agencyDatabase) {
            // No agency database, go to dashboard
            setHasRedirected(true);
            navigate('/dashboard');
            return;
          }

          const apiBaseUrl = getApiBaseUrl();
          
          const response = await fetch(`${apiBaseUrl}/api/agencies/check-setup`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            setSetupChecked(true);
            setHasRedirected(true);
            
            if (!result.setupComplete) {
              // Setup not complete, redirect to setup progress page (better UI)
              navigate('/agency-setup-progress');
            } else {
              // Setup complete, go to dashboard
              navigate('/dashboard');
            }
          } else {
            // If check fails, assume setup needed - redirect to progress page
            setSetupChecked(true);
            setHasRedirected(true);
            navigate('/agency-setup-progress');
          }
        } catch (error) {
          console.error('Error checking setup status:', error);
          // On error, assume setup needed - redirect to progress page
          setSetupChecked(true);
          setHasRedirected(true);
          navigate('/agency-setup-progress');
        }
      }
    };

    checkSetupStatus();
  }, [user, userRole, loading, setupChecked, location.pathname, navigate]);

  useEffect(() => {
    // Super admin redirects - highest priority
    if (user && userRole === 'super_admin' && !loading) {
      if (location.pathname === '/auth' || location.pathname === '/dashboard' || 
          location.pathname === '/agency-setup-progress' || location.pathname === '/agency-setup') {
        setHasRedirected(true);
        navigate('/system', { replace: true });
        return;
      }
    }
    
    // Only redirect if user is authenticated, role is determined, not loading, 
    // haven't redirected yet, and currently on auth page
    // Skip for admin users (handled by setup check above) and super admins (handled above)
    if (user && userRole && !loading && !hasRedirected && location.pathname === '/auth' && 
        userRole !== 'admin' && userRole !== 'super_admin') {
      setHasRedirected(true);
      navigate('/dashboard', { replace: true });
    }
  }, [user, userRole, loading, hasRedirected, location.pathname, navigate]);

  // This component doesn't render anything
  return null;
}