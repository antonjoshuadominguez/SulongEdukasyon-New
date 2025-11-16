import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  LogOut,
  User,
  Globe,
  Trophy
} from "lucide-react";
import ProfileModal from "@/components/profile/profile-modal";
import SidebarRecentLobbies from "@/components/sidebar-recent-lobbies";

import { useState } from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider
} from "@/components/ui/sidebar";

export default function SidebarNavigation() {
  const { user, logoutMutation } = useAuth();
  const { translate } = useLanguage();
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  if (!user) return null;

  const getInitials = (name: string): string => {
    const names = name.split(' ');
    return names.length > 1
      ? (names[0][0] + names[1][0]).toUpperCase()
      : names[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="px-2 py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                SE
              </div>
              <div className="font-bold text-xl text-neutral-900">SulongEdukasyon</div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/dashboard">
                  <SidebarMenuButton className={isActive("/dashboard") ? "bg-primary/10 text-primary" : ""}>
                    <Home className="mr-2 h-5 w-5" />
                    <span>{translate("Dashboard")}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarRecentLobbies />
              

            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="space-y-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setProfileOpen(true)}
                  className="hover:bg-neutral-100"
                >
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-primary text-white">
                      {user.fullName ? getInitials(user.fullName) : user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user.fullName || user.username}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout} 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>{translate("logout")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              

            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>

      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}