import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface LeaderboardProps {
  gameType: string;
  lobbyId?: number;
}

export default function Leaderboard({ gameType, lobbyId }: LeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Define query endpoint based on props
  const queryEndpoint = lobbyId 
    ? `/api/scores/lobby/${lobbyId}`
    : `/api/leaderboard/${gameType === 'all' ? 'picture_puzzle' : gameType}`;

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error } = useQuery<any[]>({
    queryKey: [queryEndpoint],
    enabled: gameType !== '',
  });

  // If there's a gameType filter and it's not "all", filter the data
  const filteredData = leaderboardData && Array.isArray(leaderboardData) && gameType !== 'all' && !lobbyId
    ? leaderboardData.filter((entry: any) => entry.lobby?.gameType === gameType)
    : leaderboardData;

  // Calculate pagination
  const totalPages = filteredData && Array.isArray(filteredData) ? Math.ceil(filteredData.length / itemsPerPage) : 0;
  const paginatedData = filteredData && Array.isArray(filteredData)
    ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  // Format game type for display
  const formatGameType = (type: string) => {
    switch (type) {
      case 'picture_puzzle':
        return 'Picture Puzzle';
      case 'picture_matching':
        return 'Picture Matching';
      case 'true_or_false':
        return 'True or False';
      case 'explain_image':
        return 'Explain Image';
      case 'fill_blanks':
        return 'Fill Blanks';
      case 'arrange_timeline':
        return 'Arrange Timeline';
      case 'tama_ang_ayos':
        return 'Tama ang Ayos';
      default:
        return type;
    }
  };

  // Format timestamp
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format completion time (seconds to mm:ss)
  const formatTime = (seconds: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-10">
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-neutral-500">
            {error 
              ? "There was an error loading the leaderboard data."
              : "There are no scores recorded for this game type yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Game</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Completion Time</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((entry: any, index: number) => (
                <TableRow key={entry.id} className="hover:bg-neutral-50">
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full 
                        ${index === 0 ? 'bg-primary-light text-white' : 
                          index === 1 ? 'bg-yellow-400 text-neutral-900' : 
                            index === 2 ? 'bg-orange-500 text-white' : 
                              'bg-neutral-200 text-neutral-500'} font-bold`}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center">
                        {entry.user?.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">{entry.user?.fullName}</div>
                        <div className="text-xs text-neutral-500">{entry.user?.class}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${entry.lobby?.gameType === 'picture_puzzle' ? 'bg-green-100 text-green-800' : 
                        entry.lobby?.gameType === 'picture_matching' ? 'bg-purple-100 text-purple-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                      {formatGameType(entry.lobby?.gameType)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-neutral-900">
                    {entry.score} {entry.maxScore ? `/ ${entry.maxScore}` : ''}
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {formatTime(entry.completionTime)}
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {formatDate(entry.completedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center pt-4 border-t border-neutral-200 mt-4">
            <nav className="flex space-x-2" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Show pages around current page
                let pageNumber = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNumber = currentPage - 3 + i;
                  }
                  if (pageNumber > totalPages) {
                    pageNumber = totalPages - (4 - i);
                  }
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </nav>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
