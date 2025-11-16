// client/src/components/games/TrueOrFalse.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ThumbsUp, ThumbsDown } from "lucide-react";

interface Question {
  id: number;
  statement: string;
  answer: boolean;
  explanation?: string;
}

interface TrueOrFalseProps {
  data?: {
    instructions?: string;
    questions: Question[];
  };
  onComplete: (result: any) => void;
  lobbyId?: number;
}

const TrueOrFalse = ({ data, onComplete, lobbyId }: TrueOrFalseProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{
    questionId: number;
    answer: boolean | null;
    isCorrect: boolean;
  }>>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds per question
  const [timerActive, setTimerActive] = useState(true);

  // Custom questions from teacher
  const [customQuestionsData, setCustomQuestionsData] = useState<Question[]>([]);
  
  useEffect(() => {
    // Check if there are custom questions from the teacher
    if ((window as any).customQuestions) {
      try {
        // Parse custom questions: "Statement|true/false|Explanation"
        const questionLines = (window as any).customQuestions.split('\n').filter((line: string) => line.trim() !== '');
        
        if (questionLines.length > 0) {
          const parsedQuestions = questionLines.map((line: string, index: number) => {
            const parts = line.split('|');
            if (parts.length >= 2) {
              return {
                id: index + 1,
                statement: parts[0].trim(),
                answer: parts[1].trim().toLowerCase() === 'true',
                explanation: parts.length > 2 ? parts[2].trim() : undefined
              };
            }
            return null;
          }).filter((q: any): q is Question => q !== null);
          
          if (parsedQuestions.length > 0) {
            setCustomQuestionsData(parsedQuestions);
          }
        }
      } catch (error) {
        console.error("Error parsing custom questions:", error);
      }
    }
  }, []);

  // Fallback for when no data is provided
  const defaultQuestions: Question[] = [
    {
      id: 1,
      statement: "No questions have been configured for this game. Please contact your teacher.",
      answer: true,
      explanation: "This is a placeholder question. The teacher needs to configure questions for this activity."
    }
  ];

  // Use custom questions if available, otherwise use data from props or default questions
  const questions = customQuestionsData.length > 0 ? 
    customQuestionsData : 
    (data?.questions || defaultQuestions);
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  useEffect(() => {
    // Reset state when moving to a new question
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowFeedback(false);
    setTimeLeft(15);
    setTimerActive(true);
  }, [currentQuestionIndex]);

  useEffect(() => {
    // Timer logic
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0 && !isAnswered) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      // Time's up, record the answer as incorrect
      handleAnswer(null);
    }

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive, isAnswered]);

  const handleAnswer = (answer: boolean | null) => {
    if (!currentQuestion) return;
    
    setTimerActive(false);
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    // Update answers array
    const isCorrect = answer === currentQuestion.answer;
    setAnswers([
      ...answers,
      { questionId: currentQuestion.id, answer, isCorrect }
    ]);
    
    // Show feedback for 2 seconds before moving to the next question
    setShowFeedback(true);
    setTimeout(() => {
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
          gameType: 'true-false',
          correct: correctCount,
          total: totalQuestions,
          answers: [...answers, { questionId: currentQuestion.id, answer, isCorrect }]
        };
        
        onComplete(result);
        
        toast({
          title: "Game completed!",
          description: `You got ${correctCount} out of ${totalQuestions} questions correct.`,
        });
      }
    }, 2000);
  };

  if (!currentQuestion) {
    return <div className="container mx-auto p-4">Loading questions...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Progress and Timer */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span className="text-sm text-muted-foreground">Time Left: {timeLeft}s</span>
        </div>
        
        {/* Progress Bar for Game Progress */}
        <Progress value={((currentQuestionIndex) / totalQuestions) * 100} className="h-2" />
        
        {/* Timer Bar */}
        <Progress 
          value={(timeLeft / 15) * 100} 
          className="h-2"
          style={{
            ['--bg-color' as any]: timeLeft > 5 ? 'var(--success)' : 'var(--destructive)'
          }}
        />
      </div>
      
      {/* Question */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold text-center">
            {currentQuestion.statement}
          </h3>
        </CardContent>
      </Card>
      
      {/* Answer Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={() => !isAnswered && handleAnswer(true)}
          disabled={isAnswered}
          variant={
            isAnswered 
              ? selectedAnswer === true
                ? currentQuestion.answer === true
                  ? "default"
                  : "destructive"
                : currentQuestion.answer === true
                  ? "default"
                  : "outline"
              : "outline"
          }
          className={`h-auto py-6 text-lg ${
            isAnswered && currentQuestion.answer === true ? 'bg-green-600 hover:bg-green-700' : ''
          }`}
        >
          <ThumbsUp className="h-6 w-6 mr-2" />
          True
        </Button>
        
        <Button
          onClick={() => !isAnswered && handleAnswer(false)}
          disabled={isAnswered}
          variant={
            isAnswered 
              ? selectedAnswer === false
                ? currentQuestion.answer === false
                  ? "default"
                  : "destructive"
                : currentQuestion.answer === false
                  ? "default"
                  : "outline"
              : "outline"
          }
          className={`h-auto py-6 text-lg ${
            isAnswered && currentQuestion.answer === false ? 'bg-green-600 hover:bg-green-700' : ''
          }`}
        >
          <ThumbsDown className="h-6 w-6 mr-2" />
          False
        </Button>
      </div>
      
      {/* Feedback */}
      {showFeedback && (
        <Alert className={`mt-6 ${
          selectedAnswer === currentQuestion.answer 
            ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
            : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        }`}>
          <AlertDescription className="flex items-center">
            {selectedAnswer === currentQuestion.answer 
              ? <><Check className="h-5 w-5 mr-2 text-green-500" /> Correct!</> 
              : <><X className="h-5 w-5 mr-2 text-red-500" /> Incorrect. The correct answer is {currentQuestion.answer ? 'True' : 'False'}.</>}
            
            {currentQuestion.explanation && (
              <p className="mt-2 ml-7">{currentQuestion.explanation}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TrueOrFalse;