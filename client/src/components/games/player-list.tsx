import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, Users, Timer, Lock, Unlock } from "lucide-react";

type Participant = {
  id: number;
  lobbyId: number;
  userId: number;
  isReady: boolean | null;
  subLobbyId?: string | null;
  username?: string;
  fullName?: string;
  joinedAt?: Date;
};

interface PlayerListProps {
  participants: Participant[];
  allReady: boolean;
  lobbyFull: boolean;
  participantCount: number;
  userId: number;
  isReady: boolean; 
  setReady: (isReady: boolean) => void;
  isPending: boolean;
  gameType: "picture_puzzle" | "picture_matching" | "arrange_timeline" | "true_or_false" | "explain_image" | "fill_blanks" | "tama_ang_ayos";
}

export function PlayerList({
  participants,
  allReady,
  lobbyFull,
  participantCount,
  userId,
  isReady,
  setReady,
  isPending,
  gameType
}: PlayerListProps) {
  // Find the current user in the participants list
  const currentUserParticipant = participants.find(p => p.userId === userId);
  
  // Set player limit (all games now use the same limit)
  const playerLimit = 30;
  const isPlayerLimitReached = participantCount >= playerLimit;
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Players ({participantCount}/{playerLimit})
          </span>
          {allReady && (
            <Badge variant="outline" className="bg-green-500 text-white border-green-600">
              <CircleCheck className="h-3 w-3 mr-1" /> All Ready
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Players will complete the game independently
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map(participant => (
            <div 
              key={participant.id} 
              className={`flex items-center justify-between p-2 rounded-md ${
                participant.userId === userId ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  participant.isReady === true ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span>{participant.fullName || participant.username || `Player ${participant.id}`}</span>
              </div>
              <Badge variant={participant.isReady === true ? "default" : "outline"}>
                {participant.isReady === true ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
          ))}
          
          {participants.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No players have joined yet
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {currentUserParticipant && (
          <Button
            onClick={() => setReady(!isReady)}
            disabled={isPending}
            variant={isReady ? "outline" : "default"}
            className="w-full"
          >
            {isReady ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                I'm not ready
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                I'm ready!
              </>
            )}
          </Button>
        )}
      </CardFooter>
      {allReady && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-b-lg text-center text-sm font-medium">
          <Timer className="h-4 w-4 inline mr-2" />
          All players are ready! Game starting soon...
        </div>
      )}
    </Card>
  );
}