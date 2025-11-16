import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import StudentLeaderboard from "@/components/student-leaderboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Import the static image
import marcosImage from "@assets/ferdinand marcos.jpg";

interface PuzzlePieceProps {
  value: number;
  index: number;
  onClick: () => void;
  isBlank: boolean;
  isMovable: boolean;
}

function PuzzlePiece({
  value,
  index,
  onClick,
  isBlank,
  isMovable,
}: PuzzlePieceProps & { imageUrl?: string }) {
  // Calculate which part of the image to show based on the piece value
  const row = Math.floor(value / 3);
  const col = value % 3;

  // Get the image URL from props or use the default
  const imageUrl = (window as any).customPuzzleImage || marcosImage;

  return (
    <div
      className={`w-full h-full border border-gray-200 ${isMovable ? "cursor-pointer hover:opacity-80" : ""} ${isBlank ? "opacity-0" : ""}`}
      onClick={isMovable ? onClick : undefined}
      style={{
        backgroundImage: isBlank ? "none" : `url(${imageUrl})`,
        backgroundSize: "300% 300%", // 3x3 grid
        backgroundPosition: `${col * 50}% ${row * 50}%`,
        transition: "all 0.2s ease",
      }}
    />
  );
}

export default function SimplePicturePuzzle({ lobbyId }: { lobbyId?: number }) {
  const { toast } = useToast();
  const { translate } = useLanguage();
  const [tiles, setTiles] = useState<number[]>([]);
  const [blankTileIndex, setBlankTileIndex] = useState(8); // Bottom right corner
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPuzzleStarted, setIsPuzzleStarted] = useState(false);
  const [showTriviaDialog, setShowTriviaDialog] = useState(false);
  const [moves, setMoves] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Initialize the puzzle when component mounts
  useEffect(() => {
    if (tiles.length === 0) {
      // Just prepare the array, don't start the puzzle yet
      const initialTiles = Array.from({ length: 9 }, (_, i) => i);
      setTiles(initialTiles);
    }
  }, [tiles.length]);

  // Start the timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPuzzleStarted && !isCompleted) {
      timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPuzzleStarted, isCompleted]);

  // Check if the puzzle is completed
  useEffect(() => {
    if (tiles.length && isPuzzleStarted) {
      // Check if all tiles are in correct position except the blank tile
      const isAllCorrect = tiles.every((tile, index) => {
        // The blank tile can be anywhere for a win condition
        if (tile === 8) return true;
        // For all other tiles, they must be in their correct position
        return tile === index;
      });

      if (isAllCorrect && !isCompleted) {
        setIsCompleted(true);
        // Show trivia dialog
        setShowTriviaDialog(true);

        // Submit score if in a lobby
        if (lobbyId) {
          submitScore();
        }
      }
    }
  }, [tiles, isCompleted, isPuzzleStarted]);

  const initializePuzzle = () => {
    // Create a solvable sliding puzzle
    let newTiles = Array.from({ length: 9 }, (_, i) => i);

    // Set the blank tile to the bottom right
    const blankValue = 8;
    setBlankTileIndex(8);

    // Make 100 random valid moves to shuffle the puzzle
    // This ensures the puzzle is always solvable
    for (let i = 0; i < 100; i++) {
      const validMoves = getValidMoves(blankValue, newTiles);
      if (validMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        const moveToIndex = validMoves[randomIndex];

        // Swap the blank tile with a valid adjacent tile
        const blankPosition = newTiles.indexOf(blankValue);
        [newTiles[blankPosition], newTiles[moveToIndex]] = [
          newTiles[moveToIndex],
          newTiles[blankPosition],
        ];
      }
    }

    // Update blank tile index
    setBlankTileIndex(newTiles.indexOf(8));
    setTiles(newTiles);
    setTimeElapsed(0);
    setMoves(0);
    setIsCompleted(false);
    setIsPuzzleStarted(true);
    setShowTriviaDialog(false);
    setScoreSubmitted(false);
  };

  // Submit score to server
  const submitScore = async () => {
    if (!lobbyId || scoreSubmitted) return;

    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameType: "picture_puzzle",
          score: calculateScore(timeElapsed, moves),
          completionTime: timeElapsed,
          moveCount: moves,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setScoreSubmitted(true);
        toast({
          title: "Score submitted!",
          description: "Your score has been recorded on the leaderboard.",
        });
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      toast({
        title: "Error",
        description: "Failed to submit your score. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate a score based on time and moves
  const calculateScore = (time: number, moveCount: number): number => {
    // Base score of 10000
    const baseScore = 10000;

    // Deduct points for time (10 points per second)
    const timeDeduction = time * 10;

    // Deduct points for moves (5 points per move)
    const moveDeduction = moveCount * 5;

    // Calculate final score (minimum score is 100)
    const finalScore = Math.max(100, baseScore - timeDeduction - moveDeduction);

    return finalScore;
  };

  // Determine which moves are valid for the blank tile
  const getValidMoves = (
    blankValue: number,
    currentTiles: number[],
  ): number[] => {
    const blankIndex = currentTiles.indexOf(blankValue);
    const validMoves: number[] = [];

    // Check above (if not in top row)
    if (blankIndex >= 3) {
      validMoves.push(blankIndex - 3);
    }

    // Check below (if not in bottom row)
    if (blankIndex < 6) {
      validMoves.push(blankIndex + 3);
    }

    // Check left (if not in leftmost column)
    if (blankIndex % 3 !== 0) {
      validMoves.push(blankIndex - 1);
    }

    // Check right (if not in rightmost column)
    if (blankIndex % 3 !== 2) {
      validMoves.push(blankIndex + 1);
    }

    return validMoves;
  };

  // Handle tile click
  const handleTileClick = (index: number) => {
    // Only proceed if the game has started and is not completed
    if (!isPuzzleStarted || isCompleted) return;

    // Get valid moves for the blank tile
    const validMoves = getValidMoves(8, tiles);

    // Check if the clicked tile is adjacent to the blank tile
    if (validMoves.includes(index)) {
      // Move the tile by swapping with blank tile
      const newTiles = [...tiles];
      [newTiles[index], newTiles[blankTileIndex]] = [
        newTiles[blankTileIndex],
        newTiles[index],
      ];

      // Update state
      setTiles(newTiles);
      setBlankTileIndex(index);
      setMoves(moves + 1);
    }
  };

  // Check if a tile can be moved
  const isTileMovable = (index: number): boolean => {
    if (!isPuzzleStarted || isCompleted) return false;

    const validMoves = getValidMoves(8, tiles);
    return validMoves.includes(index);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <h2 className="text-2xl font-bold">{translate("Picture Puzzle")}</h2>

      {!isPuzzleStarted ? (
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">
              {translate("How to Play")}
            </h3>
            <p className="mb-6">
              {translate(
                "Slide the tiles by clicking on them to arrange the image. Only tiles adjacent to the blank space can be moved. Complete the puzzle as quickly as possible!",
              )}
            </p>
            <Button onClick={initializePuzzle} className="w-full">
              {translate("Start Puzzle")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between w-full max-w-md mb-4">
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-gray-100 rounded-md">
                <span className="font-medium">
                  {translate("Time Label")}: {formatTime(timeElapsed)}
                </span>
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-md">
                <span className="font-medium">
                  {translate("Moves")}: {moves}
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={initializePuzzle}>
              {translate("Restart")}
            </Button>
          </div>

          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-1 aspect-square">
                {Array.from({ length: 9 }, (_, index) => (
                  <div key={index} className="aspect-square">
                    <PuzzlePiece
                      value={tiles[index]}
                      index={index}
                      onClick={() => handleTileClick(index)}
                      isBlank={tiles[index] === 8}
                      isMovable={isTileMovable(index)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Trivia Dialog */}
      <Dialog open={showTriviaDialog} onOpenChange={setShowTriviaDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">
              Congratulations! 🎉
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              You completed the puzzle in {formatTime(timeElapsed)} with {moves}{" "}
              moves
            </DialogDescription>
          </DialogHeader>

          {lobbyId && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{translate("Your Score")}</span>
                <span className="text-xl font-bold text-primary">
                  {calculateScore(timeElapsed, moves)}
                </span>
              </div>
              <p className="text-sm text-center text-green-600 mt-2">
                {translate("Score automatically submitted to leaderboard!")}
              </p>
            </div>
          )}

          <div className="py-4">
            <h3 className="font-semibold text-lg mb-2">
              {translate("Did you know?")}
            </h3>
            <p className="mb-4">{(window as any).customPuzzleDescription || translate("No description available.")}</p>
          </div>

          <DialogFooter className="flex flex-col w-full gap-2">
            <Button
              onClick={() => setShowTriviaDialog(false)}
              className="w-full"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Leaderboard removed - modal in game layout is used instead */}
    </div>
  );
}
