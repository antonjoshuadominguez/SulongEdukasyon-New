import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Gamepad, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Define interface for the game lobby data
interface GameLobby {
  id: number;
  name: string;
  description?: string;
  gameType: string;
  lobbyCode: string;
  status: string;
  createdAt: string;
}

export default function SidebarRecentLobbies() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const [showAllLobbies, setShowAllLobbies] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Query endpoint based on user role
  const endpoint = user?.role === 'teacher' 
    ? '/api/teacher/lobbies' 
    : '/api/lobbies/student';

  // Fetch lobbies
  const { data: lobbies = [], isLoading } = useQuery<GameLobby[]>({
    queryKey: [endpoint],
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  // Sort lobbies by creation date (newest first) and get the most recent 5
  const sortedLobbies = [...lobbies].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentLobbies = sortedLobbies.slice(0, 5);
  
  // Additional lobbies beyond the first 5
  const extraLobbies = sortedLobbies.slice(5);
  const hasMoreLobbies = extraLobbies.length > 0;
  
  // Number of additional lobbies to show (between 1 and 5)
  const additionalLobbiesToShow = Math.min(5, extraLobbies.length);
  const visibleExtraLobbies = extraLobbies.slice(0, additionalLobbiesToShow);

  // Get appropriate route for lobby
  const getLobbyRoute = (lobby: GameLobby) => {
    // Both teachers and students use the same game page route
    return `/game/${lobby.id}`;
  };

  // Format game type for display
  const formatGameType = (gameType: string) => {
    return gameType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user) {
    return null;
  }
  
  // Show skeleton loader while fetching data
  if (isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="flex justify-between items-center">
          <div className="flex items-center">
            <Gamepad className="mr-2 h-5 w-5" />
            <span>{translate("recent_lobbies")}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </SidebarMenuButton>
        <SidebarMenuSub>
          {Array(3).fill(0).map((_, i) => (
            <SidebarMenuSubItem key={i}>
              <div className="px-2 py-1">
                <Skeleton className="h-5 w-full" />
              </div>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={() => setExpanded(!expanded)}
        className="flex justify-between items-center"
      >
        <div className="flex items-center">
          <Gamepad className="mr-2 h-5 w-5" />
          <span>{translate("recent_lobbies")}</span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </SidebarMenuButton>
      
      {expanded && (
        <SidebarMenuSub>
          {/* Show first 5 recent lobbies */}
          {recentLobbies.length > 0 ? (
            recentLobbies.map(lobby => (
              <SidebarMenuSubItem key={lobby.id}>
                <Link href={getLobbyRoute(lobby)}>
                  <Button variant="ghost" className="w-full justify-start text-xs truncate px-2 h-8">
                    <span className="truncate">{lobby.name}</span>
                    <span className="text-xs text-muted-foreground ml-1 truncate">
                      ({formatGameType(lobby.gameType)})
                    </span>
                  </Button>
                </Link>
              </SidebarMenuSubItem>
            ))
          ) : (
            <SidebarMenuSubItem>
              <div className="text-sm text-muted-foreground px-2 py-1">
                {translate("no_recent_lobbies")}
              </div>
            </SidebarMenuSubItem>
          )}
          
          {/* Show "Show More" button if there are more than 5 lobbies */}
          {hasMoreLobbies && (
            <>
              {showAllLobbies && (
                <>
                  {visibleExtraLobbies.map(lobby => (
                    <SidebarMenuSubItem key={lobby.id}>
                      <Link href={getLobbyRoute(lobby)}>
                        <Button variant="ghost" className="w-full justify-start text-xs truncate px-2 h-8">
                          <span className="truncate">{lobby.name}</span>
                          <span className="text-xs text-muted-foreground ml-1 truncate">
                            ({formatGameType(lobby.gameType)})
                          </span>
                        </Button>
                      </Link>
                    </SidebarMenuSubItem>
                  ))}
                </>
              )}
              
              <SidebarMenuSubItem>
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-xs px-2 h-8"
                  onClick={() => setShowAllLobbies(!showAllLobbies)}
                >
                  {showAllLobbies ? translate("show_less") : translate("show_more")}
                </Button>
              </SidebarMenuSubItem>
            </>
          )}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}