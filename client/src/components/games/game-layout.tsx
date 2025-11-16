import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Trophy,
  Clock,
  Users
} from "lucide-react";
import { t } from "@/lib/translations";
import StudentLeaderboardModal from "@/components/student/leaderboard-modal";

interface GameLayoutProps {
  children: ReactNode;
  lobby: {
    id: number;
    name: string;
    description?: string;
    lobbyCode: string;
    gameType: string;
    status: string;
    participantCount?: number;
  };
}

export default function GameLayout({ children, lobby }: GameLayoutProps) {
  const [, setLocation] = useLocation();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Format game type for display
  const formatGameType = (type: string) => {
    switch (type) {
      case 'picture_puzzle':
        return t('Picture Puzzle');
      case 'picture_matching':
        return t('Picture Matching');
      case 'arrange_timeline':
        return t('Arrange Timeline');
      case 'explain_image':
        return t('ExplainImage');
      case 'fill_blanks':
        return t('Fill Blanks');

      case 'tama_ang_ayos':
        return t('Tama ang Ayos');
      case 'true_or_false':
        return t('True or False');
      default:
        return type;
    }
  };

  // Handle back button
  const handleBack = () => {
    setLocation('/dashboard');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <Button 
            variant="ghost" 
            className="p-0 mb-2 hover:bg-transparent"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>{t("Back")} {t("Dashboard")}</span>
          </Button>
          <h1 className="text-3xl font-bold text-neutral-900">{lobby.name}</h1>
          <p className="text-neutral-500">{formatGameType(lobby.gameType)}</p>
        </div>
        
        <div className="flex space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center text-sm text-neutral-500">
            <Users className="h-5 w-5 mr-1" />
            <span>{lobby.participantCount || 0} {t("Students")}</span>
          </div>
          
          <div className="flex items-center text-sm text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
            <span className="font-medium">{t("Code")}: </span>
            <span className="ml-1 font-mono text-primary font-bold">{lobby.lobbyCode}</span>
          </div>
        </div>
      </div>

      {lobby.description && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <p className="text-neutral-600">{lobby.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Game content */}
      <div className="mb-6">
        {children}
      </div>
      
      {/* Leaderboard button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          onClick={() => setLeaderboardOpen(true)}
          className="rounded-full shadow-lg p-3 h-12 w-12"
        >
          <Trophy className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Leaderboard Modal */}
      <StudentLeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        lobbyId={lobby.id}
        gameType={lobby.gameType}
      />
    </div>
  );
}
