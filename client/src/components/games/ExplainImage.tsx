// client/src/components/games/ExplainImage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { t } from "@/lib/translations";

// No static image imports - we'll rely on dynamic content

interface ImageQuestion {
  id: number;
  src?: string;
  alt: string;
  question: string;
  options: string[];
  answer: string;
}

interface ExplainImageProps {
  data?: {
    images: ImageQuestion[];
  };
  onComplete: (result: any) => void;
  lobbyId?: number;
}

const ExplainImage = ({ data, onComplete, lobbyId }: ExplainImageProps) => {
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{
    imageId: number;
    answer: string | null;
    isCorrect: boolean;
  }>>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per image
  const [timerActive, setTimerActive] = useState(true);

  // Custom image and questions from teacher
  const [customImagesData, setCustomImagesData] = useState<ImageQuestion[]>([]);
  
  useEffect(() => {
    // Check if we have custom image and questions from the teacher
    if ((window as any).customExplainImageUrl && (window as any).customExplainQuestions) {
      try {
        const customImage = (window as any).customExplainImageUrl;
        const questionsString = (window as any).customExplainQuestions;
        
        // Parse custom questions from the form format: "Question|Answer1|Answer2|Answer3|Answer4|CorrectAnswerNumber"
        const questionLines = questionsString.split('\n').filter((line: string) => line.trim() !== '');
        
        if (questionLines.length > 0) {
          const parsedQuestions = questionLines.map((line: string, index: number) => {
            const parts = line.split('|');
            // Check if we have at least a question, options, and answer index
            if (parts.length >= 3) {
              const question = parts[0].trim();
              
              // Get all options (answers) excluding the last part which is the correct answer index
              // Also filter out any empty options
              const options = parts.slice(1, parts.length - 1)
                .map(opt => opt.trim())
                .filter(opt => opt !== "");
              
              // Get the correct answer index (1-based in the form, convert to 0-based)
              const correctAnswerIndex = parseInt(parts[parts.length - 1].trim()) - 1;
              
              // If the index is valid, get the correct answer text
              const answer = correctAnswerIndex >= 0 && correctAnswerIndex < options.length 
                ? options[correctAnswerIndex] 
                : options[0];  // Default to first option if index is invalid
              
              console.log(`Parsed question: "${question}", Options: [${options.join(", ")}], Correct Answer: "${answer}" (index ${correctAnswerIndex})`);
              
              return {
                id: index + 1,
                src: customImage,
                alt: `Custom image ${index + 1}`,
                question,
                options,
                answer
              };
            }
            return null;
          }).filter((q: any): q is ImageQuestion => q !== null);
          
          if (parsedQuestions.length > 0) {
            setCustomImagesData(parsedQuestions);
          }
        }
      } catch (error) {
        console.error("Error parsing custom image questions:", error);
      }
    }
  }, []);

  // Fallback for when no data is provided
  const defaultImages: ImageQuestion[] = [
    {
      id: 1,
      alt: t("Example question"),
      question: t("No questions have been configured for this game."),
      options: [
        t("Contact your teacher"),
        t("Try again later"),
        t("Return to dashboard"),
        t("Refresh the page")
      ],
      answer: t("Contact your teacher")
    }
  ];

  // Use custom images if available, otherwise use data from props or default
  const images = customImagesData.length > 0 ? 
    customImagesData : 
    (data?.images || defaultImages);
  const currentImage = images[currentImageIndex];
  const totalImages = images.length;

  useEffect(() => {
    // Reset state when moving to a new image
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowFeedback(false);
    setTimeLeft(30);
    setTimerActive(true);
  }, [currentImageIndex]);

  useEffect(() => {
    // Timer logic
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !isAnswered) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      // Time's up, record as incorrect
      handleAnswer(null);
    }

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive, isAnswered]);

  const handleAnswer = (answer: string | null) => {
    if (!currentImage) return;
    
    setTimerActive(false);
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    // Update answers array
    const isCorrect = answer === currentImage.answer;
    setAnswers([
      ...answers,
      { imageId: currentImage.id, answer, isCorrect }
    ]);
    
    // Show feedback for 3 seconds before moving to next image
    setShowFeedback(true);
    setTimeout(() => {
      if (currentImageIndex < totalImages - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      } else {
        // Game is complete
        const correctCount = [...answers, { imageId: currentImage.id, answer, isCorrect }]
          .filter(a => a.isCorrect).length;
        
        // Submit score to the server if lobbyId is provided
        if (lobbyId) {
          fetch(`/api/lobbies/${lobbyId}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              score: correctCount,
              completionTime: 0
            }),
            credentials: 'include'
          }).catch(error => {
            console.error('Error submitting score:', error);
          });
        }
        
        const result = {
          gameType: 'explain-image',
          correct: correctCount,
          total: totalImages,
          answers: [...answers, { imageId: currentImage.id, answer, isCorrect }]
        };
        
        onComplete(result);
        
        toast({
          title: t("Game completed!"),
          description: t("You scored {{correctCount}} out of {{totalItems}} ({{accuracy}}% accuracy)", {
            correctCount,
            totalItems: totalImages,
            accuracy: Math.round((correctCount / totalImages) * 100)
          }),
        });
      }
    }, 3000);
  };

  if (!currentImage) {
    return <div className="container mx-auto p-4">{t('Loading questions...')}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Progress and Timer */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('Question')} {currentImageIndex + 1} {t('of')} {totalImages}</span>
          <span className="text-sm text-muted-foreground">{t('Time Left')}: {timeLeft}s</span>
        </div>
        
        {/* Progress Bar for Game Progress */}
        <Progress value={((currentImageIndex) / totalImages) * 100} className="h-2" />
        
        {/* Timer Bar */}
        <Progress 
          value={(timeLeft / 30) * 100} 
          className={`h-2 ${
            timeLeft > 15 ? 'bg-green-100 dark:bg-green-950/50' : 
            timeLeft > 5 ? 'bg-amber-100 dark:bg-amber-950/50' : 
            'bg-red-100 dark:bg-red-950/50'
          }`}
          style={{
            ['--progress-foreground' as any]: timeLeft > 15 ? 'hsl(var(--green-500))' : 
                                             timeLeft > 5 ? 'hsl(var(--amber-500))' : 
                                             'hsl(var(--red-500))'
          }}
        />
      </div>
      
      {/* Image and Question */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-6">
            <img 
              src={currentImage.src || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='%236c757d'%3EAraling Panlipunan%3C/text%3E%3C/svg%3E"} 
              alt={currentImage.alt} 
              className="rounded-md mb-4 max-h-[300px] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='%236c757d'%3ELarawang Pangkasaysayan%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          <h3 className="text-xl font-semibold text-center mb-4">{currentImage.question}</h3>
        </CardContent>
      </Card>
      
      {/* Answer Options */}
      <div className="space-y-2 mb-6">
        {currentImage.options.map((option, index) => (
          <Button
            key={index}
            onClick={() => !isAnswered && handleAnswer(option)}
            disabled={isAnswered}
            variant={
              isAnswered 
                ? option === currentImage.answer
                  ? "default"
                  : selectedAnswer === option
                    ? "destructive"
                    : "outline"
                : "outline"
            }
            className={`w-full justify-start h-auto py-3 px-4 text-left ${
              isAnswered && option === currentImage.answer ? 'bg-green-600 hover:bg-green-700 text-white' : ''
            }`}
          >
            {option}
          </Button>
        ))}
      </div>
      
      {/* Feedback */}
      {showFeedback && (
        <Alert className={
          selectedAnswer === currentImage.answer 
            ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
            : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        }>
          <AlertDescription className="flex items-center">
            {selectedAnswer === currentImage.answer 
              ? <><Check className="h-5 w-5 mr-2 text-green-500" /> {t('Correct!')}</> 
              : <><X className="h-5 w-5 mr-2 text-red-500" /> {t('Incorrect.')} {t('The correct answer is')} "{currentImage.answer}".</>}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ExplainImage;