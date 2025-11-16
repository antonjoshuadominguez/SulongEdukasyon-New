import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Home, Users, BarChart2, HelpCircle, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileModal from "@/components/profile/profile-modal";

export default function NavBar() {
  const { user, logoutMutation } = useAuth();
  const { translate } = useLanguage();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="ml-2 font-bold text-xl text-primary">SulongEdukasyon</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <Link href="/" className={`flex items-center px-3 py-2 text-sm font-medium ${isActive('/') ? 'text-primary' : 'text-neutral-500 hover:text-primary'}`}>
                <Home className="h-5 w-5 mr-1" />
                <span>Dashboard</span>
              </Link>
              
              {user.role === 'teacher' && (
                <Link href="/class" className={`flex items-center px-3 py-2 text-sm font-medium ${isActive('/class') ? 'text-primary' : 'text-neutral-500 hover:text-primary'}`}>
                  <Users className="h-5 w-5 mr-1" />
                  <span>My Class</span>
                </Link>
              )}
              
              <Link href="/stats" className={`flex items-center px-3 py-2 text-sm font-medium ${isActive('/stats') ? 'text-primary' : 'text-neutral-500 hover:text-primary'}`}>
                <BarChart2 className="h-5 w-5 mr-1" />
                <span>Statistics</span>
              </Link>
              
              <Link href="/help" className={`flex items-center px-3 py-2 text-sm font-medium ${isActive('/help') ? 'text-primary' : 'text-neutral-500 hover:text-primary'}`}>
                <HelpCircle className="h-5 w-5 mr-1" />
                <span>Help Center</span>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="hidden md:flex items-center">
              {/* User profile section */}
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-light text-white">
                  {user.role === 'teacher' ? translate("teacher") : translate("student")}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user.fullName} />
                        <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-neutral-500">{user.username}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.class && (
                      <DropdownMenuItem className="text-sm" disabled>
                        {translate("class_name")}: {user.class}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <ProfileModal 
                      trigger={
                        <DropdownMenuItem className="text-sm cursor-pointer" onSelect={(e) => e.preventDefault()}>
                          <UserCog className="mr-2 h-4 w-4" /> {translate("profile_settings")}
                        </DropdownMenuItem>
                      }
                      onClose={() => {}}
                    />
                    <DropdownMenuItem className="text-sm cursor-pointer" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> {translate("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Helper function to get initials from name
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
