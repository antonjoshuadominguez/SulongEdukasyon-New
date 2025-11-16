import { useEffect, useRef, useState } from "react";

interface PollingOptions {
  interval: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  maxRetries?: number;
}

/**
 * Custom hook for polling an API endpoint at regular intervals
 * 
 * @param fetchFn Function that returns a Promise that resolves to the data
 * @param options Polling options
 * @returns An object containing the data, loading state, error, and a function to manually trigger the poll
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: PollingOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retries, setRetries] = useState<number>(0);
  
  const {
    interval,
    onSuccess,
    onError,
    enabled = true,
    maxRetries = Infinity
  } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);
  
  const poll = async () => {
    if (!enabled || !mountedRef.current) return;
    
    try {
      setLoading(true);
      const response = await fetchFn();
      
      if (mountedRef.current) {
        setData(response);
        setError(null);
        setRetries(0);
        if (onSuccess) onSuccess(response);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error("An error occurred");
        setError(error);
        setRetries((prev) => prev + 1);
        if (onError) onError(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        
        // Schedule next poll if we haven't exceeded maxRetries
        if (retries < maxRetries) {
          timeoutRef.current = setTimeout(poll, interval);
        }
      }
    }
  };
  
  // Start polling when the component mounts or when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    
    // Immediately run the first poll
    poll();
    
    // Cleanup
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchFn, interval, enabled, maxRetries]);
  
  // Function to manually trigger a poll
  const manualPoll = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    poll();
  };
  
  return { data, loading, error, poll: manualPoll };
}
