import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Navigation: React.FC = () => {
  const { user, getSDK, setToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const sdk = getSDK();
      await sdk.authentication.postAuthLogout();
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      const errorMessage = error?.body?.error || 'Logout failed. Please try again later.';
      
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: errorMessage,
      });
    } finally {
      // Always clear localStorage and context state, even if API call fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Clear context state
      setToken(null);
      
      // Navigate to home page
      navigate('/');
    }
  };

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-card border-b border-border shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-foreground">SecureApp</h1>
            </div>
            
            <div className="flex space-x-4">
              <Link to="/profile">
                <Button
                  variant={isActive('/profile') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Button>
              </Link>
              
              {user.role === 'admin' && (
                <Link to="/admin">
                  <Button
                    variant={isActive('/admin') ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium text-foreground">{user.username}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};