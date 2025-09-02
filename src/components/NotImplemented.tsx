
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface NotImplementedProps {
  pageName: string;
}

const NotImplemented = ({ pageName }: NotImplementedProps) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
        {pageName} Page
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        This page is being developed and will be implemented in the next iteration.
      </p>
      <Button asChild>
        <Link to="/">Return to Home</Link>
      </Button>
    </div>
  );
};

export default NotImplemented;
