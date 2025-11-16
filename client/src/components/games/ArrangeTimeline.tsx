// client/src/components/games/ArrangeTimeline.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { t } from "@/lib/translations";

interface TimelineEvent {
  id: number;
  text: string;
  year: string;
  correctPosition: number;
  currentPosition: number;
  isCorrect?: boolean;
}

interface ArrangeTimelineProps {
  data: {
    instructions: string;
    events: TimelineEvent[];
  };
  onComplete: (result: any) => void;
  lobbyId?: number;
}

const ArrangeTimeline = ({ data, onComplete, lobbyId }: ArrangeTimelineProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    correctOrder: boolean;
  } | null>(null);
  
  useEffect(() => {
    // Skip initialization if already submitted to prevent reshuffling
    if (isSubmitted) return;
    
    // Check if we have custom events from the teacher
    if ((window as any).customEvents) {
      try {
        const customEventsString = (window as any).customEvents;
        // Parse the custom events from the format: "Year|Event Description"
        const eventLines = customEventsString.split('\n').filter((line: string) => line.trim() !== '');
        
        if (eventLines.length > 0) {
          const customEvents = eventLines.map((line: string, index: number) => {
            const [year, text] = line.split('|');
            return {
              id: index + 1,
              year: year.trim(),
              text: text.trim(),
              correctPosition: index,
              currentPosition: 0
            };
          });
          
          // Shuffle the custom events
          const shuffled = [...customEvents].sort(() => Math.random() - 0.5);
          setEvents(shuffled.map((event, index) => ({ ...event, currentPosition: index })));
          return;
        }
      } catch (error) {
        console.error("Error parsing custom events:", error);
      }
    }
    
    // If no custom events, use provided or default data
    if (!data?.events) {
      // Set default data if not provided
      const defaultEvents = [
        { id: 1, text: t("No timeline events configured. Please contact your teacher."), year: "2024", correctPosition: 0 },
        { id: 2, text: t("Timeline events need to be added by the teacher."), year: "2025", correctPosition: 1 },
      ];
      
      // Shuffle the events
      const shuffled = [...defaultEvents].sort(() => Math.random() - 0.5);
      setEvents(shuffled.map((event, index) => ({ ...event, currentPosition: index })));
    } else {
      // Shuffle the events
      const shuffled = [...data.events].sort(() => Math.random() - 0.5);
      setEvents(shuffled.map((event, index) => ({ ...event, currentPosition: index })));
    }
  }, [data, isSubmitted]);

  const handleDragStart = (event: TimelineEvent) => {
    // Prevent dragging if game is already submitted
    if (isSubmitted) return;
    
    setIsDragging(true);
    setDraggedEvent(event);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedEvent(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (targetEvent: TimelineEvent) => {
    // Prevent dropping if game is already submitted or no dragged event
    if (isSubmitted || !draggedEvent || draggedEvent.id === targetEvent.id) return;
    
    // Get the indices for the dragged and target events
    const draggedIndex = events.findIndex(e => e.id === draggedEvent.id);
    const targetIndex = events.findIndex(e => e.id === targetEvent.id);
    
    // Create a new array to avoid mutation
    const newEvents = [...events];
    
    // Remove the dragged item
    const [draggedItem] = newEvents.splice(draggedIndex, 1);
    
    // Insert it at the target position
    newEvents.splice(targetIndex, 0, draggedItem);
    
    // Update currentPosition based on new array order
    const updatedEvents = newEvents.map((event, index) => ({
      ...event,
      currentPosition: index
    }));
    
    setEvents(updatedEvents);
    handleDragEnd();
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    
    // Check answers without changing the order
    const correctOrder = events.every((event, index) => event.correctPosition === index);
    
    // Mark events as correct/incorrect without resorting them
    const correctEvents = events.map((event, index) => ({
      ...event,
      isCorrect: event.correctPosition === index
    }));
    
    // Set the events with correct/incorrect flags but maintain current order
    setEvents(correctEvents);
    
    // Calculate score
    const correctCount = correctEvents.filter(event => event.isCorrect).length;
    
    setResult({
      correct: correctCount,
      total: events.length,
      correctOrder
    });
    
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
    
    // After 3 seconds, complete the game
    setTimeout(() => {
      onComplete({
        gameType: 'timeline',
        correct: correctCount,
        total: events.length,
        correctOrder
      });
      
      toast({
        title: "Nakumpleto ang laro!",
        description: correctOrder 
          ? "Perpekto! Naiayos mo lahat ng pangyayari sa tamang pagkakasunod-sunod." 
          : `Nakakuha ka ng ${correctCount} mula sa ${events.length} pangyayari sa tamang posisyon.`,
      });
    }, 3000);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-2">Ayusin ang mga makasaysayang pangyayari</h2>
          <p className="text-muted-foreground mb-6">{data?.instructions || "Ayusin ang mga makasaysayang pangyayari ayon sa pagkakasunod-sunod."}</p>
          
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                draggable={!isSubmitted}
                onDragStart={() => handleDragStart(event)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(event)}
                className={`p-4 rounded-md border transition-all ${
                  isSubmitted 
                    ? event.isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-red-500 bg-red-50 dark:bg-red-950/30'
                    : isDragging && draggedEvent?.id === event.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 cursor-grab'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {isSubmitted && (
                      <span className={`mr-2 ${event.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                        {event.isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </span>
                    )}
                    <span className="text-lg">{event.text}</span>
                  </div>
                  {isSubmitted && (
                    <Badge variant="secondary">{event.year}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              className="mt-6 w-full"
            >
              Ipasa ang Pagkakasunod-sunod
            </Button>
          ) : (
            <Alert className={`mt-6 ${
              result?.correctOrder 
                ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                : 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
            }`}>
              <AlertDescription>
                {result?.correctOrder 
                  ? "Perpekto! Naiayos mo lahat ng pangyayari sa tamang pagkakasunod-sunod." 
                  : `Nakakuha ka ng ${result?.correct} mula sa ${result?.total} pangyayari sa tamang posisyon.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArrangeTimeline;