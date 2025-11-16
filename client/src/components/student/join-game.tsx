import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function JoinGame() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lobbyCode, setLobbyCode] = useState("");
  const [isValidCode, setIsValidCode] = useState(true);

  // Join game mutation
  const joinGameMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/lobbies/join-by-code", { code });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "You've joined the game lobby",
      });
      
      // Navigate to the game page
      if (data.lobbyId) {
        setLocation(`/game/${data.lobbyId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join game",
        description: error.message,
        variant: "destructive",
      });
      setIsValidCode(false);
    },
  });

  // Handle lobby code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLobbyCode(e.target.value);
    setIsValidCode(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lobbyCode.trim()) {
      setIsValidCode(false);
      return;
    }
    
    joinGameMutation.mutate(lobbyCode.trim());
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">Join a Game</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="gameCode" className="block text-sm font-medium text-neutral-500 mb-1">
              Game Lobby Code
            </label>
            <Input
              type="text"
              id="gameCode"
              value={lobbyCode}
              onChange={handleCodeChange}
              placeholder="Enter code (e.g., PUZ-123)"
              className={!isValidCode ? "border-red-500" : ""}
            />
            {!isValidCode && (
              <p className="mt-1 text-xs text-red-500">
                Please enter a valid lobby code
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={joinGameMutation.isPending}
          >
            {joinGameMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Game"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
