// client/src/components/games/TamaAngAyos.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Check, X, Move, ListFilter } from "lucide-react";
import { t } from "@/lib/translations";

interface Item {
  id: number;
  text: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  description?: string | undefined;
}

interface TamaAngAyosProps {
  data?: {
    categories: Category[];
    items: Item[];
  };
  onComplete: (result: any) => void;
  lobbyId?: number;
}

interface CategoryResult {
  totalItems: number;
  correctItems: number;
}

interface GameResult {
  correctCount: number;
  totalItems: number;
  accuracy: number;
  categoryResults: Record<string, CategoryResult>;
  timeUsed: number;
}

const TamaAngAyos = ({ data, onComplete, lobbyId }: TamaAngAyosProps) => {
  const { toast } = useToast();
  
  // Minimal fallback data if none is provided
  const defaultData = {
    categories: [
      { id: 1, name: t("Category A"), description: t("Items for category A") },
      { id: 2, name: t("Category B"), description: t("Items for category B") }
    ],
    items: [
      { id: 1, text: t("No items have been configured for this game."), categoryId: 1 },
      { id: 2, text: t("Please contact your teacher to set up this activity."), categoryId: 2 }
    ]
  };

  // Custom data from teacher (to be loaded in useEffect)
  const [customGameData, setCustomGameData] = useState<{categories: Category[], items: Item[]} | null>(null);
  
  // Use custom data if available, otherwise use data from props or default
  const gameData = customGameData || data || defaultData;
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsRemaining, setItemsRemaining] = useState<Item[]>([]);
  const [categorizedItems, setCategorizedItems] = useState<Record<string, Item[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [timerActive, setTimerActive] = useState(true);
  
  // Check for custom game data from teacher or fetch from API if lobbyId is provided
  useEffect(() => {
    // First check for lobbyId and fetch data from API
    if (lobbyId) {
      console.log("Fetching game data for lobby", lobbyId);
      
      // Fetch the lobby data from the API
      fetch(`/api/lobbies/${lobbyId}`, {
        credentials: 'include'
      })
      .then(res => res.json())
      .then(lobbyData => {
        console.log("Lobby data:", lobbyData);
        
        // Extract custom categories and items from lobby data
        if (lobbyData.customCategories && lobbyData.customItems) {
          const categoriesRaw = lobbyData.customCategories;
          const itemsRaw = lobbyData.customItems;
          
          console.log("Found API categories and items for TamaAngAyos game");
          console.log("Raw API categories:", categoriesRaw);
          console.log("Raw API items:", itemsRaw);
          
          try {
            parseAndSetGameData(categoriesRaw, itemsRaw);
          } catch (error) {
            console.error("Error parsing API game data:", error);
          }
        } else {
          console.log("No custom data found in API response");
        }
      })
      .catch(error => {
        console.error("Error fetching lobby data:", error);
      });
    }
    
    // Then check window object for custom data (fallback or for testing)
    if ((window as any).customCategories && (window as any).customItems) {
      try {
        console.log("Found window custom categories and items");
        const categoriesRaw = (window as any).customCategories;
        const itemsRaw = (window as any).customItems;
        
        parseAndSetGameData(categoriesRaw, itemsRaw);
      } catch (error) {
        console.error("Error parsing window game data:", error);
      }
    } else {
      // Fallback to props data if available
      if (data) {
        console.log("Using provided props data as no custom data found");
        setCustomGameData(data);
      } else if (!lobbyId) {
        console.log("No custom data sources available, using default data");
      }
    }
  }, [data, lobbyId]);
  
  // Helper function to parse and set game data
  const parseAndSetGameData = (categoriesRaw: string, itemsRaw: string) => {
    console.log("Parsing categories:", categoriesRaw);
    console.log("Parsing items:", itemsRaw);
    
    // Parse categories - now just category names, one per line
    const categoryLines = categoriesRaw.split('\n').filter((line: string) => line.trim() !== '');
    const parsedCategories: Category[] = categoryLines.map((categoryName, index) => {
      return {
        id: index + 1, // Category ID is the index + 1
        name: categoryName.trim(),
        description: undefined
      };
    });
    
    // Parse items format: "ItemText|CategoryID"
    const itemLines = itemsRaw.split('\n').filter((line: string) => line.trim() !== '');
    const parsedItems: Item[] = itemLines
      .map((line: string, index: number) => {
        const parts = line.split('|');
        if (parts.length < 2) {
          console.error("Invalid item format. Expected: ItemText|CategoryID, got:", line);
          return null;
        }
        
        const text = parts[0].trim();
        let categoryId: number;
        
        try {
          categoryId = parseInt(parts[1].trim());
          if (isNaN(categoryId) || categoryId < 1 || categoryId > parsedCategories.length) {
            console.error(`Invalid category ID: ${parts[1]}. Must be between 1 and ${parsedCategories.length}`);
            return null;
          }
        } catch (e) {
          console.error(`Failed to parse category ID: ${parts[1]}`);
          return null;
        }
        
        return {
          id: index + 1, // Item ID is just the index + 1
          text: text,
          categoryId: categoryId
        };
      })
      .filter((item) => item !== null) as Item[];
    
    console.log("Parsed categories:", parsedCategories);
    console.log("Parsed items:", parsedItems);
    
    if (parsedCategories.length > 0 && parsedItems.length > 0) {
      const gameDataObj = {
        categories: parsedCategories,
        items: parsedItems
      };
      console.log("Setting custom game data:", gameDataObj);
      setCustomGameData(gameDataObj);
    } else {
      console.error("Failed to load custom data: No valid categories or items found");
    }
  };
  
  // Initialize the game - but only once to avoid reshuffling on re-renders
  useEffect(() => {
    if (gameData) {
      console.log("Game data updated, reinitializing game with:", gameData);
      setCategories(gameData.categories);
      
      // Always update items when gameData changes to ensure using the correct custom data
      // Use a more stable shuffling algorithm with a fixed seed for consistency
      const shuffledItems = [...gameData.items];
      // Fisher-Yates shuffle with fixed seed
      const shuffleSeed = Date.now(); // Use a fixed timestamp as seed
      let currentIndex = shuffledItems.length;
      let pseudoRandomIndex = 0;
      
      while (currentIndex !== 0) {
        // Use a deterministic pseudo-random calculation based on seed and current index
        pseudoRandomIndex = Math.floor((shuffleSeed % currentIndex) + (currentIndex / 2)) % currentIndex;
        currentIndex--;
        
        // Swap elements
        [shuffledItems[currentIndex], shuffledItems[pseudoRandomIndex]] = 
        [shuffledItems[pseudoRandomIndex], shuffledItems[currentIndex]];
      }
      
      // Log what we're setting to help with debugging
      console.log("Setting items to:", shuffledItems);
      
      setItems(shuffledItems);
      setItemsRemaining(shuffledItems);
      
      // Initialize empty categorized items
      const initialCategorized: Record<string, Item[]> = {};
      gameData.categories.forEach(category => {
        initialCategorized[category.id] = [];
      });
      setCategorizedItems(initialCategorized);
    }
  }, [gameData]); // Only react to gameData changes, not any other state
  
  // Timer functionality
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeRemaining > 0 && !isSubmitted) {
      timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0 && !isSubmitted) {
      // Time's up, auto-submit
      handleSubmit();
    }
    
    return () => clearTimeout(timer);
  }, [timeRemaining, timerActive, isSubmitted]);
  
  const handleDragStart = (item: Item) => {
    setDraggedItem(item);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };
  
  const handleDrop = (categoryId: number) => {
    if (!draggedItem) return;
    
    console.log("Dropping item:", draggedItem, "into category:", categoryId);
    
    // Create a deep copy of the categorizedItems to work with
    const updatedCategorizedItems = JSON.parse(JSON.stringify(categorizedItems));
    
    // Check if it's from the remaining items
    if (itemsRemaining.some(item => item.id === draggedItem.id)) {
      console.log("Item is from remaining items, removing from remaining");
      // Remove from remaining items
      setItemsRemaining(prevItems => prevItems.filter(item => item.id !== draggedItem.id));
    } else {
      // It's already in a category, find and remove it
      console.log("Item is already in a category, finding and removing");
      let foundInCategory = false;
      
      Object.keys(updatedCategorizedItems).forEach(catId => {
        const catIdNum = parseInt(catId);
        if (updatedCategorizedItems[catIdNum]?.some((item: Item) => item.id === draggedItem!.id)) {
          // Don't remove if dropping in the same category
          if (catIdNum !== categoryId) {
            console.log(`Removing from category ${catIdNum}`);
            updatedCategorizedItems[catIdNum] = updatedCategorizedItems[catIdNum].filter(
              (item: Item) => item.id !== draggedItem!.id
            );
            foundInCategory = true;
          } else {
            // Cancel the operation if dropping in the same category
            console.log("Dropping in same category, cancelling");
            setDraggedItem(null);
            return;
          }
        }
      });
      
      // If it wasn't found in any category (shouldn't happen, but just in case),
      // add it to the new category without removing from anywhere
      if (!foundInCategory) {
        console.warn("Item was not found in any category or remaining items", draggedItem);
      }
    }
    
    // Add to the target category
    if (!updatedCategorizedItems[categoryId]) {
      updatedCategorizedItems[categoryId] = [];
    }
    
    console.log(`Adding item to category ${categoryId}`);
    // Make a deep copy of the dragged item to avoid reference issues
    const itemCopy = JSON.parse(JSON.stringify(draggedItem));
    updatedCategorizedItems[categoryId] = [...updatedCategorizedItems[categoryId], itemCopy];
    
    console.log("Updated categorized items:", updatedCategorizedItems);
    
    // Update the state with the modified categories
    setCategorizedItems(updatedCategorizedItems);
    
    // Reset dragged item
    setDraggedItem(null);
  };
  
  const handleRemoveItem = (categoryId: number, itemId: number) => {
    console.log(`Removing item ${itemId} from category ${categoryId}`);
    
    // Find the item in the category before removing it
    const itemToReturn = categorizedItems[categoryId].find((item: Item) => item.id === itemId);
    
    // Remove from category - use deep copy to avoid reference issues
    const updatedCategorizedItems = JSON.parse(JSON.stringify(categorizedItems));
    updatedCategorizedItems[categoryId] = updatedCategorizedItems[categoryId].filter((item: Item) => item.id !== itemId);
    setCategorizedItems(updatedCategorizedItems);
    
    // Add back to remaining items
    if (itemToReturn) {
      console.log("Adding item back to remaining items:", itemToReturn);
      
      // Make a deep copy to avoid reference issues
      const itemCopy = JSON.parse(JSON.stringify(itemToReturn));
      setItemsRemaining(prevItems => [...prevItems, itemCopy]);
    } else {
      console.error(`Item ${itemId} not found in category ${categoryId}`);
    }
  };
  
  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimerActive(false);
    
    // Calculate results
    let correctCount = 0;
    let totalItems = 0;
    const categoryResults: Record<string, CategoryResult> = {};
    
    console.log("Categorized items for scoring:", categorizedItems);
    
    Object.keys(categorizedItems).forEach(categoryId => {
      const catIdNum = parseInt(categoryId);
      const categoryItems = categorizedItems[catIdNum] || [];
      
      console.log(`Items in category ${catIdNum}:`, categoryItems);
      
      // Check each item if it belongs to this category
      const correctItems = categoryItems.filter(item => {
        const match = item.categoryId === catIdNum;
        console.log(`Item ${item.id} (${item.text}): categoryId=${item.categoryId}, current category=${catIdNum}, match=${match}`);
        return match;
      });
      
      categoryResults[categoryId] = {
        totalItems: categoryItems.length,
        correctItems: correctItems.length,
      };
      
      correctCount += correctItems.length;
      totalItems += categoryItems.length;
    });
    
    // Calculate accuracy based on the items that were placed in categories (totalItems),
    // not all available items, as some may not have been used
    const finalResult: GameResult = {
      correctCount,
      totalItems, // Use totalItems from categorized items, not items.length
      accuracy: totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0,
      categoryResults,
      timeUsed: 180 - timeRemaining,
    };
    
    setResult(finalResult);
    
    // Submit score to the server if lobbyId is provided
    if (lobbyId) {
      fetch(`/api/lobbies/${lobbyId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: correctCount,
          completionTime: finalResult.timeUsed
        }),
        credentials: 'include'
      }).catch(error => {
        console.error('Error submitting score:', error);
      });
    }
    
    // After 3 seconds, complete the game
    setTimeout(() => {
      onComplete({
        gameType: 'sorting',
        correct: correctCount,
        total: totalItems,
        timeUsed: 180 - timeRemaining,
      });
      
      toast({
        title: "Natapos na ang Pag-aayos!",
        description: `Nakakuha ka ng ${correctCount} mula sa ${totalItems} (${finalResult.accuracy}% ang kawastuhan)`,
      });
    }, 3000);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === parseInt(categoryId)) || { name: 'Unknown', id: 0 };
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <ListFilter className="h-6 w-6 mr-2 text-primary" />
            <h2 className="text-2xl font-bold">Tama ang Ayos</h2>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            <span className={`font-medium ${timeRemaining < 30 ? 'text-red-500 font-bold' : 'text-primary'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        <Progress 
          value={(timeRemaining / 180) * 100}
          className="h-2"
          style={{
            ['--progress-foreground' as any]: timeRemaining > 120 ? 'hsl(var(--green-500))' : 
                                           timeRemaining > 60 ? 'hsl(var(--blue-500))' : 
                                           timeRemaining > 30 ? 'hsl(var(--amber-500))' : 
                                           'hsl(var(--red-500))'
          }}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Items Pool */}
        <div>
          <Card 
            className="h-full"
            onDragOver={handleDragOver}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Mga Aytem</CardTitle>
                <Badge variant="secondary">{itemsRemaining.length} natitira</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              {itemsRemaining.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  className="bg-muted/40 p-3 rounded-md border border-border hover:border-primary transition-colors cursor-grab flex items-center"
                >
                  <Move className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
              
              {itemsRemaining.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Lahat ng mga aytem ay naisaayos na!</p>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Button
                onClick={handleSubmit}
                disabled={itemsRemaining.length > 0 || isSubmitted}
                className="w-full"
              >
                {itemsRemaining.length > 0 ? 'I-ayos muna ang lahat ng aytem' : 'Ipasa ang mga Sagot'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Categories */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => (
              <Card 
                key={category.id} 
                className="h-full"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(category.id)}
              >
                <CardHeader className="pb-3 bg-primary/5">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  {category.description && (
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  )}
                </CardHeader>
                
                <CardContent className="min-h-[150px]">
                  {categorizedItems[category.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {categorizedItems[category.id].map(item => (
                        <div 
                          key={item.id}
                          draggable={!isSubmitted}
                          onDragStart={() => handleDragStart(item)}
                          className={`rounded-md p-3 flex justify-between items-center ${
                            isSubmitted 
                              ? item.categoryId === category.id
                                ? 'bg-green-50 border border-green-500 dark:bg-green-950/30'
                                : 'bg-red-50 border border-red-500 dark:bg-red-950/30'
                              : 'bg-background border border-border hover:border-primary transition-colors cursor-grab'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {!isSubmitted && <Move className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            <span className="text-sm">{item.text}</span>
                          </div>
                          
                          {isSubmitted ? (
                            <span className={item.categoryId === category.id ? 'text-green-500' : 'text-red-500'}>
                              {item.categoryId === category.id ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleRemoveItem(category.id, item.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 ml-2"
                              title="Alisin ang aytem"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        {isSubmitted ? 'Walang aytem na nakalagay dito' : 'I-drag ang mga aytem dito'}
                      </p>
                    </div>
                  )}
                </CardContent>
                
                {isSubmitted && (
                  <CardFooter className="flex justify-between items-center border-t bg-muted/20">
                    <span className="text-sm text-muted-foreground">Tama:</span>
                    <Badge variant="secondary" className={
                      (result?.categoryResults[category.id]?.correctItems || 0) === (result?.categoryResults[category.id]?.totalItems || 0) && 
                      (result?.categoryResults[category.id]?.totalItems || 0) > 0
                      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
                      : ""
                    }>
                      {result?.categoryResults[category.id]?.correctItems || 0}/{result?.categoryResults[category.id]?.totalItems || 0}
                    </Badge>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      {/* Results */}
      {isSubmitted && result && (
        <Alert className={`mt-6 ${
          result.accuracy >= 80 ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
          result.accuracy >= 60 ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
          'bg-red-50 border-red-500 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        }`}>
          <AlertTitle className="text-lg">Mga Resulta</AlertTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            <Card className="bg-background">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Iskor</p>
                <p className="text-3xl font-bold text-primary">{result.correctCount}/{result.totalItems}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-background">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Kawastuhan</p>
                <p className={`text-3xl font-bold ${
                  result.accuracy >= 80 ? 'text-green-600' :
                  result.accuracy >= 60 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {result.accuracy}%
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-background">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Oras na Ginamit</p>
                <p className="text-3xl font-bold text-blue-600">{formatTime(result.timeUsed)}</p>
              </CardContent>
            </Card>
          </div>
          
          <AlertDescription className="text-center">
            {result.accuracy >= 90 ? 'Mahusay! Napakagaling mo sa paksang ito.' :
             result.accuracy >= 80 ? 'Magaling! Maayos ang iyong pag-unawa sa paksang ito.' :
             result.accuracy >= 60 ? 'Magaling na pagsisikap! Sa kaunting pag-aaral pa, mabibisahan mo ang paksang ito.' :
             'Patuloy na magsanay! Aralin muli ang paksa at sumubok ulit upang mapabuti ang iyong iskor.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TamaAngAyos;