import React, { useState, useMemo, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '../../lib/queryClient';
import { useAuth } from '../../hooks/use-auth';
import { useLanguage } from '../../hooks/use-language';
import { useToast } from '../../hooks/use-toast';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { 
  PlusCircle, 
  Trophy, 
  ListFilter, 
  Loader2, 
  SchoolIcon, 
  X,
  Search,
  Calendar,
  Grid,
  List,
  MoreHorizontal,
  Copy,
  Users,
  Settings,
  ExternalLink,
  Gamepad2,
  SortAsc
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import LobbyCard from './lobby-card';
import CreateLobbyModal from './create-lobby-modal';
import ManageLobbyModal from './manage-lobby-modal';
import LeaderboardModal from './leaderboard-modal';
import Leaderboard from '../../components/leaderboard';

// Context for sharing dashboard state with child components
type TeacherDashboardContextType = {
  viewType: 'grid' | 'list';
};

const TeacherDashboardContext = createContext<TeacherDashboardContextType>({
  viewType: 'grid'
});

function useTeacherDashboardContext() {
  return useContext(TeacherDashboardContext);
}

// List view component for lobbies
function ListLobbyCard({ lobby }: { lobby: any }) {
  const { translate, language } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatGameType = (type: string) => {
    switch (type) {
      case 'picture_puzzle': return 'Picture Puzzle';
      case 'picture_matching': return 'Picture Matching';
      case 'arrange_timeline': return 'Arrange Timeline';
      case 'explain_image': return 'Explain Image';
      case 'fill_blanks': return 'Fill Blanks';

      case 'tama_ang_ayos': return 'Tama ang Ayos';
      case 'true_or_false': return 'True or False';
      default: return type;
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobby.lobbyCode);
    toast({
      title: translate("Code copied"),
      description: translate("Lobby code copied to clipboard"),
    });
  };
  
  const handleStart = () => {
    window.location.href = `/game/${lobby.id}`;
  };
  
  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch border rounded-md overflow-hidden hover:border-primary hover:shadow-sm transition-all">
        <div className="flex-grow p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-grow">
            <div className="flex items-center">
              <h3 className="font-semibold">{lobby.name}</h3>
              <div className="flex ml-2 space-x-1">
                <Badge variant="secondary">{translate(formatGameType(lobby.gameType))}</Badge>
                <Badge variant={lobby.status === 'active' ? 'default' : (lobby.status === 'completed' ? 'secondary' : 'outline')}>
                  {translate(lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1))}
                </Badge>
              </div>
            </div>
            
            {lobby.description && (
              <p className="text-sm text-muted-foreground mt-1">{lobby.description}</p>
            )}
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            <div className="flex items-center text-sm text-muted-foreground gap-1 mr-3">
              <Gamepad2 className="h-4 w-4" />
              <span>{lobby.lobbyCode}</span>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground gap-1 mr-3">
              <Users className="h-4 w-4" />
              <span>{lobby.participantCount || 0}</span>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(lobby.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l">
          <Button variant="ghost" size="sm" className="flex-1 h-10 rounded-none" onClick={handleStart}>
            <ExternalLink className="h-4 w-4 mr-2" />
            <span>{translate("Open")}</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 rounded-none">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsManageModalOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                {translate("Manage")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsLeaderboardModalOpen(true)}>
                <Trophy className="mr-2 h-4 w-4" />
                {translate("Leaderboard")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyCode}>
                <Copy className="mr-2 h-4 w-4" />
                {translate("Copy code")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Modals */}
      <ManageLobbyModal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        lobbyId={lobby.id} 
      />
      
      <LeaderboardModal 
        isOpen={isLeaderboardModalOpen} 
        onClose={() => setIsLeaderboardModalOpen(false)} 
        lobbyId={lobby.id} 
      />
    </>
  );
}

interface RenderGameLobbiesProps {
  lobbies: any[];
  isLoading: boolean;
  status: string;
}

function RenderGameLobbies({ lobbies, isLoading, status }: RenderGameLobbiesProps) {
  const { translate } = useLanguage();
  const { viewType } = useTeacherDashboardContext();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (lobbies.length === 0) {
    const emptyStateMessages = {
      active: translate("You don't have any active game lobbies. Create one to get started."),
      completed: translate("You don't have any completed game lobbies yet."),
      all: translate("You don't have any game lobbies yet. Create one to get started.")
    };
    
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <SchoolIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {status === 'active' ? translate("No Active Game Lobbies") :
           status === 'completed' ? translate("No Completed Game Lobbies") :
           translate("No Game Lobbies Found")}
        </h3>
        <p className="text-muted-foreground mb-4">
          {emptyStateMessages[status as keyof typeof emptyStateMessages]}
        </p>
        
        {(status === 'active' || status === 'all') && (
          <CreateLobbyModal 
            trigger={
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" /> 
                {translate("Create Game Lobby")}
              </Button>
            }
          />
        )}
      </div>
    );
  }
  
  // Grid View (default)
  if (viewType === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lobbies.map((lobby) => (
          <LobbyCard key={lobby.id} lobby={lobby} />
        ))}
      </div>
    );
  }
  
  // List View
  return (
    <div className="space-y-2">
      {lobbies.map((lobby) => (
        <ListLobbyCard key={lobby.id} lobby={lobby} />
      ))}
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const [currentTab, setCurrentTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'' | 'name' | 'date' | 'type'>('');
  
  // Fetch the teacher's lobbies
  const { data: lobbies, isLoading } = useQuery({
    queryKey: ['/api/teacher/lobbies'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/teacher/lobbies');
      return await res.json();
    }
  });
  
  // Filter and sort lobbies based on the current tab and sort/filter options
  const filteredLobbies = useMemo(() => {
    if (!lobbies) return [];
    
    // First, filter the lobbies
    const filtered = lobbies.filter((lobby: any) => {
      // Filter by tab (status)
      if (currentTab === 'active' && lobby.status !== 'active') return false;
      if (currentTab === 'completed' && lobby.status !== 'completed') return false;
      
      // Filter by search term (name or description)
      if (searchTerm && !lobby.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          (!lobby.description || !lobby.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }
      
      return true;
    });
    
    // Then, sort the lobbies based on the selected filter type
    if (filterType === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterType === 'date') {
      return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filterType === 'type') {
      return [...filtered].sort((a, b) => a.gameType.localeCompare(b.gameType));
    }
    
    // Default sort by date (newest first)
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lobbies, currentTab, searchTerm, filterType]);
  
  // Get counts for each category
  const activeCount = lobbies?.filter((lobby: any) => lobby.status === 'active').length || 0;
  const completedCount = lobbies?.filter((lobby: any) => lobby.status === 'completed').length || 0;
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('');
  };
  
  return (
    <TeacherDashboardContext.Provider value={{ viewType }}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {translate("Welcome")}, {user?.fullName || user?.username}!
            </h2>
            <p className="text-muted-foreground">
              {translate("Manage your game lobbies and view student statistics")}
            </p>
          </div>
          
          <CreateLobbyModal 
            trigger={
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                {translate("Create Game Lobby")}
              </Button>
            }
          />
        </div>
        
        <Tabs defaultValue="active" value={currentTab} onValueChange={setCurrentTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="active" className="flex items-center space-x-1">
                <span>{translate("Active")}</span>
                {activeCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2">
                    {activeCount}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger value="completed" className="flex items-center space-x-1">
                <span>{translate("Completed")}</span>
                {completedCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2">
                    {completedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                <span>{translate("All")}</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={translate("Search...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 w-[180px] md:w-[200px] lg:w-[250px]"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-9 w-9 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear</span>
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ListFilter className="h-4 w-4 mr-2" />
                      {translate("Sort By")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterType('name')}>
                      <SortAsc className="mr-2 h-4 w-4" />
                      {translate("Name")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType('date')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {translate("Date Added")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterType('type')}>
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      {translate("Game Type")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {filterType && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFilterType('')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {translate("Clear")}
                  </Button>
                )}
              </div>
              
              <div className="flex border rounded-md overflow-hidden">
                <Button 
                  variant={viewType === 'grid' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="rounded-none px-2"
                  onClick={() => setViewType('grid')}
                >
                  <Grid className="h-4 w-4" />
                  <span className="sr-only">{translate("Grid View")}</span>
                </Button>
                <Button 
                  variant={viewType === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="rounded-none px-2"
                  onClick={() => setViewType('list')}
                >
                  <List className="h-4 w-4" />
                  <span className="sr-only">{translate("List View")}</span>
                </Button>
              </div>
            </div>
          </div>
          
          <TabsContent value="active" className="mt-0">
            <RenderGameLobbies lobbies={filteredLobbies} isLoading={isLoading} status="active" />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            <RenderGameLobbies lobbies={filteredLobbies} isLoading={isLoading} status="completed" />
          </TabsContent>
          
          <TabsContent value="all" className="mt-0">
            <RenderGameLobbies lobbies={filteredLobbies} isLoading={isLoading} status="all" />
          </TabsContent>
        </Tabs>
      </div>
    </TeacherDashboardContext.Provider>
  );
}