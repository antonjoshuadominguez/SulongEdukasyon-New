import { useState, useEffect, useRef } from "react";
import { usePictureMatching } from "@/hooks/use-game";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, TrophyIcon, CheckCircle2, X, HelpCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import StudentLeaderboard from "@/components/student-leaderboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CardProps {
  id: number;
  imageUrl: string;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

function MemoryCard({ id, imageUrl, isFlipped, isMatched, onClick }: CardProps) {
  return (
    <div 
      className={cn(
        "cursor-pointer h-full w-full", 
        isMatched ? "opacity-60" : "hover:shadow-lg",
        !isFlipped && !isMatched && "hover:scale-[1.03] hover:-translate-y-1",
        "transition-all duration-300"
      )}
      onClick={onClick}
      style={{ 
        perspective: '1000px'
      }}
    >
      <div 
        className="relative w-full h-full transition-all duration-500"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Card Back */}
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary border-2 border-white shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Card shine effect */}
          <div 
            className="absolute inset-0 rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.2) 40%, transparent 60%)',
              animation: !isFlipped ? 'shine 3s infinite ease-in-out' : 'none'
            }}
          />
          
          <HelpCircle 
            className="w-2/5 h-2/5 text-white opacity-95 drop-shadow-sm" 
            strokeWidth={1.5}
          />
        </div>
        
        {/* Card Front */}
        <div 
          className="absolute inset-0 rounded-lg border-2 border-white shadow-lg overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {!imageUrl && <div className="flex items-center justify-center h-full bg-red-100">Image Error</div>}
          </div>
          
          {/* Matched overlay */}
          {isMatched && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-1/3 h-1/3 text-green-600/90" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PictureMatchingProps {
  lobbyId: number;
  images: any[];
}

export default function PictureMatching({ lobbyId, images }: PictureMatchingProps) {
  const { translate } = useLanguage();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentFact, setCurrentFact] = useState<string | null>(null);
  const [matchedPair, setMatchedPair] = useState<{imageUrl: string, description: string} | null>(null);
  
  // Use customMatchingImages if available, otherwise use images prop
  const [gameImages, setGameImages] = useState<any[]>([]);
  
  useEffect(() => {
    // Check if we have customMatchingImages from the window object (set by game-page.tsx)
    const customImages = (window as any).customMatchingImages;
    
    if (customImages) {
      try {
        // Parse the JSON string from customMatchingImages
        const parsedImages = JSON.parse(customImages);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          console.log(`Using ${parsedImages.length} images from customMatchingImages`);
          setGameImages(parsedImages);
          return;
        }
      } catch (error) {
        console.error("Error parsing customMatchingImages:", error);
      }
    }
    
    // Fallback to the legacy images array if customMatchingImages is not available or parsing failed
    if (images && images.length > 0) {
      console.log(`Using ${images.length} images from legacy images prop`);
      setGameImages(images);
    } else {
      console.warn('No images available for picture matching game!');
      setGameImages([]);
    }
  }, [images, lobbyId]);
  
  const {
    cards,
    flipped,
    matched,
    moves,
    gameComplete,
    completionTime,
    flipCard,
    submitScore,
    isSubmitting,
    hasSubmitted,
    leaderboard
  } = usePictureMatching(lobbyId, gameImages);

  // Start timer
  useEffect(() => {
    if (!gameComplete && cards.length > 0) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cards, gameComplete]);

  // Update elapsed time when game is complete
  useEffect(() => {
    if (gameComplete && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameComplete]);

  // Show match dialog when a match is found
  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      
      if (cards[first]?.imageId === cards[second]?.imageId) {
        // Match found, show dialog with image and description
        setMatchedPair({
          imageUrl: cards[first]?.imageUrl,
          description: cards[first]?.description || ''
        });
      }
    }
  }, [flipped, cards]);

  // Format time (seconds to mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle card click
  const handleCardClick = (id: number) => {
    if (flipped.length < 2 && !matched.includes(id) && !flipped.includes(id)) {
      flipCard(id);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardContent className="pt-6 px-2 sm:px-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-neutral-900">
              {gameComplete ? translate('All Matches Found!') : translate('Find Matching Pairs')}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-neutral-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
              <div className="text-neutral-600">
                {translate("Moves")}: {moves}
              </div>
            </div>
          </div>
          
          {currentFact && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-green-700">{currentFact}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-8 mx-auto max-w-4xl p-2">
            {cards.map((card, index) => (
              <div key={card.id} className="aspect-square w-full h-full">
                <MemoryCard
                  id={index}
                  imageUrl={card.imageUrl}
                  isFlipped={flipped.includes(index) || matched.includes(index)}
                  isMatched={matched.includes(index)}
                  onClick={() => handleCardClick(index)}
                />
              </div>
            ))}
          </div>
          
          {gameComplete && (
            <div className="mt-6 text-center">
              <p className="text-lg font-bold text-neutral-900 mb-2">
                {translate("Congratulations! You found all matches in")} {formatTime(completionTime || elapsedTime)} {translate("with")} {moves} {translate("moves")}
              </p>
              
              {!hasSubmitted && (
                <Button 
                  onClick={() => submitScore()}
                  disabled={isSubmitting}
                  className="mt-2"
                >
                  <TrophyIcon className="h-4 w-4 mr-2" />
                  {translate("Submit Score")}
                </Button>
              )}
              
              {hasSubmitted && (
                <p className="text-green-600">
                  {translate("Your score has been submitted!")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Leaderboard removed - modal in game layout is used instead */}
    
      {/* Match Found Dialog */}
      <Dialog open={!!matchedPair} onOpenChange={(open) => !open && setMatchedPair(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {translate("Match Found!")}
            </DialogTitle>
            <DialogDescription>
              {translate("You've found a matching pair! Learn about this image:")}
            </DialogDescription>
          </DialogHeader>
          
          {matchedPair && (
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-lg border-2 border-primary shadow-lg">
                  <img 
                    src={matchedPair.imageUrl} 
                    alt={translate("Matched image")}
                    className="max-h-[250px] w-auto object-contain p-1" 
                  />
                </div>
              </div>
              
              <div className="bg-muted/50 border border-muted p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{matchedPair.description}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setMatchedPair(null)}
              className="mt-2"
              variant="default"
            >
              {translate("Continue Playing")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}