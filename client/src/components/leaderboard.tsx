import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistance } from "date-fns";

interface LeaderboardProps {
  lobbyId?: number;
  gameType?: "picture_puzzle" | "picture_matching" | "true_or_false" | "explain_image" | "fill_blanks" | "arrange_timeline" | "tama_ang_ayos";
  limit?: number;
}

export default function Leaderboard({ lobbyId, gameType, limit = 10 }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<string>(lobbyId ? "lobby" : "global");
  
  // Fetch lobby-specific scores if lobbyId is provided
  const { 
    data: lobbyScores, 
    isLoading: isLoadingLobbyScores 
  } = useQuery<any[]>({
    queryKey: [`/api/teacher/lobbies/${lobbyId}/scores`],
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
                <TableHead className="w-12">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Score</TableHead>
                {isTimeBased(gameType) && (
                  <TableHead className="text-right">Time</TableHead>
                )}
                {isTimeBased(gameType) && (
                  <TableHead className="text-right">Moves</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score, index) => (
                <TableRow key={score.id} className={index < 3 ? "font-medium" : ""}>
                  <TableCell className="font-bold">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    {score.user?.fullName || score.user?.username || "Unknown Player"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {score.score.toLocaleString()} {score.maxScore ? `/ ${score.maxScore.toLocaleString()}` : ''}
                  </TableCell>
                  {isTimeBased(gameType) && (
                    <TableCell className="text-right">
                      {formatTimeElapsed(score.completionTime)}
                    </TableCell>
                  )}
                  {isTimeBased(gameType) && (
                    <TableCell className="text-right">
                      {score.moveCount || "-"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No scores recorded yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}