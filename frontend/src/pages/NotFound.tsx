import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center noise-overlay">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-[hsl(175_100%_50%)] rounded-full blur-[200px] opacity-10 animate-float" />
        <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-[hsl(260_60%_50%)] rounded-full blur-[200px] opacity-10 animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="relative z-10 text-center px-4">
        <div className="glass-card p-12 max-w-md mx-auto">
          <div className="mb-8">
            <span className="text-8xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
              404
            </span>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Page not found
          </h1>
          
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Link to="/">
              <Button className="btn-glow">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
