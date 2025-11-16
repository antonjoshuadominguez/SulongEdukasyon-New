import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useState, useMemo } from "react";
import { 
  Plus,
  RefreshCw,
  Grid,
  List,
  Search,
  ListFilter,
  X,
  SortAsc,
  Calendar as CalendarIcon,
  FileText,
  Gamepad2
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GameCard from './game-card';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const { toast } = useToast();
  const [lobbyCode, setLobbyCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'' | 'name' | 'date' | 'type'>('');

  // Define interface for the game lobby data
  interface GameLobby {
    id: number;
    name: string;
    description?: string;
    gameType: string;
    lobbyCode: string;
    status: string;
    createdAt: string;
    participantCount?: number;
  }

  // Query active game lobbies
  const { 
    data: activeGameLobbies = [],
    refetch: refetchLobbies 
  } = useQuery<GameLobby[]>({
    queryKey: ["/api/lobbies/student"],
    enabled: !!user && user.role === "student",
    refetchInterval: 5000, // Auto-refresh every 5 seconds to catch newly activated lobbies
  });

  // Join lobby mutation
  const joinLobbyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/lobbies/join-by-code", { code });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join game lobby");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Reset the input field
      setLobbyCode("");
      // Invalidate the cache to refetch active game lobbies
      queryClient.invalidateQueries({ queryKey: ["/api/lobbies/student"] });
      // Immediately refetch the lobbies without waiting for automatic refresh
      refetchLobbies();
      // Show success message
      toast({
        title: "Tagumpay!",
        description: "Matagumpay na sumali sa laro.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "May Mali",
        description: error.message || "Hindi makapasok sa laro",
        variant: "destructive",
      });
    },
  });

  const handleJoinLobby = () => {
    if (!lobbyCode) {
      toast({
        title: "May Mali",
        description: "Kailangan mo ng lobby code para sumali",
        variant: "destructive",
      });
      return;
    }

    joinLobbyMutation.mutate(lobbyCode);
  };
  
  // Apply filters and search to lobbies
  const filteredLobbies = useMemo(() => {
    let result = [...activeGameLobbies];
    
    // Apply search filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(lobby => 
        lobby.name.toLowerCase().includes(lowercasedTerm) || 
        (lobby.description && lobby.description.toLowerCase().includes(lowercasedTerm)) ||
        lobby.gameType.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    // Apply sorting based on filter type
    if (filterType) {
      switch (filterType) {
        case 'name':
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'date':
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'type':
          result.sort((a, b) => a.gameType.localeCompare(b.gameType));
          break;
      }
    }
    
    return result;
  }, [activeGameLobbies, searchTerm, filterType]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Mga Aktibong Laro</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={() => {
              refetchLobbies();
              toast({
                title: "Nire-refresh ang laro",
                description: "Mga laro ay inire-refresh",
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            I-refresh
          </Button>
        </div>
        
        {/* Filter and search controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Maghanap ng laro..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex gap-2 items-center">
                  <ListFilter className="h-4 w-4" />
                  {filterType === 'name' ? 'Pangalan' : 
                   filterType === 'date' ? 'Petsa' : 
                   filterType === 'type' ? 'Uri ng Laro' : 
                   'Ayusin'
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterType('')}>
                  <SortAsc className="h-4 w-4 mr-2" />
                  Lahat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('name')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Pangalan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('date')}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Petsa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('type')}>
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Uri ng Laro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="border rounded-md flex">
              <Button 
                variant={viewType === 'grid' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none px-2"
                onClick={() => setViewType('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewType === 'list' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none px-2"
                onClick={() => setViewType('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Lobbies Container */}
      <div className={viewType === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" 
        : "flex flex-col gap-4 mb-8"
      }>
        {/* Join Lobby Card - Always First */}
        <Card className="overflow-hidden border border-dashed border-neutral-300 hover:border-primary hover:shadow-md transition-all">
          <div className="h-40 bg-neutral-50 flex items-center justify-center">
            <div className="w-24 h-24 text-neutral-400 bg-neutral-100 rounded-full flex items-center justify-center">
              <Plus size={64} />
            </div>
          </div>
          <CardContent className="pt-4">
            <h3 className="text-lg font-bold">+ Sumali sa Laro</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Ilagay ang Lobby Code
            </p>
            <div className="mt-4">
              <Input 
                placeholder="Ilagay ang Lobby Code"
                className="bg-neutral-50 placeholder:text-neutral-400"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinLobby();
                  }
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleJoinLobby}
              disabled={joinLobbyMutation.isPending}
            >
              {joinLobbyMutation.isPending ? "Naglo-load..." : "Sumali"}
            </Button>
          </CardFooter>
        </Card>

        {/* Active Game Lobbies */}
        {filteredLobbies.length > 0 ? (
          filteredLobbies.map(lobby => (
            <GameCard key={lobby.id} lobby={lobby} viewType={viewType} />
          ))
        ) : activeGameLobbies.length > 0 && searchTerm ? (
          // No search results
          <div className="col-span-1 md:col-span-2 p-12 text-center bg-neutral-50 rounded-lg border border-neutral-100">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-800 mb-2">Walang nahanap na resulta</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Walang nahanap na laro para sa "{searchTerm}". Subukan muli gamit ang ibang salita.
            </p>
          </div>
        ) : (
          // Empty state when no active game lobbies
          <div className="col-span-1 md:col-span-2 p-12 text-center bg-neutral-50 rounded-lg border border-neutral-100">
            <Gamepad2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-800 mb-2">Walang Aktibong Laro</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              Wala pang aktibong laro na magagamit. Sumali sa isang laro gamit ang lobby code na ibinigay ng iyong guro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
