import { useState } from "react";
import { useLocation } from "wouter";
import { MoreHorizontal, Copy, Users, Trophy, Settings, ExternalLink, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ManageLobbyModal from "./manage-lobby-modal";
import LeaderboardModal from "./leaderboard-modal";

interface LobbyCardProps {
  lobby: {
    id: number;
    name: string;
    description?: string;
    lobbyCode: string;
    gameType: string;
    status: string;
    createdAt: string;
    class?: string;
    participantCount?: number;
  };
}

export default function LobbyCard({ lobby }: LobbyCardProps) {
  const { translate, language } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const formatGameType = (type: string) => {
    switch (type) {
      case 'picture_puzzle':
        return 'Picture Puzzle';
      case 'picture_matching':
        return 'Picture Matching';
      case 'arrange_timeline':
        return 'Arrange Timeline';
      case 'explain_image':
        return 'Explain Image';
      case 'fill_blanks':
        return 'Fill Blanks';
      case 'tama_ang_ayos':
        return 'Tama ang Ayos';
      case 'true_or_false':
        return 'True or False';
      default:
        return type;
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobby.lobbyCode);
    toast({
      title: translate("Code copied"),
      description: translate("Lobby code copied to clipboard"),
    });
  };
  
  const handleStart = () => {
    window.location.href = `/game/${lobby.id}`;
    console.log("Navigating to game page:", `/game/${lobby.id}`);
  };
  
  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="mb-1 flex items-center">{lobby.name}</CardTitle>
              <CardDescription>
                {lobby.description || translate("No description provided")}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{translate("Actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsManageModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {translate("Manage")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsLeaderboardModalOpen(true)}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {translate("Leaderboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStart}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {translate("Go to game")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyCode}>
                  <Copy className="mr-2 h-4 w-4" />
                  {translate("Copy code")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
            <Badge variant="secondary">
              {translate(formatGameType(lobby.gameType))}
            </Badge>
            <Badge variant={lobby.status === 'active' ? 'default' : (lobby.status === 'completed' ? 'secondary' : 'outline')}>
              {translate(lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1))}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gamepad2 className="h-4 w-4" />
              <span>{translate("Code")}: <span className="font-medium">{lobby.lobbyCode}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {translate("Students")}: <span className="font-medium">{lobby.participantCount || 0}</span>
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {translate("Created")}: {formatDate(lobby.createdAt)}
            </div>
            <Button size="sm" onClick={handleStart}>
              {translate("Open Game")}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
      <ManageLobbyModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        lobbyId={lobby.id} 
      />
      
      <LeaderboardModal 
        isOpen={isLeaderboardModalOpen} 
        onClose={() => setIsLeaderboardModalOpen(false)} 
        lobbyId={lobby.id} 
      />
    </>
  );
}