import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Footer from '@/components/Footer';

interface DashboardLayoutProps {
  onLogout?: () => void;
}

const DashboardLayout = ({ onLogout }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'User Management', href: '/users', icon: UserCog },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img 
            src="/logo.png" 
            alt="Power Lift Fitness Gym Logo" 
            className="h-6 w-6 object-contain"
          />
          <h1 className="font-bold text-lg">Power Lift Fitness</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen items-stretch">
        {/* Sidebar */}
        <div className={cn(
          "lg:w-64 lg:flex-shrink-0 lg:block",
          // Mobile: fixed overlay; Desktop: sticky and stretches with content
          isSidebarOpen
            ? "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:static lg:inset-auto"
            : "hidden lg:block bg-card border-r border-border lg:sticky lg:top-0",
          "lg:self-stretch"
        )}>
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-border flex items-center justify-center">
              <div className="flex items-center space-x-3">
              
                <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Power Lift Fitness
                </h2>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActiveRoute(item.href) 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (onLogout) onLogout();
                  navigate('/auth/login', { replace: true });
                }}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-0 min-h-screen flex flex-col">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;