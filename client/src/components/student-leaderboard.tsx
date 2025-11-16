import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentLeaderboardProps {
  lobbyId?: number;
  gameType?: "picture_puzzle" | "picture_matching" | "true_or_false" | "explain_image" | "fill_blanks" | "arrange_timeline" | "tama_ang_ayos";
  limit?: number;
}

export default function StudentLeaderboard({ lobbyId, gameType, limit = 10 }: StudentLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<string>(lobbyId ? "lobby" : "global");
  
  // Fetch lobby-specific scores if lobbyId is provided
  const { 
    data: lobbyScores, 
    isLoading: isLoadingLobbyScores 
  } = useQuery<any[]>({
    queryKey: [`/api/student/lobbies/${lobbyId}/scores`],
    enabled: !!lobbyId && activeTab === "lobby",
  });
  
  // Fetch global leaderboard for the game type
  const {
    data: globalScores,
    isLoading: isLoadingGlobalScores
  } = useQuery<any[]>({
    queryKey: [`/api/leaderboard/${gameType}`],
    enabled: !!gameType && activeTab === "global",
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
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>
          {activeTab === "lobby" 
            ? "Scores for this game session" 
            : "Top scores across all games"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lobbyId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="lobby" className="flex-1">This Session</TabsTrigger>
              <TabsTrigger value="global" className="flex-1">All-Time</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : scores && scores.length > 0 ? (
          <Table>
            <TableCaption>
              {activeTab === "lobby" 
                ? "Scores from current game session" 
                : `Top ${limit} scores for this game type`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Score</TableHead>
                {isTimeBased(gameType) && (
                  <TableHead className="text-right">Time</TableHead>
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
                  {isTimeBased(gameType) && (
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
            No scores available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}