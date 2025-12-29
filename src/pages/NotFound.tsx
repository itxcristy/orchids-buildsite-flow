import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <ServiceUnavailable
      title="404 - Page Not Found"
      description="Oops! The page you're looking for doesn't exist. The early man is confused too!"
      showRetry={false}
    />
  );
};

export default NotFound;
