import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LobbyParticipant } from '@shared/schema';

// Custom API request function
const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
};

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useLobbyWebsocket(lobbyId: number) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<(LobbyParticipant & { username?: string, fullName?: string })[]>([]);
  const [allReady, setAllReady] = useState(false);
  const [lobbyFull, setLobbyFull] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch initial participants with status
  const { data: initialParticipants, isLoading } = useQuery({
    queryKey: ['/api/lobbies', lobbyId, 'participants-with-status'],
    queryFn: () => apiRequest(`/api/lobbies/${lobbyId}/participants-with-status`),
    enabled: !!lobbyId
  });

  // Fetch initial ready status
  const { data: initialReadyStatus } = useQuery({
    queryKey: ['/api/lobbies', lobbyId, 'all-ready'],
    queryFn: () => apiRequest(`/api/lobbies/${lobbyId}/all-ready`),
    enabled: !!lobbyId
  });

  // Set ready status mutation
  const readyMutation = useMutation({
    mutationFn: async ({ isReady }: { isReady: boolean }) => {
      return apiRequest(`/api/lobbies/${lobbyId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReady })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lobbies', lobbyId, 'all-ready'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lobbies', lobbyId, 'participants-with-status'] });
    }
  });

  // Initialize participants from API data
  useEffect(() => {
    if (initialParticipants) {
      setParticipants(initialParticipants);
    }
  }, [initialParticipants]);

  // Initialize ready status from API data
  useEffect(() => {
    if (initialReadyStatus) {
      setAllReady(initialReadyStatus.allReady);
      setLobbyFull(initialReadyStatus.isFull);
      setParticipantCount(initialReadyStatus.participantCount);
    }
  }, [initialReadyStatus]);

  // Connect to WebSocket
  useEffect(() => {
    if (!lobbyId) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setConnected(true);
      
      // Join the specific lobby
      ws.send(JSON.stringify({
        type: 'join_lobby',
        lobbyId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'lobby_joined') {
          console.log(`Successfully joined lobby ${data.lobbyId}`);
        } 
        else if (data.type === 'ready_status_updated') {
          // Update participant with new ready status
          setParticipants(prev => prev.map(p => 
            p.id === data.participant.id ? { ...p, ...data.participant } : p
          ));
          
          // Update overall ready status
          setAllReady(data.allReady);
        }
        // All other message types will be handled by specific game components
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    };

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [lobbyId, queryClient]);

  // Function to set ready status
  const setReady = useCallback((isReady: boolean) => {
    readyMutation.mutate({ isReady });
  }, [readyMutation]);

  return {
    connected,
    participants,
    allReady,
    lobbyFull,
    participantCount,
    isLoading,
    setReady,
    isPending: readyMutation.isPending
  };
}