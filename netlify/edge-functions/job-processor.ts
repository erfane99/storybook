import type { Context } from "https://edge.netlify.com";

interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: number;
  message: string;
  timestamp: string;
}

interface EdgeFunctionConfig {
  processingInterval: number;
  maxProcessingTime: number;
  maxJobsPerRun: number;
  enableDistributedLocking: boolean;
  healthCheckEndpoint: string;
  processingEndpoint: string;
}

// Configuration
const config: EdgeFunctionConfig = {
  processingInterval: 30000, // 30 seconds
  maxProcessingTime: 25000, // 25 seconds (leave buffer for edge function timeout)
  maxJobsPerRun: 5,
  enableDistributedLocking: true,
  healthCheckEndpoint: '/api/jobs/health',
  processingEndpoint: '/api/jobs/process',
};

// Distributed processing coordination
class DistributedLock {
  private static locks = new Map<string, { timestamp: number; region: string }>();
  private static lockTimeout = 60000; // 1 minute

  static async acquireLock(key: string, region: string): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    // Clean up expired locks
    if (existing && now - existing.timestamp > this.lockTimeout) {
      this.locks.delete(key);
    }

    // Check if lock is available
    const currentLock = this.locks.get(key);
    if (currentLock && currentLock.region !== region) {
      return false; // Lock held by another region
    }

    // Acquire or refresh lock
    this.locks.set(key, { timestamp: now, region });
    return true;
  }

  static releaseLock(key: string, region: string): void {
    const existing = this.locks.get(key);
    if (existing && existing.region === region) {
      this.locks.delete(key);
    }
  }

  static isLocked(key: string): boolean {
    const existing = this.locks.get(key);
    if (!existing) return false;
    
    const now = Date.now();
    if (now - existing.timestamp > this.lockTimeout) {
      this.locks.delete(key);
      return false;
    }
    
    return true;
  }
}

// Main edge function handler
export default async function handler(request: Request, context: Context) {
  const startTime = Date.now();
  const region = context.geo?.region || 'unknown';
  const lockKey = 'job-processing';

  console.log(`🌍 Edge function triggered in region: ${region}`);

  try {
    // Only process on POST requests or scheduled triggers
    if (request.method !== 'POST' && !isScheduledTrigger(request)) {
      return new Response(JSON.stringify({
        message: 'Edge function is healthy',
        region,
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Distributed locking to prevent multiple regions processing simultaneously
    if (config.enableDistributedLocking) {
      const lockAcquired = await DistributedLock.acquireLock(lockKey, region);
      if (!lockAcquired) {
        console.log(`🔒 Processing lock held by another region, skipping`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Processing handled by another region',
          region,
          timestamp: new Date().toISOString(),
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    try {
      // Get site URL from environment or request
      const siteUrl = getSiteUrl(request);
      
      // Health check first
      const healthResult = await performHealthCheck(siteUrl);
      if (!healthResult.healthy) {
        console.log(`❌ Health check failed: ${healthResult.message}`);
        return createErrorResponse('System health check failed', healthResult);
      }

      // Process jobs
      const processingResult = await processJobs(siteUrl, region);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Edge function completed in ${processingTime}ms`);
      
      return new Response(JSON.stringify({
        ...processingResult,
        region,
        processingTime,
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

    } finally {
      // Always release the lock
      if (config.enableDistributedLocking) {
        DistributedLock.releaseLock(lockKey, region);
      }
    }

  } catch (error: any) {
    console.error(`❌ Edge function error in region ${region}:`, error);
    
    return createErrorResponse('Edge function processing failed', {
      error: error.message,
      region,
      timestamp: new Date().toISOString(),
    });
  }
}

// Perform system health check
async function performHealthCheck(siteUrl: string): Promise<{ healthy: boolean; message: string; details?: any }> {
  try {
    const healthUrl = `${siteUrl}${config.healthCheckEndpoint}`;
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Edge-Function/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return {
        healthy: false,
        message: `Health check returned ${response.status}`,
        details: { status: response.status, statusText: response.statusText },
      };
    }

    const healthData = await response.json();
    
    if (healthData.status === 'critical') {
      return {
        healthy: false,
        message: 'System is in critical state',
        details: healthData,
      };
    }

    return {
      healthy: true,
      message: 'System is healthy',
      details: healthData,
    };

  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    return {
      healthy: false,
      message: 'Health check request failed',
      details: { error: error.message },
    };
  }
}

// Process background jobs
async function processJobs(siteUrl: string, region: string): Promise<ProcessingResult> {
  try {
    const processUrl = `${siteUrl}${config.processingEndpoint}`;
    
    const requestBody = {
      maxJobs: config.maxJobsPerRun,
      forceProcessing: true,
      source: 'edge-function',
      region,
      cleanup: shouldRunCleanup(),
    };

    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Edge-Function/1.0',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(config.maxProcessingTime),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Processing request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      processed: result.processed || 0,
      errors: result.errors || 0,
      message: result.message || 'Processing completed',
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error('❌ Job processing failed:', error);
    
    return {
      success: false,
      processed: 0,
      errors: 1,
      message: error.message || 'Processing failed',
      timestamp: new Date().toISOString(),
    };
  }
}

// Determine if this is a scheduled trigger
function isScheduledTrigger(request: Request): boolean {
  // Check for scheduled trigger indicators
  const userAgent = request.headers.get('user-agent') || '';
  const scheduledHeaders = [
    'netlify-cron',
    'github-actions',
    'vercel-cron',
  ];

  return scheduledHeaders.some(header => 
    userAgent.toLowerCase().includes(header) ||
    request.headers.get('x-scheduled-by')?.toLowerCase().includes(header)
  );
}

// Get site URL from environment or request
function getSiteUrl(request: Request): string {
  // Try environment variable first
  const envUrl = Deno.env.get('SITE_URL') || Deno.env.get('URL');
  if (envUrl) {
    return envUrl;
  }

  // Extract from request
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// Determine if cleanup should run (e.g., once per hour)
function shouldRunCleanup(): boolean {
  const now = new Date();
  // Run cleanup at the top of each hour
  return now.getMinutes() < 2;
}

// Create standardized error response
function createErrorResponse(message: string, details: any): Response {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
  }), {
    status: 500,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// Configuration for Netlify Edge Functions
export const config = {
  path: "/api/edge/process-jobs",
  cache: "manual",
};