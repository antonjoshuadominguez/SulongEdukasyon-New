import { useEffect, useState } from "react";
import { useParams, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import GameLayout from "@/components/games/game-layout";
import SimplePicturePuzzle from "@/components/games/picture-puzzle";
import PictureMatching from "@/components/games/picture-matching";
import ArrangeTimeline from "@/components/games/ArrangeTimeline";
import ExplainImage from "@/components/games/ExplainImage";
import FillBlanks from "@/components/games/FillBlanks";

import TamaAngAyos from "@/components/games/TamaAngAyos";
import TrueOrFalse from "@/components/games/TrueOrFalse";
import { t } from "@/lib/translations";

export default function GamePage() {
  const { lobbyId } = useParams();
  const { user } = useAuth();
  const [hasJoined, setHasJoined] = useState(false);

  // Define types for better type safety
  interface GameLobby {
    id: number;
    name: string;
    description?: string;
    lobbyCode: string;
    gameType: "picture_puzzle" | "picture_matching" | 
              "arrange_timeline" | "explain_image" | "fill_blanks" | 
              "tama_ang_ayos" | "true_or_false";
    gameTopic?: string;
    status: string;
    participantCount?: number;
    subLobbyId?: string;
    // Custom fields for different game types
    customImageUrl?: string; // For picture puzzle customization
    customImageDescription?: string; // Description for custom image
    customQuestions?: string; // Custom true/false questions
    customExplainImageUrl?: string; // Custom image for explain image game
    customExplainQuestions?: string; // Custom questions for explain image
    customEvents?: string; // Custom timeline events
    customSentences?: string; // Custom fill-in-the-blank sentences
    customMatchingImages?: string; // For picture matching (JSON array of image objects)
    customCategories?: string; // Custom categories for Tama ang Ayos
    customItems?: string; // Custom items for Tama ang Ayos
  }

  // Fetch lobby data
  const { data: lobby, isLoading, error } = useQuery<GameLobby>({
    queryKey: [`/api/lobbies/${lobbyId}`],
    enabled: !!lobbyId && !!user,
    retry: 2,
    retryDelay: 1000
  });

  // Fetch game images for the specific lobby (only needed for picture matching)
  const { data: images } = useQuery<any[]>({
    queryKey: [`/api/game-images/${lobbyId}`],
    enabled: !!lobby && lobby.gameType === 'picture_matching',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-join lobby if student
  useEffect(() => {
    if (user?.role === 'student' && lobby && !hasJoined) {
      const joinLobby = async () => {
        try {
          const response = await fetch(`/api/lobbies/${lobbyId}/join`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            setHasJoined(true);
          }
        } catch (error) {
          console.error('Error joining lobby:', error);
        }
      };
      
      joinLobby();
    } else if (user?.role === 'teacher') {
      // Teachers automatically "join" their own lobbies
      setHasJoined(true);
    }
  }, [user, lobby, lobbyId, hasJoined]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !lobby) {
    return (
      <MainLayout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('Game Not Found')}</h2>
          <p className="text-neutral-500 mb-6">{t('The game lobby you\'re looking for doesn\'t exist or you don\'t have access.')}</p>
          <Redirect to="/" />
        </div>
      </MainLayout>
    );
  }

  const renderGame = () => {
    if (!hasJoined) {
      return (
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
    }
    
    // Only require images for picture_matching game
    if (lobby.gameType === 'picture_matching' && !images && !lobby.customMatchingImages) {
      return (
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
    }

    const parsedLobbyId = parseInt(lobbyId || '0');
    
    // Set custom content for each game type if provided
    // For picture puzzle
    if (lobby.gameType === 'picture_puzzle') {
      if (lobby.customImageUrl) {
        (window as any).customPuzzleImage = lobby.customImageUrl;
        (window as any).customPuzzleDescription = lobby.customImageDescription || "";
      } else {
        // Clear previous custom image and description
        (window as any).customPuzzleImage = null;
        (window as any).customPuzzleDescription = null;
      }
    }
    
    // For True or False
    if (lobby.gameType === 'true_or_false') {
      (window as any).customQuestions = lobby.customQuestions || null;
    }
    
    // For Explain Image
    if (lobby.gameType === 'explain_image') {
      (window as any).customExplainImageUrl = lobby.customExplainImageUrl || null;
      (window as any).customExplainQuestions = lobby.customExplainQuestions || null;
    }
    
    // For Arrange Timeline
    if (lobby.gameType === 'arrange_timeline') {
      (window as any).customEvents = lobby.customEvents || null;
    }
    
    // For Fill Blanks
    if (lobby.gameType === 'fill_blanks') {
      (window as any).customSentences = lobby.customSentences || null;
    }
    

    
    // For Tama ang Ayos
    if (lobby.gameType === 'tama_ang_ayos') {
      (window as any).customCategories = lobby.customCategories || null;
      (window as any).customItems = lobby.customItems || null;
    }
    
    // For Picture Matching
    if (lobby.gameType === 'picture_matching') {
      (window as any).customMatchingImages = lobby.customMatchingImages || null;
    }

    switch (lobby.gameType) {
      case 'picture_puzzle':
        return <SimplePicturePuzzle lobbyId={parsedLobbyId} />; 
      case 'picture_matching':
        return <PictureMatching lobbyId={parsedLobbyId} images={images || []} />;
      case 'arrange_timeline':
        return <ArrangeTimeline 
                 lobbyId={parsedLobbyId} 
                 onComplete={(result) => console.log(result)} 
                 data={{
                   instructions: t("Arrange these historical events in chronological order."),
                   events: [
                     { id: 1, year: "1521", text: t("Arrival of Ferdinand Magellan in the Philippines"), correctPosition: 1, currentPosition: Math.floor(Math.random() * 5) + 1 },
                     { id: 2, year: "1565", text: t("Spanish Colonization began under Miguel López de Legazpi"), correctPosition: 2, currentPosition: Math.floor(Math.random() * 5) + 1 },
                     { id: 3, year: "1896", text: t("Philippine Revolution against Spain began"), correctPosition: 3, currentPosition: Math.floor(Math.random() * 5) + 1 },
                     { id: 4, year: "1898", text: t("Declaration of Philippine Independence"), correctPosition: 4, currentPosition: Math.floor(Math.random() * 5) + 1 },
                     { id: 5, year: "1899", text: t("Philippine-American War began"), correctPosition: 5, currentPosition: Math.floor(Math.random() * 5) + 1 }
                   ]
                 }}
               />;
      case 'explain_image':
        return <ExplainImage lobbyId={parsedLobbyId} onComplete={(result) => console.log(result)} />;
      case 'fill_blanks':
        return <FillBlanks lobbyId={parsedLobbyId} onComplete={(result) => console.log(result)} />;

      case 'tama_ang_ayos':
        return <TamaAngAyos lobbyId={parsedLobbyId} onComplete={(result) => console.log(result)} />;
      case 'true_or_false':
        return <TrueOrFalse lobbyId={parsedLobbyId} onComplete={(result) => console.log(result)} />;
      default:
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('Game Type Not Supported')}</h2>
            <p className="text-neutral-500">{t('This game type is not currently available.')}</p>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <GameLayout lobby={lobby}>
        {renderGame()}
      </GameLayout>
    </MainLayout>
  );
}
