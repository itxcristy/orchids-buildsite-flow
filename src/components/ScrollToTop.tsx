import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that scrolls to top on route changes
 * This ensures pages always open at the top, not at the bottom
 */
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior
    });
    
    // Also try scrollIntoView as fallback
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [location.pathname]);

  return null;
}
