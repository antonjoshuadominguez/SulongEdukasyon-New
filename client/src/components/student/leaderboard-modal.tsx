import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyId: number;
  gameType: string;
}

export default function LeaderboardModal({ isOpen, onClose, lobbyId, gameType }: LeaderboardModalProps) {
  const { translate } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("lobby");
  
  // Fetch lobby-specific scores
  const { 
    data: lobbyScores, 
    isLoading: isLoadingLobbyScores 
  } = useQuery<any[]>({
    queryKey: [`/api/student/lobbies/${lobbyId}/scores`],
    enabled: isOpen && activeTab === "lobby",
  });
  
  // Fetch global leaderboard for the game type
  const {
    data: globalScores,
    isLoading: isLoadingGlobalScores
  } = useQuery<any[]>({
    queryKey: [`/api/leaderboard/${gameType}`],
    enabled: isOpen && activeTab === "global",
  });
  
  const isLoading = (activeTab === "lobby" && isLoadingLobbyScores) || 
                   (activeTab === "global" && isLoadingGlobalScores);
  
  const scores = activeTab === "lobby" ? lobbyScores : globalScores;
  
  // Function to determine if a game type is time-based
  const isTimeBased = (gameType?: string): boolean => {
    if (!gameType) return false;
    // Games where time matters for scoring or gameplay
    const timeBasedGames = [
      'picture_puzzle',
      'picture_matching'
    ];
    return timeBasedGames.includes(gameType);
  };
  
  // Function to format time in readable format
  const formatTimeElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Function to render position-specific styles and icons
  const renderPosition = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-yellow-500 mr-1" />
            <span className="font-bold">1st</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center">
            <Medal className="h-5 w-5 text-gray-400 mr-1" />
            <span className="font-bold">2nd</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center">
            <Medal className="h-5 w-5 text-amber-700 mr-1" />
            <span className="font-bold">3rd</span>
          </div>
        );
      default:
        return <span>{position}th</span>;
    }
  };
  
  // Function to get row styling based on position
  const getRowStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-50 dark:bg-yellow-950/20 font-medium";
      case 2:
        return "bg-gray-50 dark:bg-gray-900/30 font-medium";
      case 3:
        return "bg-amber-50 dark:bg-amber-950/20 font-medium";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {translate("Leaderboard")}
          </DialogTitle>
          <DialogDescription>
            {translate("View the top scores for this game")}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="lobby" className="flex-1">{translate("This Session")}</TabsTrigger>
            <TabsTrigger value="global" className="flex-1">{translate("All-Time")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lobby">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : scores && scores.length > 0 ? (
              <Table>
                <TableCaption>
                  {translate("Scores from current game session")}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>{translate("Student")}</TableHead>
                    <TableHead className="text-right">{translate("Score")}</TableHead>
                    {isTimeBased(gameType as string) && (
                      <TableHead className="text-right">{translate("Time")}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score, index) => (
                    <TableRow 
                      key={score.id} 
                      className={cn(getRowStyle(index + 1))}
                    >
                      <TableCell>{renderPosition(index + 1)}</TableCell>
                      <TableCell>
                        {score.user?.fullName || score.user?.username || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {score.score.toLocaleString()}
                      </TableCell>
                      {isTimeBased(gameType as string) && (
                        <TableCell className="text-right">
                          {score.completionTime ? formatTimeElapsed(score.completionTime) : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {translate("No scores available yet")}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="global">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : scores && scores.length > 0 ? (
              <Table>
                <TableCaption>
                  {translate("Top scores across all game sessions")}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>{translate("Student")}</TableHead>
                    <TableHead className="text-right">{translate("Score")}</TableHead>
                    {isTimeBased(gameType as string) && (
                      <TableHead className="text-right">{translate("Time")}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score, index) => (
                    <TableRow 
                      key={score.id} 
                      className={cn(getRowStyle(index + 1))}
                    >
                      <TableCell>{renderPosition(index + 1)}</TableCell>
                      <TableCell>
                        {score.user?.fullName || score.user?.username || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {score.score.toLocaleString()}
                      </TableCell>
                      {isTimeBased(gameType as string) && (
                        <TableCell className="text-right">
                          {score.completionTime ? formatTimeElapsed(score.completionTime) : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {translate("No scores available yet")}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}