'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface JobData {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemaining?: string;
  error?: string;
  result?: any;
  retryCount?: number;
  maxRetries?: number;
}

interface UseJobPollingOptions {
  pollingInterval?: number;
  maxRetries?: number;
  onStatusChange?: (status: JobData['status'], data: JobData) => void;
  onProgress?: (progress: number, data: JobData) => void;
  onComplete?: (result: any, data: JobData) => void;
  onError?: (error: string, data: JobData) => void;
  autoStart?: boolean;
}

interface UseJobPollingReturn {
  data: JobData | null;
  isPolling: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  retry: () => void;
  cancel: () => Promise<boolean>;
}

export function useJobPolling(
  jobId: string | null,
  pollingUrl: string | null,
  options: UseJobPollingOptions = {}
): UseJobPollingReturn {
  const {
    pollingInterval = 2000, // 2 seconds default
    maxRetries = 3,
    onStatusChange,
    onProgress,
    onComplete,
    onError,
    autoStart = true,
  } = options;

  const [data, setData] = useState<JobData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const lastProgressRef = useRef<number>(-1);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Fetch job status
  const fetchJobStatus = useCallback(async (): Promise<JobData | null> => {
    if (!jobId || !pollingUrl) {
      return null;
    }

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch(pollingUrl, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jobData: JobData = await response.json();
      
      // Reset retry count on successful fetch
      setRetryCount(0);
      setError(null);

      return jobData;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null; // Request was cancelled
      }

      console.error('Job polling error:', err);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      const errorMessage = err.message || 'Failed to fetch job status';
      setError(errorMessage);
      
      // Call error callback
      if (onError) {
        onError(errorMessage, data!);
      }

      return null;
    }
  }, [jobId, pollingUrl, onError, data]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!jobId || !pollingUrl || isPolling) {
      return;
    }

    console.log(`🔄 Starting job polling for: ${jobId}`);
    setIsPolling(true);
    setError(null);

    // Initial fetch
    fetchJobStatus().then(jobData => {
      if (jobData) {
        setData(jobData);
      }
    });

    // Set up polling interval
    intervalRef.current = setInterval(async () => {
      const jobData = await fetchJobStatus();
      
      if (!jobData) {
        return;
      }

      setData(jobData);

      // Check for status changes
      if (lastStatusRef.current !== jobData.status) {
        lastStatusRef.current = jobData.status;
        if (onStatusChange) {
          onStatusChange(jobData.status, jobData);
        }
      }

      // Check for progress changes
      if (lastProgressRef.current !== jobData.progress) {
        lastProgressRef.current = jobData.progress;
        if (onProgress) {
          onProgress(jobData.progress, jobData);
        }
      }

      // Handle completion
      if (jobData.status === 'completed') {
        console.log(`✅ Job completed: ${jobId}`);
        cleanup();
        if (onComplete && jobData.result) {
          onComplete(jobData.result, jobData);
        }
      }

      // Handle failure
      if (jobData.status === 'failed') {
        console.log(`❌ Job failed: ${jobId}`);
        cleanup();
        if (onError && jobData.error) {
          onError(jobData.error, jobData);
        }
      }

      // Handle cancellation
      if (jobData.status === 'cancelled') {
        console.log(`🚫 Job cancelled: ${jobId}`);
        cleanup();
      }
    }, pollingInterval);
  }, [
    jobId,
    pollingUrl,
    isPolling,
    pollingInterval,
    fetchJobStatus,
    onStatusChange,
    onProgress,
    onComplete,
    onError,
    cleanup,
  ]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log(`⏹️ Stopping job polling for: ${jobId}`);
    cleanup();
  }, [jobId, cleanup]);

  // Retry polling
  const retry = useCallback(() => {
    if (retryCount >= maxRetries) {
      setError(`Max retries (${maxRetries}) exceeded`);
      return;
    }

    console.log(`🔄 Retrying job polling for: ${jobId} (attempt ${retryCount + 1})`);
    stopPolling();
    setTimeout(() => {
      startPolling();
    }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
  }, [jobId, retryCount, maxRetries, stopPolling, startPolling]);

  // Cancel job
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!jobId || !data) {
      return false;
    }

    try {
      // This would need to be implemented in the backend
      const response = await fetch(`/api/jobs/cancel/${jobId}`, {
        method: 'POST',
      });

      if (response.ok) {
        stopPolling();
        setData(prev => prev ? { ...prev, status: 'cancelled' } : null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }, [jobId, data, stopPolling]);

  // Auto-start polling when jobId and pollingUrl are available
  useEffect(() => {
    if (autoStart && jobId && pollingUrl && !isPolling) {
      startPolling();
    }

    return () => {
      cleanup();
    };
  }, [jobId, pollingUrl, autoStart, isPolling, startPolling, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    data,
    isPolling,
    error,
    startPolling,
    stopPolling,
    retry,
    cancel,
  };
}