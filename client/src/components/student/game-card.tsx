import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Users, 
  CalendarDays,
  Puzzle,
  Image as ImageIcon, 
  FileText, 
  ClipboardCheck,
  FileSpreadsheet, 
  CheckSquare,
  Trophy
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import LeaderboardModal from "./leaderboard-modal";

interface GameLobby {
  id: number;
  name: string;
  description?: string;
  gameType: string;
  lobbyCode: string;
  status: string;
  createdAt: string;
  participantCount?: number;
}

interface GameCardProps {
  lobby: GameLobby;
  viewType?: 'grid' | 'list';
}

export default function GameCard({ lobby, viewType = 'grid' }: GameCardProps) {
  const { translate } = useLanguage();
  const [, setLocation] = useLocation();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Function to get game icon based on game type
  const getGameIcon = () => {
    switch (lobby.gameType) {
      case 'picture_puzzle':
        return <Puzzle className="h-12 w-12" />;
      case 'picture_matching':
        return <ImageIcon className="h-12 w-12" />;
      case 'true_or_false':
        return <CheckSquare className="h-12 w-12" />;
      case 'explain_image':
        return <FileText className="h-12 w-12" />;
      case 'fill_blanks':
        return <FileSpreadsheet className="h-12 w-12" />;
      case 'arrange_timeline':
        return <Clock className="h-12 w-12" />;
      case 'tama_ang_ayos':
        return <ClipboardCheck className="h-12 w-12" />;
      default:
        return <FileText className="h-12 w-12" />;
    }
  };

  // Function to get game type display name
  const getGameTypeDisplay = () => {
    switch (lobby.gameType) {
      case 'picture_puzzle':
        return "Puzzle ng Larawan";
      case 'picture_matching':
        return "Paghahanap ng Pares";
      case 'true_or_false':
        return "Tama o Mali";
      case 'explain_image':
        return "Ipaliwanag ang Larawan";
      case 'fill_blanks':
        return "Punan ang Patlang";
      case 'arrange_timeline':
        return "Ayusin ang Timeline";
      case 'tama_ang_ayos':
        return "Tama ang Ayos";
      default:
        return lobby.gameType;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fil-PH', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePlay = () => {
    setLocation(`/game/${lobby.id}`);
  };

  // Open leaderboard
  const openLeaderboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLeaderboardOpen(true);
  };

  // Render content based on view type
  const renderContent = () => {
    if (viewType === 'grid') {
      return (
        <Card className="overflow-hidden border border-neutral-200 hover:border-primary hover:shadow-md transition-all">
          <div className="relative h-40 bg-neutral-100 flex items-center justify-center">
            <div className="w-24 h-24 text-primary bg-primary/10 rounded-full flex items-center justify-center">
              {getGameIcon()}
            </div>
          </div>
          
          <CardContent className="pt-4">
            <h3 className="text-lg font-bold">{lobby.name}</h3>
            <p className="text-sm text-neutral-500 mt-1">
              {getGameTypeDisplay()}
            </p>
            {lobby.description && (
              <p className="text-xs text-neutral-400 mt-2">{lobby.description}</p>
            )}

            <div className="flex items-center gap-2 mt-3">
              {lobby.participantCount !== undefined && (
                <div className="flex items-center text-xs text-neutral-500">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  <span>{lobby.participantCount} estudyante</span>
                </div>
              )}
              <div className="flex items-center text-xs text-neutral-500">
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                <span>{formatDate(lobby.createdAt)}</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-0 pb-4 flex flex-col gap-2">
            <Button 
              className="w-full"
              variant="default"
              onClick={handlePlay}
            >
              Pumasok sa Laro
            </Button>
            <Button
              className="w-full flex items-center justify-center gap-1"
              variant="outline"
              onClick={openLeaderboard}
            >
              <Trophy className="h-4 w-4" />
              <span>Leaderboard</span>
            </Button>
          </CardFooter>
        </Card>
      );
    } else {
      // List view
      return (
        <Card className="overflow-hidden border border-neutral-200 hover:border-primary hover:shadow-sm transition-all">
          <div className="flex flex-col sm:flex-row">
            <div className="p-4 flex-grow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  {getGameIcon()}
                </div>
                
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium">{lobby.name}</h3>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {getGameTypeDisplay()}
                    </Badge>
                  </div>
                  
                  {lobby.description && (
                    <p className="text-sm text-muted-foreground">{lobby.description}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-end gap-4 sm:ml-auto sm:border-l">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {lobby.participantCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{lobby.participantCount}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formatDate(lobby.createdAt)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={openLeaderboard}
                >
                  <Trophy className="h-4 w-4" />
                </Button>
                <Button onClick={handlePlay}>
                  Pumasok
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }
  };

  return (
    <>
      {renderContent()}
      
      {/* Leaderboard Modal - Single instance outside of conditional rendering */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        lobbyId={lobby.id}
        gameType={lobby.gameType}
      />
    </>
  );
}