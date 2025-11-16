import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePolling } from "./use-polling";

export function usePicturePuzzle(lobbyId: number, imageData: any) {
  const [pieces, setPieces] = useState<any[]>([]);
  const [solved, setSolved] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize puzzle
  useEffect(() => {
    if (!imageData) return;
    
    // Create puzzle pieces (4x4 grid = 16 pieces)
    const newPieces = Array.from({ length: 16 }, (_, index) => ({
      id: index,
      index,
      correctPosition: index,
      currentPosition: undefined as number | undefined
    }));
    
    // Shuffle pieces
    const shuffled = [...newPieces].sort(() => Math.random() - 0.5);
    shuffled.forEach((piece, i) => {
      piece.currentPosition = i;
    });
    
    setPieces(shuffled);
    setStartTime(Date.now());
    setSolved(false);
    setCompletionTime(null);
  }, [imageData]);

  // Check if puzzle is solved
  useEffect(() => {
    if (pieces.length === 0 || !startTime) return;
    
    const isCorrect = pieces.every((piece) => piece.currentPosition === piece.correctPosition);
    
    if (isCorrect && !solved) {
      setSolved(true);
      const endTime = Date.now();
      const timeInSeconds = Math.floor((endTime - startTime) / 1000);
      setCompletionTime(timeInSeconds);
      
      toast({
        title: "Puzzle completed!",
        description: `You solved the puzzle in ${formatTime(timeInSeconds)}.`,
      });
    }
  }, [pieces, startTime, solved, toast]);

  // Handle piece movement
  const movePiece = useCallback((fromIndex: number, toIndex: number) => {
    setPieces((prevPieces) => {
      const newPieces = [...prevPieces];
      
      // Find the pieces at the source and destination
      const fromPiece = newPieces.find((p) => p.currentPosition === fromIndex);
      const toPiece = newPieces.find((p) => p.currentPosition === toIndex);
      
      if (fromPiece && toPiece) {
        // Swap positions
        fromPiece.currentPosition = toIndex;
        toPiece.currentPosition = fromIndex;
      }
      
      return newPieces;
    });
  }, []);

  // Submit score when puzzle is solved
  const submitScoreMutation = useMutation({
    mutationFn: async ({ score, completionTime }: { score: number, completionTime: number }) => {
      const res = await apiRequest("POST", "/api/scores", {
        lobbyId,
        score,
        completionTime
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/scores/lobby/${lobbyId}`] });
      toast({
        title: "Score submitted",
        description: "Your score has been recorded!"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit score",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const submitScore = useCallback(() => {
    if (solved && completionTime && !submitScoreMutation.isPending) {
      // Calculate score based on completion time (faster = higher score)
      // Base score of 1000, minus 2 points per second
      const score = Math.max(1000 - completionTime * 2, 100);
      submitScoreMutation.mutate({ score, completionTime });
    }
  }, [solved, completionTime, submitScoreMutation, lobbyId]);

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: [`/api/scores/lobby/${lobbyId}`],
    enabled: !!lobbyId
  });

  return {
    pieces,
    movePiece,
    solved,
    completionTime,
    startTime,
    submitScore,
    isSubmitting: submitScoreMutation.isPending,
    hasSubmitted: submitScoreMutation.isSuccess,
    leaderboard
  };
}

export function usePictureMatching(lobbyId: number, images: any[]) {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize game
  useEffect(() => {
    console.log('usePictureMatching: initializing with', images?.length, 'images');
    
    if (!images || images.length === 0) {
      console.warn('No images available for picture matching game!');
      return;
    }
    
    // Debug each image to check for problems
    images.forEach((image, idx) => {
      if (!image.imageUrl && !image.image_url) {
        console.error(`Image ${idx} (id:${image.id}) missing both imageUrl and image_url properties!`);
      }
      if (!image.description) {
        console.warn(`Image ${idx} (id:${image.id}) missing description!`);
      }
    });
    
    // Create pairs of cards
    const cardPairs = images.flatMap((image, index) => {
      // Try both imageUrl (camelCase) and image_url (snake_case) to handle both naming conventions
      const imageSource = image.imageUrl || image.image_url;
      
      // Skip images with missing image URL
      if (!imageSource) {
        console.warn(`Skipping image ${image.id} due to missing image URL`);
        return [];
      }
      
      return [
        {
          id: index * 2,
          imageId: image.id,
          imageUrl: imageSource,
          matched: false,
          description: image.description || 'No description available'
        },
        {
          id: index * 2 + 1,
          imageId: image.id,
          imageUrl: imageSource,
          matched: false,
          description: image.description || 'No description available'
        }
      ];
    });
    
    if (cardPairs.length === 0) {
      console.error('No valid card pairs could be created - all images may be missing imageUrl');
      return;
    }
    
    console.log(`Created ${cardPairs.length} cards (${cardPairs.length/2} pairs) from ${images.length} images`);
    
    // For a 4x3 grid, we need 12 cards (6 pairs)
    // If we have more, slice to 12
    // If we have less, we'll use what we have (the UI will adjust)
    let processedCards = [...cardPairs];
    if (processedCards.length > 12) {
      processedCards = processedCards.slice(0, 12);
    }
    
    // Shuffle cards
    const shuffled = [...processedCards].sort(() => Math.random() - 0.5);
    
    console.log(`Final cards for game: ${shuffled.length}`);
    
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setStartTime(Date.now());
    setCompletionTime(null);
    setGameComplete(false);
    setHasSubmitted(false);
  }, [images]);

  // Handle card click
  const flipCard = useCallback((id: number) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) {
      return;
    }
    
    setFlipped((prev) => [...prev, id]);
  }, [flipped, matched]);

  // Check for matches
  useEffect(() => {
    if (flipped.length !== 2) return;
    
    setMoves((prev) => prev + 1);
    
    const [first, second] = flipped;
    
    if (cards[first]?.imageId === cards[second]?.imageId) {
      // Match found
      setMatched((prev) => [...prev, first, second]);
      setFlipped([]);
      
      // Show match details in dialog
      const matchedCard = cards[first];
      if (matchedCard) {
        toast({
          title: "Match found!",
          description: matchedCard.description,
        });
      }
    } else {
      // No match, flip back after delay
      const timer = setTimeout(() => {
        setFlipped([]);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [flipped, cards, toast]);

  // Check if game is complete and auto-submit score
  useEffect(() => {
    if (cards.length > 0 && matched.length === cards.length && !gameComplete) {
      setGameComplete(true);
      const endTime = Date.now();
      const timeInSeconds = Math.floor((endTime - (startTime || 0)) / 1000);
      setCompletionTime(timeInSeconds);
      
      toast({
        title: "Game completed!",
        description: `You matched all pairs in ${formatTime(timeInSeconds)} with ${moves} moves.`,
      });
      
      // Auto-submit score after a short delay
      setTimeout(() => {
        submitScore(timeInSeconds);
      }, 1000);
    }
  }, [matched, cards, startTime, gameComplete, moves, toast]);

  // Submit score function
  const submitScore = useCallback((time?: number) => {
    if ((gameComplete && completionTime) || time) {
      setIsSubmitting(true);
      // Calculate score based on completion time and moves
      const timeInSeconds = time || completionTime || 0;
      const timePenalty = timeInSeconds * 2;
      const movesPenalty = moves * 5;
      const score = Math.max(1000 - timePenalty - movesPenalty, 100);
      
      apiRequest("POST", "/api/scores", {
        lobbyId,
        score,
        completionTime: timeInSeconds
      })
        .then(res => res.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/scores/lobby/${lobbyId}`] });
          setHasSubmitted(true);
          setIsSubmitting(false);
          toast({
            title: "Score submitted",
            description: "Your score has been recorded!"
          });
        })
        .catch(error => {
          setIsSubmitting(false);
          toast({
            title: "Failed to submit score",
            description: error.message,
            variant: "destructive"
          });
        });
    }
  }, [gameComplete, completionTime, moves, lobbyId, queryClient, toast]);

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: [`/api/scores/lobby/${lobbyId}`],
    enabled: !!lobbyId
  });

  return {
    cards,
    flipped,
    matched,
    moves,
    completionTime,
    gameComplete,
    flipCard,
    submitScore,
    isSubmitting,
    hasSubmitted,
    leaderboard
  };
}




// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
