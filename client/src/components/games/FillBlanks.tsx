// client/src/components/games/FillBlanks.tsx
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";

interface Sentence {
  id: number;
  text: string;
  answer: string;
}

interface FillBlanksProps {
  data?: {
    instructions?: string;
    sentences?: Sentence[];
  };
  onComplete: (result: any) => void;
  lobbyId?: number;
}

const FillBlanks = ({ data, onComplete, lobbyId }: FillBlanksProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{
    questionId: number;
    answer: string;
    isCorrect: boolean;
  }>>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [isAnswered, setIsAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timerActive, setTimerActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [consecutiveIncorrect, setConsecutiveIncorrect] = useState(0);

  // Custom sentences from teacher
  const [gameSentences, setGameSentences] = useState<Sentence[]>([]);

  // Simple fallback data if none is provided
  const defaultSentences: Sentence[] = [
    {
      id: 1,
      text: "Walang mga tanong na naisagawa para sa larong ito. Mangyaring [blank] ang iyong guro.",
      answer: "kontakin"
    }
  ];
  
  // Load and process game sentences on component mount
  useEffect(() => {
    // First check for custom sentences from props
    if (data?.sentences && data.sentences.length > 0) {
      console.log("Using sentences from props:", data.sentences);
      setGameSentences(data.sentences);
      setIsLoading(false);
      return;
    }
    
    // Then check if we have custom sentences from the teacher in window object
    if ((window as any).customSentences) {
      try {
        console.log("Raw custom sentences:", (window as any).customSentences);
        
        // Parse custom sentences from the format: "Sentence with [blank].|answer"
        const sentenceLines = (window as any).customSentences.split('\n').filter((line: string) => line.trim() !== '');
        
        console.log("Parsed sentence lines:", sentenceLines);
        
        if (sentenceLines.length > 0) {
          const parsedSentences = sentenceLines.map((line: string, index: number) => {
            const parts = line.split('|');
            console.log(`Line ${index + 1} parts:`, parts);
            
            if (parts.length >= 2) {
              const text = parts[0].trim();
              const answer = parts[1].trim();
              
              return {
                id: index + 1,
                text,
                answer
              };
            }
            return null;
          }).filter((s: any): s is Sentence => s !== null);
          
          console.log("Final parsed sentences:", parsedSentences);
          
          if (parsedSentences.length > 0) {
            setGameSentences(parsedSentences);
          } else {
            // Fall back to default sentences if parsing failed
            setGameSentences(defaultSentences);
          }
        } else {
          setGameSentences(defaultSentences);
        }
      } catch (error) {
        console.error("Error parsing custom sentences:", error);
        setGameSentences(defaultSentences);
      }
    } else {
      // If no custom data, use default sentences
      setGameSentences(defaultSentences);
    }
    
    setIsLoading(false);
  }, [data]);

  // Initialize questions
  const currentQuestion = gameSentences[currentQuestionIndex];
  const totalQuestions = gameSentences.length;

  // Initialize the game
  useEffect(() => {
    resetQuestion();
  }, [currentQuestionIndex, gameSentences.length]);

  // Timer functionality
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !isAnswered) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      // Time's up, proceed to next question automatically
      handleTimeUp();
    }

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive, isAnswered]);

  const resetQuestion = () => {
    if (!currentQuestion) return;
    
    setUserAnswer('');
    setIsAnswered(false);
    setShowFeedback(false);
    setTimeLeft(30);
    setTimerActive(true);
    setConsecutiveIncorrect(0);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || isAnswered) return;
    
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer) return; // Don't submit empty answers
    
    setTimerActive(false);
    setIsAnswered(true);
    
    // Compare answer (case insensitive)
    const isCorrect = trimmedAnswer.toLowerCase() === currentQuestion.answer.toLowerCase();
    
    // Only reset consecutive incorrect counter if answer is correct
    if (isCorrect) {
      setConsecutiveIncorrect(0);
    }
    
    // Update answers array
    setAnswers([
      ...answers,
      { questionId: currentQuestion.id, answer: trimmedAnswer, isCorrect }
    ]);
    
    // Show feedback
    setShowFeedback(true);
    
    // Only proceed to next question if answer is correct
    if (isCorrect) {
      setTimeout(() => {
        proceedToNextQuestion(trimmedAnswer, isCorrect);
      }, 2000);
    } else {
      // If incorrect, apply time penalty but stay on same question
      setConsecutiveIncorrect(prev => prev + 1);
      
      // Reduce time by 3 seconds for wrong answer
      setTimeLeft(prev => Math.max(prev - 3, 1)); // Subtract 3 seconds, but ensure at least 1 second left
      
      // Reset for another attempt
      setTimeout(() => {
        setIsAnswered(false);
        setShowFeedback(false);
        setUserAnswer('');
        setTimerActive(true);
      }, 2000);
    }
  };
  
  // Timer runs out - proceed to next question
  const handleTimeUp = () => {
    if (!currentQuestion || isAnswered) return;
    
    // Mark as incorrect with empty answer
    const trimmedAnswer = userAnswer.trim() || "(no answer)";
    const isCorrect = false;
    
    setTimerActive(false);
    setIsAnswered(true);
    
    // Update answers array
    setAnswers([
      ...answers,
      { questionId: currentQuestion.id, answer: trimmedAnswer, isCorrect }
    ]);
    
    // Show the correct answer
    setShowFeedback(true);
    
    // Move to next question after showing the correct answer
    setTimeout(() => {
      proceedToNextQuestion(trimmedAnswer, isCorrect);
    }, 3000);
  };
  
  // Proceed to next question or end game
  const proceedToNextQuestion = (answer: string, isCorrect: boolean) => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Game is complete
      const correctCount = [...answers, { questionId: currentQuestion.id, answer, isCorrect }]
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
        gameType: 'fill-blanks',
        correct: correctCount,
        total: totalQuestions,
        answers: [...answers, { questionId: currentQuestion.id, answer, isCorrect }]
      };
      
      onComplete(result);
      
      toast({
        title: "Nakumpleto ang laro!",
        description: `Nakakuha ka ng ${correctCount} mula sa ${totalQuestions} na tamang sagot.`,
      });
    }
  };

  // Process the sentence to show blank
  const renderSentence = () => {
    if (!currentQuestion) return null;
    
    // Replace [blank] with an underline
    const parts = currentQuestion.text.split('[blank]');
    
    return (
      <p className="text-xl text-center px-3">
        {parts[0]}
        <span className="inline-block border-b-2 border-primary mx-2 px-2 min-w-[80px]">
          {isAnswered && (
            <span className={`font-bold ${userAnswer.toLowerCase() === currentQuestion.answer.toLowerCase() ? 'text-green-600' : 'text-red-600'}`}>
              {userAnswer && userAnswer !== "(no answer)" ? userAnswer : ""}
            </span>
          )}
        </span>
        {parts[1] || ''}
      </p>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-medium">Naglo-load ang mga tanong...</p>
      </div>
    );
  }

  // Check if sentences are available after loading
  if (!gameSentences.length) {
    return (
      <div className="container mx-auto p-4 text-center">
        <Card className="mb-6">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4">Walang available na mga tanong</h3>
            <p className="text-muted-foreground">
              Mangyaring makipag-ugnayan sa iyong guro upang i-setup ang mga tanong para sa larong ito.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if currentQuestion is defined
  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-medium">Naglo-load ng nilalaman...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Progress and Timer */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tanong {currentQuestionIndex + 1} ng {totalQuestions}</span>
          <span className="text-sm text-muted-foreground">Natitirang Oras: {timeLeft}s</span>
        </div>
        
        {/* Progress Bar for Game Progress */}
        <Progress value={((currentQuestionIndex) / totalQuestions) * 100} className="h-2" />
        
        {/* Timer Bar */}
        <Progress 
          value={(timeLeft / 30) * 100} 
          className={`h-2 ${
            timeLeft > 15 ? 'bg-green-100 dark:bg-green-950/50' : 
            timeLeft > 7 ? 'bg-amber-100 dark:bg-amber-950/50' : 
            'bg-red-100 dark:bg-red-950/50'
          }`}
          style={{
            ['--progress-foreground' as any]: timeLeft > 15 ? 'hsl(var(--green-500))' : 
                                            timeLeft > 7 ? 'hsl(var(--amber-500))' : 
                                            'hsl(var(--red-500))'
          }}
        />
      </div>
      
      {/* Question */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="text-2xl font-bold text-center mb-6">Punan ang Patlang</h3>
          {renderSentence()}
        </CardContent>
      </Card>
      
      {/* Answer Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="I-type ang iyong sagot dito..."
              value={userAnswer}
              onChange={handleInputChange}
              disabled={isAnswered}
              className="flex-1"
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={isAnswered || !userAnswer.trim()}
            >
              Ipasa
            </Button>
          </div>
        </div>
      </form>
      
      {/* Feedback */}
      {showFeedback && (
        <Alert className={`mt-6 ${
          userAnswer.toLowerCase() === currentQuestion.answer.toLowerCase() 
            ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
            : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        }`}>
          <AlertDescription className="flex items-center">
            {userAnswer.toLowerCase() === currentQuestion.answer.toLowerCase() 
              ? <><Check className="h-5 w-5 mr-2 text-green-500" /> Tama!</> 
              : userAnswer === "(no answer)" 
                ? <><X className="h-5 w-5 mr-2 text-red-500" /> Naubos ang oras! Ang tamang sagot ay "{currentQuestion.answer}".</>
                : <><X className="h-5 w-5 mr-2 text-red-500" /> Mali. Ang tamang sagot ay "{currentQuestion.answer}".</>}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Time Penalty Notice */}
      {consecutiveIncorrect > 0 && !isAnswered && (
        <div className="mt-4 text-center text-amber-600 dark:text-amber-400 text-sm">
          {consecutiveIncorrect === 1 
            ? 'Nabawasan ng 3 segundo ang oras dahil sa maling sagot.' 
            : `Nabawasan ng ${consecutiveIncorrect * 3} segundo ang oras dahil sa sunod-sunod na maling sagot.`}
        </div>
      )}
    </div>
  );
};

export default FillBlanks;