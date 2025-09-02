
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <h1 className="text-6xl font-bold font-heading text-gray-900 dark:text-white mb-6">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Oops! The page you're looking for doesn't exist.</p>
          <Button asChild size="lg">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
