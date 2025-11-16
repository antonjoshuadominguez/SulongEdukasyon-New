import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "@/lib/translations";
import { Loader2, Trophy, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define interfaces for API responses
interface LobbyData {
  id: number;
  name: string;
  description?: string;
  gameType: string;
  status: string;
  teacherId: number;
}

interface UserData {
  id: number;
  username: string;
  fullName?: string;
  role: string;
}

interface ScoreData {
  id: number;
  userId: number;
  lobbyId: number;
  gameType: string;
  score: number;
  completionTime: number;
  moveCount?: number;
  createdAt: string;
  user?: UserData;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobbyId: number;
}

// Function to determine if a game type is time-based
const isTimeBased = (gameType: string): boolean => {
  // Games where time matters for scoring or gameplay
  const timeBasedGames = [
    'picture_puzzle',
    'picture_matching'
  ];
  return timeBasedGames.includes(gameType);
};

export default function LeaderboardModal({ isOpen, onClose, lobbyId }: LeaderboardModalProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch the lobby details to get the game type
  const { data: lobby, isLoading: isLoadingLobby } = useQuery<LobbyData>({
    queryKey: [`/api/lobbies/${lobbyId}`],
    enabled: isOpen && !!lobbyId
  });
  
  // Fetch scores for this specific lobby
  const { data: scores, isLoading: isLoadingScores } = useQuery<ScoreData[]>({
    queryKey: [`/api/teacher/lobbies/${lobbyId}/scores`],
    enabled: isOpen && !!lobbyId
  });
  
  // Delete score mutation
  const deleteScoreMutation = useMutation({
    mutationFn: async (scoreId: number) => {
      return apiRequest("DELETE", `/api/scores/${scoreId}`);
    },
    onSuccess: () => {
      toast({
        title: "Score deleted",
        description: "The score has been removed from the leaderboard",
        variant: "default"
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/lobbies/${lobbyId}/scores`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete score. Please try again.",
        variant: "destructive"
      });
      console.error("Error deleting score:", error);
    }
  });

  const handleDeleteScore = (scoreId: number) => {
    setScoreToDelete(scoreId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scoreToDelete) {
      deleteScoreMutation.mutate(scoreToDelete);
      setIsDeleteDialogOpen(false);
      setScoreToDelete(null);
    }
  };
  
  const isLoading = isLoadingLobby || isLoadingScores;
  
  // Function to format time in readable format
  const formatTimeElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Function to get maximum score for each game type
  const getMaxScoreForGameType = (gameType: string): string => {
    switch (gameType) {
      case 'picture_puzzle':
        return '10000';
      case 'picture_matching':
        return '5000';
      case 'true_or_false':
        return '10';
      case 'arrange_timeline':
        return '5';
      case 'explain_image':
        return '100';
      case 'fill_blanks':
        return '10';
      case 'tama_ang_ayos':
        return '10';
      default:
        return '100';
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Game Leaderboard
            </DialogTitle>
            <DialogDescription>
              {lobby?.name || "Loading game details..."}
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scores && scores.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableCaption>Game scores ranked by points</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      {/* Only show time column for time-based games */}
                      {isTimeBased(lobby?.gameType || "") && (
                        <TableHead className="text-right">Time</TableHead>
                      )}
                      <TableHead className="w-16 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...scores].sort((a, b) => b.score - a.score).map((score, index: number) => (
                      <TableRow key={score.id} className={index < 3 ? "font-medium" : ""}>
                        <TableCell className="font-bold">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {score.user?.fullName || score.user?.username || "Unknown Player"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {/* Display score without fractions */}
                          {score.score.toLocaleString()}
                        </TableCell>
                        {/* Only show time for time-based games */}
                        {isTimeBased(lobby?.gameType || "") && (
                          <TableCell className="text-right">
                            {formatTimeElapsed(score.completionTime)}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteScore(score.id)}
                            title="Delete this score"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Scores Yet
              </h3>
              <p className="text-muted-foreground">
                Students haven't completed this game yet. Scores will appear here as they finish.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Score Deletion */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Score</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this score? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScoreToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}