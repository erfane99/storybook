# Background Jobs Performance Optimization Guide

Comprehensive strategies and techniques for optimizing the performance, efficiency, and scalability of the background job system.

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [Database Optimization](#database-optimization)
3. [Concurrency Tuning](#concurrency-tuning)
4. [Resource Management](#resource-management)
5. [Caching Strategies](#caching-strategies)
6. [Network Optimization](#network-optimization)
7. [Monitoring Overhead](#monitoring-overhead)
8. [Job Prioritization](#job-prioritization)
9. [Batch Processing](#batch-processing)
10. [Scaling Strategies](#scaling-strategies)

## Performance Overview

### Key Performance Metrics

The background job system's performance should be measured using these key metrics:

1. **Throughput**: Jobs processed per minute
2. **Latency**: Time from job creation to completion
3. **Queue Depth**: Number of pending jobs
4. **Resource Utilization**: CPU, memory, and network usage
5. **Error Rate**: Percentage of jobs that fail
6. **Processing Efficiency**: Ratio of processing time to total time

### Performance Targets

| Metric | Target | Warning Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| Throughput | >10 jobs/minute | <5 jobs/minute | <1 job/minute |
| Avg. Processing Time | <3 minutes | >5 minutes | >10 minutes |
| Queue Depth | <10 jobs | >20 jobs | >50 jobs |
| CPU Utilization | <70% | >80% | >90% |
| Memory Utilization | <70% | >85% | >95% |
| Error Rate | <5% | >10% | >20% |

### Performance Bottlenecks

Common bottlenecks in the background job system:

1. **Database Contention**: Multiple workers querying the same tables
2. **External API Limits**: OpenAI and Cloudinary rate limits
3. **Memory Leaks**: Accumulating state during long-running operations
4. **Network Latency**: Slow responses from external services
5. **Inefficient Queries**: Non-optimized database access patterns

## Database Optimization

### Connection Pooling

```typescript
// lib/supabase/optimized-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Monitor the pool events
pool.on('connect', (client) => {
  console.log('New client connected to the pool');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Create optimized Supabase client with custom fetch implementation
export function createOptimizedClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      },
      global: {
        fetch: async (url, options) => {
          // Use connection pool for database operations
          if (url.includes('/rest/v1/')) {
            try {
              // Extract query from URL and options
              const path = url.split('/rest/v1/')[1];
              const [table, query] = path.split('?');
              
              // Get client from pool
              const client = await pool.connect();
              
              try {
                // Execute query
                const result = await client.query(`SELECT * FROM ${table} WHERE ${query}`);
                
                // Return response
                return new Response(JSON.stringify(result.rows), {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              } finally {
                // Release client back to pool
                client.release();
              }
            } catch (error) {
              console.error('Database query error:', error);
              // Fall back to default fetch
            }
          }
          
          // Default fetch for non-database operations
          return fetch(url, options);
        }
      }
    }
  );
}
```

### Query Optimization

```sql
-- Optimized queries for job processing

-- 1. Get pending jobs with efficient indexing
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created 
ON background_jobs(status, created_at)
WHERE status = 'pending';

-- 2. Optimize job status updates
CREATE INDEX IF NOT EXISTS idx_background_jobs_id_status
ON background_jobs(id, status);

-- 3. Optimize job cleanup
CREATE INDEX IF NOT EXISTS idx_background_jobs_completed_status
ON background_jobs(completed_at, status)
WHERE status IN ('completed', 'failed', 'cancelled');

-- 4. Optimize user job queries
CREATE INDEX IF NOT EXISTS idx_background_jobs_user_created
ON background_jobs(user_id, created_at);

-- 5. Optimize job type queries
CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status
ON background_jobs(type, status);
```

### Efficient Job Queries

```typescript
// lib/background-jobs/optimized-queries.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Efficient query for pending jobs
export async function getNextPendingJobs(limit: number = 10): Promise<any[]> {
  // Use RPC for better performance
  const { data, error } = await supabase.rpc('get_next_pending_jobs', {
    limit_param: limit
  });
  
  if (error) {
    console.error('Failed to get pending jobs:', error);
    return [];
  }
  
  return data || [];
}

// Efficient job status update
export async function updateJobStatusEfficient(
  jobId: string,
  status: string,
  progress: number,
  currentStep?: string
): Promise<boolean> {
  // Use RPC for atomic update
  const { data, error } = await supabase.rpc('update_job_status', {
    job_id_param: jobId,
    status_param: status,
    progress_param: progress,
    current_step_param: currentStep || null
  });
  
  if (error) {
    console.error('Failed to update job status:', error);
    return false;
  }
  
  return true;
}

// Efficient job completion
export async function markJobCompletedEfficient(
  jobId: string,
  resultData: any
): Promise<boolean> {
  // Use RPC for atomic update with proper timestamps
  const { data, error } = await supabase.rpc('complete_job', {
    job_id_param: jobId,
    result_data_param: resultData
  });
  
  if (error) {
    console.error('Failed to mark job completed:', error);
    return false;
  }
  
  return true;
}
```

### Database Functions

```sql
-- Create stored procedures for common operations

-- 1. Get next pending jobs efficiently
CREATE OR REPLACE FUNCTION get_next_pending_jobs(limit_param integer)
RETURNS SETOF background_jobs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM background_jobs
  WHERE status = 'pending'
  ORDER BY 
    CASE WHEN retry_count > 0 THEN 0 ELSE 1 END, -- Prioritize retry jobs
    created_at ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- 2. Update job status efficiently
CREATE OR REPLACE FUNCTION update_job_status(
  job_id_param text,
  status_param text,
  progress_param integer,
  current_step_param text
)
RETURNS boolean AS $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE background_jobs
  SET 
    status = status_param,
    progress = progress_param,
    current_step = current_step_param,
    updated_at = NOW(),
    started_at = CASE 
      WHEN status_param = 'processing' AND started_at IS NULL 
      THEN NOW() 
      ELSE started_at 
    END
  WHERE id = job_id_param;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- 3. Mark job as completed efficiently
CREATE OR REPLACE FUNCTION complete_job(
  job_id_param text,
  result_data_param jsonb
)
RETURNS boolean AS $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE background_jobs
  SET 
    status = 'completed',
    progress = 100,
    result_data = result_data_param,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = job_id_param;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- 4. Efficient job cleanup
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_to_keep integer)
RETURNS integer AS $$
DECLARE
  deleted_rows integer;
BEGIN
  DELETE FROM background_jobs
  WHERE 
    status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (days_to_keep * INTERVAL '1 day');
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$ LANGUAGE plpgsql;
```

## Concurrency Tuning

### Optimal Concurrency Settings

```typescript
// lib/background-jobs/concurrency-manager.ts
import os from 'os';

class ConcurrencyManager {
  private maxConcurrentJobs: number;
  private maxJobsPerUser: number;
  private maxJobsPerType: Record<string, number>;
  
  constructor() {
    // Initialize with environment variables or defaults
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '3');
    this.maxJobsPerUser = parseInt(process.env.MAX_JOBS_PER_USER || '5');
    
    // Job type specific limits
    this.maxJobsPerType = {
      'storybook': 2,
      'auto-story': 2,
      'scenes': 3,
      'cartoonize': 5,
      'image-generation': 5
    };
    
    // Auto-tune based on available resources
    this.autoTuneConcurrency();
  }
  
  private autoTuneConcurrency() {
    // Get available CPU cores
    const cpuCount = os.cpus().length;
    
    // Get available memory (in GB)
    const totalMemoryGB = os.totalmem() / 1024 / 1024 / 1024;
    
    // Calculate optimal concurrency based on resources
    const cpuBasedConcurrency = Math.max(1, cpuCount - 1);
    const memoryBasedConcurrency = Math.max(1, Math.floor(totalMemoryGB / 2));
    
    // Use the lower of the two
    const optimalConcurrency = Math.min(cpuBasedConcurrency, memoryBasedConcurrency);
    
    // Only increase, never decrease from configured value
    if (optimalConcurrency > this.maxConcurrentJobs) {
      console.log(`Auto-tuning concurrency: ${this.maxConcurrentJobs} → ${optimalConcurrency}`);
      this.maxConcurrentJobs = optimalConcurrency;
    }
  }
  
  getMaxConcurrentJobs(): number {
    return this.maxConcurrentJobs;
  }
  
  getMaxJobsPerUser(): number {
    return this.maxJobsPerUser;
  }
  
  getMaxJobsPerType(jobType: string): number {
    return this.maxJobsPerType[jobType] || 1;
  }
  
  // Dynamically adjust concurrency based on system load
  adjustForSystemLoad(cpuUsage: number, memoryUsage: number): void {
    // Reduce concurrency if system is under heavy load
    if (cpuUsage > 90 || memoryUsage > 90) {
      const reducedConcurrency = Math.max(1, Math.floor(this.maxConcurrentJobs / 2));
      console.log(`Reducing concurrency due to high load: ${this.maxConcurrentJobs} → ${reducedConcurrency}`);
      this.maxConcurrentJobs = reducedConcurrency;
    }
    // Increase concurrency if system load is low
    else if (cpuUsage < 30 && memoryUsage < 50 && this.maxConcurrentJobs < os.cpus().length) {
      const increasedConcurrency = this.maxConcurrentJobs + 1;
      console.log(`Increasing concurrency due to low load: ${this.maxConcurrentJobs} → ${increasedConcurrency}`);
      this.maxConcurrentJobs = increasedConcurrency;
    }
  }
  
  // Check if a new job can be started
  canStartNewJob(
    currentlyProcessing: number,
    jobType: string,
    userJobCount: number
  ): boolean {
    // Check global concurrency limit
    if (currentlyProcessing >= this.maxConcurrentJobs) {
      return false;
    }
    
    // Check per-user limit
    if (userJobCount >= this.maxJobsPerUser) {
      return false;
    }
    
    // Check per-type limit
    const typeLimit = this.getMaxJobsPerType(jobType);
    const typeCount = 0; // This would need to be calculated from actual running jobs
    
    if (typeCount >= typeLimit) {
      return false;
    }
    
    return true;
  }
}

export const concurrencyManager = new ConcurrencyManager();
```

### Production Settings

```env
# Concurrency settings for different environments

# Development
MAX_CONCURRENT_JOBS=2
MAX_JOBS_PER_USER=3
JOB_PROCESSING_INTERVAL=10000

# Staging
MAX_CONCURRENT_JOBS=3
MAX_JOBS_PER_USER=5
JOB_PROCESSING_INTERVAL=15000

# Production (small)
MAX_CONCURRENT_JOBS=5
MAX_JOBS_PER_USER=5
JOB_PROCESSING_INTERVAL=20000

# Production (medium)
MAX_CONCURRENT_JOBS=10
MAX_JOBS_PER_USER=10
JOB_PROCESSING_INTERVAL=15000

# Production (large)
MAX_CONCURRENT_JOBS=20
MAX_JOBS_PER_USER=15
JOB_PROCESSING_INTERVAL=10000
```

### Dynamic Concurrency Adjustment

```typescript
// lib/background-jobs/dynamic-concurrency.ts
import os from 'os';
import { concurrencyManager } from './concurrency-manager';

// Track system metrics over time
const metricsHistory: Array<{
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  activeJobs: number;
  queueDepth: number;
}> = [];

// Get current system metrics
function getSystemMetrics(activeJobs: number, queueDepth: number): {
  cpuUsage: number;
  memoryUsage: number;
  activeJobs: number;
  queueDepth: number;
} {
  // Calculate CPU usage
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });
  
  const cpuUsage = 100 - (totalIdle / totalTick * 100);
  
  // Calculate memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  
  return {
    cpuUsage,
    memoryUsage,
    activeJobs,
    queueDepth
  };
}

// Update metrics history
function updateMetricsHistory(metrics: {
  cpuUsage: number;
  memoryUsage: number;
  activeJobs: number;
  queueDepth: number;
}): void {
  metricsHistory.push({
    timestamp: Date.now(),
    ...metrics
  });
  
  // Keep only last hour of metrics
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  while (metricsHistory.length > 0 && metricsHistory[0].timestamp < oneHourAgo) {
    metricsHistory.shift();
  }
}

// Dynamically adjust concurrency based on system metrics
export function adjustConcurrency(activeJobs: number, queueDepth: number): number {
  // Get current metrics
  const metrics = getSystemMetrics(activeJobs, queueDepth);
  
  // Update history
  updateMetricsHistory(metrics);
  
  // Calculate trends
  const cpuTrend = calculateTrend(metricsHistory.map(m => m.cpuUsage));
  const memoryTrend = calculateTrend(metricsHistory.map(m => m.memoryUsage));
  const queueTrend = calculateTrend(metricsHistory.map(m => m.queueDepth));
  
  // Current concurrency
  const currentConcurrency = concurrencyManager.getMaxConcurrentJobs();
  
  // Adjust based on current metrics and trends
  if (metrics.cpuUsage > 85 || metrics.memoryUsage > 90) {
    // High resource usage - decrease concurrency
    const newConcurrency = Math.max(1, currentConcurrency - 1);
    console.log(`🔽 Decreasing concurrency due to high resource usage: ${currentConcurrency} → ${newConcurrency}`);
    return newConcurrency;
  } else if (queueDepth > 20 && metrics.cpuUsage < 70 && metrics.memoryUsage < 80) {
    // High queue depth with available resources - increase concurrency
    const newConcurrency = currentConcurrency + 1;
    console.log(`🔼 Increasing concurrency due to high queue depth: ${currentConcurrency} → ${newConcurrency}`);
    return newConcurrency;
  } else if (queueDepth < 5 && activeJobs < currentConcurrency / 2) {
    // Low queue depth and low activity - decrease concurrency
    const newConcurrency = Math.max(1, currentConcurrency - 1);
    console.log(`🔽 Decreasing concurrency due to low activity: ${currentConcurrency} → ${newConcurrency}`);
    return newConcurrency;
  } else if (cpuTrend < 0 && memoryTrend < 0 && queueTrend > 0) {
    // Resources decreasing but queue increasing - increase concurrency
    const newConcurrency = currentConcurrency + 1;
    console.log(`🔼 Increasing concurrency based on trends: ${currentConcurrency} → ${newConcurrency}`);
    return newConcurrency;
  }
  
  // No change needed
  return currentConcurrency;
}

// Calculate trend (positive = increasing, negative = decreasing)
function calculateTrend(values: number[]): number {
  if (values.length < 5) {
    return 0; // Not enough data
  }
  
  // Use last 5 values
  const recentValues = values.slice(-5);
  
  // Simple linear regression
  const n = recentValues.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  
  const sumX = indices.reduce((sum, x) => sum + x, 0);
  const sumY = recentValues.reduce((sum, y) => sum + y, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * recentValues[i], 0);
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  return slope;
}
```

## Resource Management

### Memory Optimization

```typescript
// lib/background-jobs/memory-optimizer.ts
import { jobConfig } from './config';

// Track memory usage per job
const jobMemoryUsage = new Map<string, number>();

// Global memory limit (in MB)
const MEMORY_LIMIT = parseInt(process.env.JOB_MEMORY_LIMIT || '512');

// Check if we have enough memory to start a new job
export function canAllocateMemory(jobType: string): boolean {
  // Get memory requirement for job type
  const jobTypeConfig = jobConfig.getJobTypeConfig(jobType);
  const memoryRequirement = getMemoryRequirement(jobType, jobTypeConfig);
  
  // Calculate current memory usage
  const currentUsage = Array.from(jobMemoryUsage.values()).reduce((sum, mem) => sum + mem, 0);
  
  // Check if we have enough memory
  return currentUsage + memoryRequirement <= MEMORY_LIMIT;
}

// Allocate memory for a job
export function allocateMemory(jobId: string, jobType: string): void {
  const jobTypeConfig = jobConfig.getJobTypeConfig(jobType);
  const memoryRequirement = getMemoryRequirement(jobType, jobTypeConfig);
  
  jobMemoryUsage.set(jobId, memoryRequirement);
}

// Release memory for a job
export function releaseMemory(jobId: string): void {
  jobMemoryUsage.delete(jobId);
}

// Get memory requirement for job type
function getMemoryRequirement(jobType: string, jobTypeConfig: any): number {
  if (!jobTypeConfig) {
    return 50; // Default 50MB
  }
  
  // Map resource requirement to MB
  const resourceMap = {
    'low': 50,
    'medium': 100,
    'high': 200
  };
  
  return resourceMap[jobTypeConfig.resourceRequirements.memory] || 50;
}

// Get current memory usage
export function getCurrentMemoryUsage(): {
  allocated: number;
  total: number;
  available: number;
  byJobType: Record<string, number>;
} {
  // Calculate allocated memory
  const allocated = Array.from(jobMemoryUsage.values()).reduce((sum, mem) => sum + mem, 0);
  
  // Calculate by job type
  const byJobType: Record<string, number> = {};
  
  // In a real implementation, we would track job types with memory usage
  
  return {
    allocated,
    total: MEMORY_LIMIT,
    available: MEMORY_LIMIT - allocated,
    byJobType
  };
}

// Optimize memory usage by cleaning up
export function optimizeMemoryUsage(): void {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // In a real implementation, we might do more cleanup
}
```

### CPU Optimization

```typescript
// lib/background-jobs/cpu-optimizer.ts
import os from 'os';
import { jobConfig } from './config';

// Track CPU usage per job
const jobCpuUsage = new Map<string, number>();

// Global CPU limit (percentage)
const CPU_LIMIT = parseInt(process.env.JOB_CPU_LIMIT || '80');

// Check if we have enough CPU to start a new job
export function canAllocateCpu(jobType: string): boolean {
  // Get CPU requirement for job type
  const jobTypeConfig = jobConfig.getJobTypeConfig(jobType);
  const cpuRequirement = getCpuRequirement(jobType, jobTypeConfig);
  
  // Calculate current CPU usage
  const currentUsage = Array.from(jobCpuUsage.values()).reduce((sum, cpu) => sum + cpu, 0);
  
  // Check if we have enough CPU
  return currentUsage + cpuRequirement <= CPU_LIMIT;
}

// Allocate CPU for a job
export function allocateCpu(jobId: string, jobType: string): void {
  const jobTypeConfig = jobConfig.getJobTypeConfig(jobType);
  const cpuRequirement = getCpuRequirement(jobType, jobTypeConfig);
  
  jobCpuUsage.set(jobId, cpuRequirement);
}

// Release CPU for a job
export function releaseCpu(jobId: string): void {
  jobCpuUsage.delete(jobId);
}

// Get CPU requirement for job type
function getCpuRequirement(jobType: string, jobTypeConfig: any): number {
  if (!jobTypeConfig) {
    return 10; // Default 10%
  }
  
  // Map resource requirement to percentage
  const resourceMap = {
    'low': 10,
    'medium': 20,
    'high': 30
  };
  
  return resourceMap[jobTypeConfig.resourceRequirements.cpu] || 10;
}

// Get current CPU usage
export function getCurrentCpuUsage(): {
  allocated: number;
  total: number;
  available: number;
  byJobType: Record<string, number>;
} {
  // Calculate allocated CPU
  const allocated = Array.from(jobCpuUsage.values()).reduce((sum, cpu) => sum + cpu, 0);
  
  // Calculate by job type
  const byJobType: Record<string, number> = {};
  
  // In a real implementation, we would track job types with CPU usage
  
  return {
    allocated,
    total: CPU_LIMIT,
    available: CPU_LIMIT - allocated,
    byJobType
  };
}

// Optimize CPU usage
export function optimizeCpuUsage(): void {
  // In a real implementation, we might adjust process priorities
}
```

### Resource Circuit Breakers

```typescript
// lib/background-jobs/circuit-breaker.ts
import os from 'os';

interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number; // ms
  halfOpenTimeout: number; // ms
}

interface ResourceThresholds {
  cpu: number; // percentage
  memory: number; // percentage
  queueDepth: number;
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly resourceThresholds: ResourceThresholds;
  
  constructor(config?: Partial<CircuitBreakerConfig>, thresholds?: Partial<ResourceThresholds>) {
    this.config = {
      maxFailures: config?.maxFailures || 5,
      resetTimeout: config?.resetTimeout || 60000, // 1 minute
      halfOpenTimeout: config?.halfOpenTimeout || 30000, // 30 seconds
    };
    
    this.resourceThresholds = {
      cpu: thresholds?.cpu || 90,
      memory: thresholds?.memory || 90,
      queueDepth: thresholds?.queueDepth || 50
    };
  }
  
  // Check if circuit is closed (allowing operations)
  isClosed(): boolean {
    this.updateState();
    return this.state === 'closed' || this.state === 'half-open';
  }
  
  // Record a successful operation
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failures = 0;
    }
  }
  
  // Record a failed operation
  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.config.maxFailures) {
      this.state = 'open';
      console.log(`🔌 Circuit breaker opened after ${this.failures} failures`);
    }
  }
  
  // Update circuit state based on time
  private updateState(): void {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        this.state = 'half-open';
        console.log('🔌 Circuit breaker half-open, allowing test requests');
      }
    }
  }
  
  // Check if system resources are within limits
  checkResources(): boolean {
    // Get CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = 100 - (totalIdle / totalTick * 100);
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    
    // Check thresholds
    if (cpuUsage > this.resourceThresholds.cpu) {
      console.log(`🔌 Circuit breaker: CPU usage (${cpuUsage.toFixed(1)}%) exceeds threshold (${this.resourceThresholds.cpu}%)`);
      return false;
    }
    
    if (memoryUsage > this.resourceThresholds.memory) {
      console.log(`🔌 Circuit breaker: Memory usage (${memoryUsage.toFixed(1)}%) exceeds threshold (${this.resourceThresholds.memory}%)`);
      return false;
    }
    
    return true;
  }
  
  // Reset circuit breaker
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    console.log('🔌 Circuit breaker reset');
  }
}

// Create circuit breakers for different services
export const openaiCircuitBreaker = new CircuitBreaker(
  { maxFailures: 3, resetTimeout: 120000 }, // More sensitive for OpenAI
  { cpu: 80, memory: 85, queueDepth: 30 }
);

export const databaseCircuitBreaker = new CircuitBreaker(
  { maxFailures: 5, resetTimeout: 60000 },
  { cpu: 90, memory: 90, queueDepth: 50 }
);

export const generalCircuitBreaker = new CircuitBreaker();
```

## Caching Strategies

### Job Result Caching

```typescript
// lib/background-jobs/result-cache.ts
import { createClient } from '@supabase/supabase-js';

interface CacheEntry {
  jobId: string;
  jobType: string;
  inputHash: string;
  result: any;
  createdAt: string;
  expiresAt: string;
}

class JobResultCache {
  private supabase: ReturnType<typeof createClient>;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private initialized = false;
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.initialized = true;
  }
  
  // Generate cache key from job input
  private generateCacheKey(jobType: string, inputData: any): string {
    // Remove non-deterministic fields
    const normalizedInput = { ...inputData };
    delete normalizedInput.user_id;
    delete normalizedInput.timestamp;
    
    // Generate hash
    const inputString = JSON.stringify(normalizedInput);
    let hash = 0;
    
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `${jobType}:${hash}`;
  }
  
  // Check if result is cached
  async getCachedResult(jobType: string, inputData: any): Promise<any | null> {
    if (!this.initialized) return null;
    
    try {
      const cacheKey = this.generateCacheKey(jobType, inputData);
      
      // Check memory cache first
      if (this.memoryCache.has(cacheKey)) {
        const entry = this.memoryCache.get(cacheKey)!;
        
        // Check if expired
        if (new Date(entry.expiresAt) > new Date()) {
          console.log(`✅ Cache hit (memory): ${cacheKey}`);
          return entry.result;
        } else {
          // Remove expired entry
          this.memoryCache.delete(cacheKey);
        }
      }
      
      // Check database cache
      const { data, error } = await this.supabase
        .from('job_result_cache')
        .select('result')
        .eq('input_hash', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Cache lookup error:', error);
        }
        return null;
      }
      
      if (data) {
        console.log(`✅ Cache hit (database): ${cacheKey}`);
        
        // Add to memory cache
        this.memoryCache.set(cacheKey, {
          jobId: data.job_id,
          jobType,
          inputHash: cacheKey,
          result: data.result,
          createdAt: data.created_at,
          expiresAt: data.expires_at
        });
        
        return data.result;
      }
      
      return null;
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  }
  
  // Cache job result
  async cacheResult(jobId: string, jobType: string, inputData: any, result: any, ttlHours: number = 24): Promise<boolean> {
    if (!this.initialized) return false;
    
    try {
      const cacheKey = this.generateCacheKey(jobType, inputData);
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);
      
      // Add to memory cache
      this.memoryCache.set(cacheKey, {
        jobId,
        jobType,
        inputHash: cacheKey,
        result,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });
      
      // Add to database cache
      const { error } = await this.supabase
        .from('job_result_cache')
        .upsert({
          job_id: jobId,
          job_type: jobType,
          input_hash: cacheKey,
          result,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        });
      
      if (error) {
        console.error('Cache save error:', error);
        return false;
      }
      
      console.log(`✅ Cached result: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('Cache error:', error);
      return false;
    }
  }
  
  // Invalidate cache entry
  async invalidateCache(jobType: string, inputData: any): Promise<boolean> {
    if (!this.initialized) return false;
    
    try {
      const cacheKey = this.generateCacheKey(jobType, inputData);
      
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from database cache
      const { error } = await this.supabase
        .from('job_result_cache')
        .delete()
        .eq('input_hash', cacheKey);
      
      if (error) {
        console.error('Cache invalidation error:', error);
        return false;
      }
      
      console.log(`✅ Invalidated cache: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('Cache error:', error);
      return false;
    }
  }
  
  // Clean up expired cache entries
  async cleanupCache(): Promise<number> {
    if (!this.initialized) return 0;
    
    try {
      // Clean up memory cache
      const now = new Date();
      let memoryEntriesRemoved = 0;
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (new Date(entry.expiresAt) <= now) {
          this.memoryCache.delete(key);
          memoryEntriesRemoved++;
        }
      }
      
      // Clean up database cache
      const { data, error } = await this.supabase
        .from('job_result_cache')
        .delete()
        .lt('expires_at', now.toISOString())
        .select('count');
      
      if (error) {
        console.error('Cache cleanup error:', error);
        return memoryEntriesRemoved;
      }
      
      const dbEntriesRemoved = data?.count || 0;
      console.log(`✅ Cleaned up cache: ${memoryEntriesRemoved} memory entries, ${dbEntriesRemoved} database entries`);
      
      return memoryEntriesRemoved + dbEntriesRemoved;
    } catch (error) {
      console.error('Cache error:', error);
      return 0;
    }
  }
}

export const jobResultCache = new JobResultCache();
```

### Image Caching

```typescript
// lib/background-jobs/image-cache.ts
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface ImageCacheEntry {
  originalHash: string;
  style: string;
  userId?: string;
  originalUrl: string;
  generatedUrl: string;
  createdAt: string;
}

class ImageCache {
  private supabase: ReturnType<typeof createClient>;
  private memoryCache: Map<string, ImageCacheEntry> = new Map();
  private initialized = false;
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.initialized = true;
  }
  
  // Generate cache key from image URL and style
  private generateCacheKey(imageUrl: string, style: string, userId?: string): string {
    // Generate hash of image URL
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    
    // Include user ID if provided (for user-specific caching)
    const userPart = userId ? `:${userId}` : '';
    
    return `${hash}:${style}${userPart}`;
  }
  
  // Check if image is cached
  async getCachedImage(imageUrl: string, style: string, userId?: string): Promise<string | null> {
    if (!this.initialized) return null;
    
    try {
      const cacheKey = this.generateCacheKey(imageUrl, style, userId);
      
      // Check memory cache first
      if (this.memoryCache.has(cacheKey)) {
        console.log(`✅ Image cache hit (memory): ${cacheKey}`);
        return this.memoryCache.get(cacheKey)!.generatedUrl;
      }
      
      // Check database cache
      const { data, error } = await this.supabase
        .from('cartoon_cache')
        .select('original_url, cartoonized_url')
        .eq('original_hash', cacheKey)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Image cache lookup error:', error);
        }
        return null;
      }
      
      if (data) {
        console.log(`✅ Image cache hit (database): ${cacheKey}`);
        
        // Add to memory cache
        this.memoryCache.set(cacheKey, {
          originalHash: cacheKey,
          style,
          userId,
          originalUrl: data.original_url,
          generatedUrl: data.cartoonized_url,
          createdAt: new Date().toISOString()
        });
        
        return data.cartoonized_url;
      }
      
      return null;
    } catch (error) {
      console.error('Image cache error:', error);
      return null;
    }
  }
  
  // Cache generated image
  async cacheImage(
    originalUrl: string,
    generatedUrl: string,
    style: string,
    userId?: string
  ): Promise<boolean> {
    if (!this.initialized) return false;
    
    try {
      const cacheKey = this.generateCacheKey(originalUrl, style, userId);
      
      // Add to memory cache
      this.memoryCache.set(cacheKey, {
        originalHash: cacheKey,
        style,
        userId,
        originalUrl,
        generatedUrl,
        createdAt: new Date().toISOString()
      });
      
      // Add to database cache
      const { error } = await this.supabase
        .from('cartoon_cache')
        .upsert({
          original_hash: cacheKey,
          style,
          user_id: userId,
          original_url: originalUrl,
          cartoonized_url: generatedUrl,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Image cache save error:', error);
        return false;
      }
      
      console.log(`✅ Cached image: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('Image cache error:', error);
      return false;
    }
  }
  
  // Invalidate cache entry
  async invalidateCache(imageUrl: string, style: string, userId?: string): Promise<boolean> {
    if (!this.initialized) return false;
    
    try {
      const cacheKey = this.generateCacheKey(imageUrl, style, userId);
      
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from database cache
      const { error } = await this.supabase
        .from('cartoon_cache')
        .delete()
        .eq('original_hash', cacheKey);
      
      if (error) {
        console.error('Image cache invalidation error:', error);
        return false;
      }
      
      console.log(`✅ Invalidated image cache: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('Image cache error:', error);
      return false;
    }
  }
  
  // Clean up old cache entries
  async cleanupCache(maxAgeDays: number = 30): Promise<number> {
    if (!this.initialized) return 0;
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      // Clean up database cache
      const { data, error } = await this.supabase
        .from('cartoon_cache')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('count');
      
      if (error) {
        console.error('Image cache cleanup error:', error);
        return 0;
      }
      
      const entriesRemoved = data?.count || 0;
      console.log(`✅ Cleaned up image cache: ${entriesRemoved} entries`);
      
      return entriesRemoved;
    } catch (error) {
      console.error('Image cache error:', error);
      return 0;
    }
  }
}

export const imageCache = new ImageCache();
```

### API Response Caching

```typescript
// lib/background-jobs/response-cache.ts
import { NextResponse } from 'next/server';

// In-memory cache for API responses
const responseCache = new Map<string, {
  response: any;
  expiresAt: number;
}>();

// Cache API response
export function cacheApiResponse(
  key: string,
  response: any,
  ttlSeconds: number = 60
): void {
  responseCache.set(key, {
    response,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

// Get cached API response
export function getCachedApiResponse(key: string): any | null {
  const cached = responseCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > cached.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  
  return cached.response;
}

// Clear cache
export function clearResponseCache(): void {
  responseCache.clear();
}

// Clean up expired cache entries
export function cleanupResponseCache(): number {
  let removed = 0;
  const now = Date.now();
  
  for (const [key, value] of responseCache.entries()) {
    if (now > value.expiresAt) {
      responseCache.delete(key);
      removed++;
    }
  }
  
  return removed;
}

// Middleware for caching API responses
export function withResponseCaching(
  handler: (request: Request) => Promise<NextResponse>,
  ttlSeconds: number = 60
) {
  return async (request: Request) => {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return handler(request);
    }
    
    // Generate cache key from URL
    const cacheKey = request.url;
    
    // Check cache
    const cachedResponse = getCachedApiResponse(cacheKey);
    if (cachedResponse) {
      // Clone the cached response
      const response = NextResponse.json(
        cachedResponse.data,
        { status: cachedResponse.status }
      );
      
      // Add cache header
      response.headers.set('X-Cache', 'HIT');
      
      return response;
    }
    
    // Get fresh response
    const response = await handler(request);
    
    // Cache the response
    try {
      const responseData = await response.clone().json();
      
      cacheApiResponse(cacheKey, {
        data: responseData,
        status: response.status
      }, ttlSeconds);
      
      // Add cache header
      response.headers.set('X-Cache', 'MISS');
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
    
    return response;
  };
}
```

## Network Optimization

### API Request Batching

```typescript
// lib/background-jobs/request-batcher.ts
interface BatchRequest<T> {
  data: T;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class RequestBatcher<T> {
  private batchSize: number;
  private maxWaitMs: number;
  private processBatch: (batch: T[]) => Promise<any[]>;
  private batch: BatchRequest<T>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  
  constructor(
    processBatch: (batch: T[]) => Promise<any[]>,
    options: {
      batchSize?: number;
      maxWaitMs?: number;
    } = {}
  ) {
    this.batchSize = options.batchSize || 10;
    this.maxWaitMs = options.maxWaitMs || 100;
    this.processBatch = processBatch;
  }
  
  async add(data: T): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add request to batch
      this.batch.push({ data, resolve, reject });
      
      // Process immediately if batch is full
      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        // Start timeout for processing
        this.timeout = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }
  
  private async flush(): Promise<void> {
    // Clear timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    // Get current batch
    const currentBatch = [...this.batch];
    this.batch = [];
    
    if (currentBatch.length === 0) {
      return;
    }
    
    try {
      // Process batch
      const results = await this.processBatch(currentBatch.map(req => req.data));
      
      // Resolve promises
      currentBatch.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      currentBatch.forEach(request => {
        request.reject(error);
      });
    }
  }
}

// Example usage for OpenAI API
export const openaiEmbeddingBatcher = new RequestBatcher<string>(
  async (texts) => {
    // Make a single API call for multiple texts
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: texts,
      }),
    });
    
    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  },
  { batchSize: 20, maxWaitMs: 50 }
);
```

### HTTP Keep-Alive

```typescript
// lib/background-jobs/optimized-fetch.ts
import https from 'https';
import http from 'http';

// Create HTTP agents with keep-alive
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 60000,
});

// Optimized fetch function with keep-alive
export async function optimizedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const isHttps = url.startsWith('https:');
  
  // Add appropriate agent
  const fetchOptions: RequestInit = {
    ...options,
    // @ts-ignore - Node.js specific
    agent: isHttps ? httpsAgent : httpAgent,
  };
  
  // Add default headers
  if (!fetchOptions.headers) {
    fetchOptions.headers = {};
  }
  
  // Add connection: keep-alive header
  fetchOptions.headers = {
    ...fetchOptions.headers,
    'Connection': 'keep-alive',
  };
  
  return fetch(url, fetchOptions);
}

// Optimized OpenAI API client
export async function callOpenAI(
  endpoint: string,
  data: any
): Promise<any> {
  const response = await optimizedFetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  return response.json();
}

// Optimized Cloudinary API client
export async function callCloudinary(
  action: string,
  data: any
): Promise<any> {
  const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${action}`;
  
  const formData = new FormData();
  
  // Add API key and timestamp
  formData.append('api_key', process.env.CLOUDINARY_API_KEY!);
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  
  // Add other data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value as string);
  });
  
  // Generate signature
  // In a real implementation, we would generate a proper signature
  
  const response = await optimizedFetch(url, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudinary API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  return response.json();
}
```

### Request Retries and Backoff

```typescript
// lib/background-jobs/retry-fetch.ts
import { optimizedFetch } from './optimized-fetch';

interface RetryOptions {
  retries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffFactor: number;
  retryStatusCodes: number[];
  retryNetworkErrors: boolean;
}

const defaultRetryOptions: RetryOptions = {
  retries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  retryNetworkErrors: true,
};

// Fetch with automatic retries and exponential backoff
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const opts = { ...defaultRetryOptions, ...retryOptions };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const response = await optimizedFetch(url, options);
      
      // Check if response should be retried
      if (opts.retryStatusCodes.includes(response.status)) {
        // Get retry-after header if available
        const retryAfter = response.headers.get('retry-after');
        let delayMs = calculateBackoff(attempt, opts);
        
        if (retryAfter) {
          // Parse retry-after header (seconds or HTTP date)
          if (/^\d+$/.test(retryAfter)) {
            delayMs = parseInt(retryAfter) * 1000;
          } else {
            const retryDate = new Date(retryAfter);
            if (!isNaN(retryDate.getTime())) {
              delayMs = retryDate.getTime() - Date.now();
            }
          }
        }
        
        console.log(`🔄 Retrying request (${attempt + 1}/${opts.retries}) after ${delayMs}ms due to status ${response.status}`);
        
        // Wait before retry
        await delay(delayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Only retry network errors if enabled
      if (!opts.retryNetworkErrors) {
        throw error;
      }
      
      // Last attempt, throw error
      if (attempt === opts.retries) {
        throw new Error(`Failed after ${opts.retries} retries: ${lastError.message}`);
      }
      
      const delayMs = calculateBackoff(attempt, opts);
      console.log(`🔄 Retrying request (${attempt + 1}/${opts.retries}) after ${delayMs}ms due to error: ${lastError.message}`);
      
      // Wait before retry
      await delay(delayMs);
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError || new Error('Unknown error during retry');
}

// Calculate backoff delay
function calculateBackoff(attempt: number, options: RetryOptions): number {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelay);
}

// Delay promise
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// OpenAI API with retries
export async function callOpenAIWithRetry(
  endpoint: string,
  data: any,
  retryOptions: Partial<RetryOptions> = {}
): Promise<any> {
  const response = await retryFetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, {
    retries: 5, // More retries for OpenAI
    initialDelay: 2000, // Start with 2 seconds
    ...retryOptions,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  return response.json();
}
```

## Monitoring Overhead

### Efficient Monitoring

```typescript
// lib/background-jobs/efficient-monitor.ts
import { jobMonitor } from './monitor';

// Sampling rate for detailed metrics (0-1)
const METRICS_SAMPLING_RATE = parseFloat(process.env.METRICS_SAMPLING_RATE || '0.1');

// Interval for full metrics collection (ms)
const FULL_METRICS_INTERVAL = parseInt(process.env.FULL_METRICS_INTERVAL || '300000'); // 5 minutes

// Last full metrics collection timestamp
let lastFullMetricsTime = 0;

// Collect metrics with sampling
export async function collectMetricsWithSampling(): Promise<any> {
  const now = Date.now();
  
  // Check if we should do full metrics collection
  const shouldCollectFull = now - lastFullMetricsTime >= FULL_METRICS_INTERVAL;
  
  // Check if we should sample this request
  const shouldSample = Math.random() < METRICS_SAMPLING_RATE;
  
  if (shouldCollectFull || shouldSample) {
    // Collect full metrics
    if (shouldCollectFull) {
      lastFullMetricsTime = now;
      return jobMonitor.generateHealthReport();
    }
    
    // Collect basic metrics
    return {
      timestamp: new Date().toISOString(),
      jobStatistics: await jobMonitor.getJobStatistics(),
      systemHealth: await jobMonitor.getSystemHealth(),
    };
  }
  
  // Skip metrics collection
  return null;
}

// Lightweight health check
export async function lightweightHealthCheck(): Promise<{
  healthy: boolean;
  queueDepth: number;
}> {
  try {
    const stats = await jobMonitor.getJobStatistics();
    
    return {
      healthy: true,
      queueDepth: stats.queueDepth,
    };
  } catch (error) {
    return {
      healthy: false,
      queueDepth: -1,
    };
  }
}

// Conditional logging
export function conditionalLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: any
): void {
  // Always log errors
  if (level === 'error') {
    console.error(message, data);
    return;
  }
  
  // Always log warnings
  if (level === 'warn') {
    console.warn(message, data);
    return;
  }
  
  // Sample info logs
  if (level === 'info' && Math.random() < 0.1) {
    console.log(message, data);
    return;
  }
  
  // Only log debug in development
  if (level === 'debug' && process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data);
    return;
  }
}
```

### Optimized Health Check

```typescript
// app/api/jobs/health/optimized/route.ts
import { NextResponse } from 'next/server';
import { lightweightHealthCheck } from '@/lib/background-jobs/efficient-monitor';
import { jobConfig } from '@/lib/background-jobs/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const full = url.searchParams.get('full') === 'true';
    
    // If full health check requested, redirect to full endpoint
    if (full) {
      return NextResponse.redirect(new URL('/api/jobs/health', request.url));
    }
    
    // Perform lightweight health check
    const health = await lightweightHealthCheck();
    
    // Prepare response
    const response = {
      status: health.healthy ? 'healthy' : 'critical',
      timestamp: new Date().toISOString(),
      queueDepth: health.queueDepth,
      autoProcessing: jobConfig.isFeatureEnabled('enableAutoProcessing'),
    };
    
    // Set cache headers
    const headers = {
      'Cache-Control': 'public, max-age=10', // Cache for 10 seconds
    };
    
    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'critical',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
```

## Job Prioritization

### Priority Queue Implementation

```typescript
// lib/background-jobs/priority-queue.ts
interface PriorityQueueItem<T> {
  item: T;
  priority: number;
}

class PriorityQueue<T> {
  private items: PriorityQueueItem<T>[] = [];
  
  // Add item to queue with priority
  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority };
    
    // Find position to insert (higher priority items first)
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, queueItem);
        added = true;
        break;
      }
    }
    
    // If not added, add to end
    if (!added) {
      this.items.push(queueItem);
    }
  }
  
  // Get highest priority item
  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    return this.items.shift()!.item;
  }
  
  // Check if queue is empty
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  // Get queue size
  size(): number {
    return this.items.length;
  }
  
  // Get all items
  getItems(): T[] {
    return this.items.map(item => item.item);
  }
  
  // Clear queue
  clear(): void {
    this.items = [];
  }
}

// Job priority calculator
export function calculateJobPriority(job: any): number {
  let priority = 0;
  
  // Base priority by job type
  switch (job.type) {
    case 'storybook':
      priority = 2;
      break;
    case 'auto-story':
      priority = 3;
      break;
    case 'scenes':
      priority = 2;
      break;
    case 'cartoonize':
      priority = 1;
      break;
    case 'image-generation':
      priority = 1;
      break;
    default:
      priority = 0;
  }
  
  // Adjust for wait time (older jobs get higher priority)
  const waitTimeMinutes = (Date.now() - new Date(job.created_at).getTime()) / (60 * 1000);
  priority += Math.min(5, waitTimeMinutes / 10); // Max +5 for wait time
  
  // Adjust for retry count (retried jobs get higher priority)
  priority += job.retry_count * 0.5; // +0.5 per retry
  
  // Adjust for user type (premium users get higher priority)
  if (job.user_type === 'premium') {
    priority += 3;
  } else if (job.user_type === 'admin') {
    priority += 5;
  }
  
  return priority;
}

export const jobPriorityQueue = new PriorityQueue<any>();
```

### Prioritized Job Processing

```typescript
// lib/background-jobs/prioritized-worker.ts
import { jobManager } from './job-manager';
import { jobPriorityQueue, calculateJobPriority } from './priority-queue';
import { jobProcessor } from './job-processor';
import { jobConfig } from './config';

class PrioritizedJobWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Start automatic job processing
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Worker already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting prioritized job worker');
    
    this.intervalId = setInterval(async () => {
      try {
        await this.processJobs();
      } catch (error) {
        console.error('❌ Worker processing error:', error);
      }
    }, jobConfig.getProcessingInterval());
  }
  
  // Stop automatic job processing
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Worker not running');
      return;
    }
    
    this.isRunning = false;
    console.log('🛑 Stopping prioritized job worker');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  // Process jobs with priority
  async processJobs(maxJobs: number = 10): Promise<{
    processed: number;
    errors: number;
    skipped: number;
  }> {
    if (!jobManager.isHealthy()) {
      console.warn('⚠️ Job manager not healthy, skipping processing');
      return { processed: 0, errors: 0, skipped: 1 };
    }
    
    const stats = {
      processed: 0,
      errors: 0,
      skipped: 0,
    };
    
    console.log(`🔄 Processing up to ${maxJobs} jobs with priority...`);
    
    try {
      // Get pending jobs
      const pendingJobs = await jobManager.getPendingJobs({}, maxJobs * 2); // Get more than needed for prioritization
      
      if (pendingJobs.length === 0) {
        console.log('📭 No pending jobs to process');
        return stats;
      }
      
      console.log(`📋 Found ${pendingJobs.length} pending jobs`);
      
      // Clear priority queue
      jobPriorityQueue.clear();
      
      // Add jobs to priority queue
      for (const job of pendingJobs) {
        const priority = calculateJobPriority(job);
        jobPriorityQueue.enqueue(job, priority);
      }
      
      // Process jobs in priority order
      let processed = 0;
      
      while (!jobPriorityQueue.isEmpty() && processed < maxJobs) {
        const job = jobPriorityQueue.dequeue();
        
        if (!job) break;
        
        try {
          console.log(`🔄 Processing job: ${job.id} (priority: ${calculateJobPriority(job)})`);
          
          // Process the job
          await jobProcessor.processNextJobStep();
          stats.processed++;
          processed++;
        } catch (error) {
          console.error(`❌ Job processing failed: ${job.id}`, error);
          stats.errors++;
          
          // Mark job as failed
          await jobManager.markJobFailed(
            job.id, 
            error.message || 'Job processing failed', 
            true // Allow retry
          );
        }
      }
      
      // Count skipped jobs
      stats.skipped = jobPriorityQueue.size();
      
      console.log(`✅ Priority processing complete: ${stats.processed} processed, ${stats.errors} errors, ${stats.skipped} skipped`);
    } catch (error) {
      console.error('❌ Worker processing error:', error);
      stats.errors++;
    }
    
    return stats;
  }
  
  // Get worker statistics
  getStats() {
    return {
      isRunning: this.isRunning,
      processingInterval: jobConfig.getProcessingInterval(),
      priorityEnabled: jobConfig.isFeatureEnabled('enablePriorityProcessing'),
    };
  }
  
  // Health check
  isHealthy(): boolean {
    return jobManager.isHealthy() && jobProcessor.isHealthy();
  }
}

// Export singleton instance
export const prioritizedJobWorker = new PrioritizedJobWorker();
```

## Batch Processing

### Job Batching

```typescript
// lib/background-jobs/batch-processor.ts
import { jobManager } from './job-manager';
import { jobProcessor } from './job-processor';

interface BatchProcessingResult {
  batchId: string;
  jobsProcessed: number;
  successCount: number;
  errorCount: number;
  processingTime: number;
}

class BatchProcessor {
  private batchSize: number;
  private concurrency: number;
  
  constructor(options: {
    batchSize?: number;
    concurrency?: number;
  } = {}) {
    this.batchSize = options.batchSize || 10;
    this.concurrency = options.concurrency || 3;
  }
  
  // Process a batch of jobs
  async processBatch(
    jobType?: string,
    userId?: string
  ): Promise<BatchProcessingResult> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const startTime = Date.now();
    
    console.log(`🔄 Starting batch processing: ${batchId}`);
    
    try {
      // Get pending jobs
      const filter: any = {};
      if (jobType) filter.type = jobType;
      if (userId) filter.user_id = userId;
      
      const pendingJobs = await jobManager.getPendingJobs(filter, this.batchSize);
      
      if (pendingJobs.length === 0) {
        console.log('📭 No pending jobs for batch processing');
        return {
          batchId,
          jobsProcessed: 0,
          successCount: 0,
          errorCount: 0,
          processingTime: Date.now() - startTime
        };
      }
      
      console.log(`📋 Found ${pendingJobs.length} jobs for batch processing`);
      
      // Process jobs with concurrency limit
      const results = await this.processWithConcurrency(pendingJobs);
      
      const successCount = results.filter(r => r).length;
      const errorCount = results.filter(r => !r).length;
      
      console.log(`✅ Batch processing complete: ${successCount} succeeded, ${errorCount} failed`);
      
      return {
        batchId,
        jobsProcessed: pendingJobs.length,
        successCount,
        errorCount,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('❌ Batch processing error:', error);
      
      return {
        batchId,
        jobsProcessed: 0,
        successCount: 0,
        errorCount: 1,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  // Process jobs with concurrency limit
  private async processWithConcurrency(jobs: any[]): Promise<boolean[]> {
    // Create chunks of jobs based on concurrency
    const chunks = [];
    for (let i = 0; i < jobs.length; i += this.concurrency) {
      chunks.push(jobs.slice(i, i + this.concurrency));
    }
    
    const results: boolean[] = [];
    
    // Process each chunk
    for (const chunk of chunks) {
      // Process jobs in chunk concurrently
      const chunkResults = await Promise.all(
        chunk.map(job => this.processJob(job))
      );
      
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  // Process a single job
  private async processJob(job: any): Promise<boolean> {
    try {
      console.log(`🔄 Processing job in batch: ${job.id}`);
      
      // Process the job
      await jobProcessor.processNextJobStep();
      
      return true;
    } catch (error) {
      console.error(`❌ Job processing failed: ${job.id}`, error);
      
      // Mark job as failed
      await jobManager.markJobFailed(
        job.id, 
        error.message || 'Job processing failed', 
        true // Allow retry
      );
      
      return false;
    }
  }
}

export const batchProcessor = new BatchProcessor();
```

### Batch API Endpoint

```typescript
// app/api/jobs/batch/route.ts
import { NextResponse } from 'next/server';
import { batchProcessor } from '@/lib/background-jobs/batch-processor';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Parse request body
    const { jobType, userId, batchSize, concurrency } = await request.json();
    
    // Set batch processor options
    if (batchSize) {
      batchProcessor.batchSize = batchSize;
    }
    
    if (concurrency) {
      batchProcessor.concurrency = concurrency;
    }
    
    // Process batch
    const result = await batchProcessor.processBatch(jobType, userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch processing API error:', error);
    
    return NextResponse.json({
      error: 'Failed to process batch',
      details: error.message
    }, { status: 500 });
  }
}
```

## Scaling Strategies

### Horizontal Scaling

```typescript
// lib/background-jobs/scaling-manager.ts
import os from 'os';
import { jobMonitor } from './monitor';
import { jobConfig } from './config';

interface ScalingRecommendation {
  action: 'scale_up' | 'scale_down' | 'no_change';
  reason: string;
  currentLoad: number;
  targetInstances: number;
}

class ScalingManager {
  private currentInstances: number = 1;
  private maxInstances: number = 10;
  private minInstances: number = 1;
  private scaleUpThreshold: number = 80; // percentage
  private scaleDownThreshold: number = 30; // percentage
  private cooldownPeriod: number = 300000; // 5 minutes
  private lastScaleTime: number = 0;
  
  constructor(options: {
    maxInstances?: number;
    minInstances?: number;
    scaleUpThreshold?: number;
    scaleDownThreshold?: number;
    cooldownPeriod?: number;
  } = {}) {
    this.maxInstances = options.maxInstances || 10;
    this.minInstances = options.minInstances || 1;
    this.scaleUpThreshold = options.scaleUpThreshold || 80;
    this.scaleDownThreshold = options.scaleDownThreshold || 30;
    this.cooldownPeriod = options.cooldownPeriod || 300000;
  }
  
  // Get scaling recommendation
  async getScalingRecommendation(): Promise<ScalingRecommendation> {
    try {
      // Check if in cooldown period
      const now = Date.now();
      if (now - this.lastScaleTime < this.cooldownPeriod) {
        return {
          action: 'no_change',
          reason: 'In cooldown period',
          currentLoad: 0,
          targetInstances: this.currentInstances
        };
      }
      
      // Get system metrics
      const healthReport = await jobMonitor.generateHealthReport();
      const queueDepth = healthReport.jobStatistics.queueDepth;
      const processingCapacity = healthReport.systemHealth.processingCapacity;
      
      // Calculate current load percentage
      const currentLoad = (queueDepth / processingCapacity) * 100;
      
      // Check if we should scale up
      if (currentLoad > this.scaleUpThreshold && this.currentInstances < this.maxInstances) {
        // Calculate target instances
        const targetInstances = Math.min(
          this.maxInstances,
          Math.ceil(this.currentInstances * 1.5) // Increase by 50%
        );
        
        return {
          action: 'scale_up',
          reason: `Load (${currentLoad.toFixed(1)}%) exceeds threshold (${this.scaleUpThreshold}%)`,
          currentLoad,
          targetInstances
        };
      }
      
      // Check if we should scale down
      if (currentLoad < this.scaleDownThreshold && this.currentInstances > this.minInstances) {
        // Calculate target instances
        const targetInstances = Math.max(
          this.minInstances,
          Math.floor(this.currentInstances * 0.5) // Decrease by 50%
        );
        
        return {
          action: 'scale_down',
          reason: `Load (${currentLoad.toFixed(1)}%) below threshold (${this.scaleDownThreshold}%)`,
          currentLoad,
          targetInstances
        };
      }
      
      // No change needed
      return {
        action: 'no_change',
        reason: `Load (${currentLoad.toFixed(1)}%) within thresholds`,
        currentLoad,
        targetInstances: this.currentInstances
      };
    } catch (error) {
      console.error('Scaling recommendation error:', error);
      
      return {
        action: 'no_change',
        reason: 'Error getting metrics',
        currentLoad: 0,
        targetInstances: this.currentInstances
      };
    }
  }
  
  // Update current instances
  updateInstanceCount(instances: number): void {
    this.currentInstances = instances;
    this.lastScaleTime = Date.now();
  }
  
  // Get current scaling status
  getScalingStatus(): {
    currentInstances: number;
    maxInstances: number;
    minInstances: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
    timeUntilCooldownEnds: number;
  } {
    const now = Date.now();
    const cooldownRemaining = Math.max(0, this.cooldownPeriod - (now - this.lastScaleTime));
    
    return {
      currentInstances: this.currentInstances,
      maxInstances: this.maxInstances,
      minInstances: this.minInstances,
      scaleUpThreshold: this.scaleUpThreshold,
      scaleDownThreshold: this.scaleDownThreshold,
      cooldownPeriod: this.cooldownPeriod,
      timeUntilCooldownEnds: cooldownRemaining
    };
  }
}

export const scalingManager = new ScalingManager();
```

### Vertical Scaling

```typescript
// lib/background-jobs/resource-manager.ts
import os from 'os';
import { jobConfig } from './config';

interface ResourceAllocation {
  cpu: number; // percentage
  memory: number; // MB
  network: number; // Mbps
}

interface ResourceRecommendation {
  action: 'increase' | 'decrease' | 'no_change';
  reason: string;
  currentAllocation: ResourceAllocation;
  recommendedAllocation: ResourceAllocation;
}

class ResourceManager {
  private cpuAllocation: number = 80; // percentage
  private memoryAllocation: number = 512; // MB
  private networkAllocation: number = 100; // Mbps
  
  // Get current resource usage
  getCurrentUsage(): ResourceAllocation {
    // Get CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = 100 - (totalIdle / totalTick * 100);
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsageMB = usedMemory / 1024 / 1024;
    
    // Network usage is harder to measure accurately
    // This would require additional monitoring
    const networkUsage = 50; // placeholder
    
    return {
      cpu: cpuUsage,
      memory: memoryUsageMB,
      network: networkUsage
    };
  }
  
  // Get resource recommendation
  getResourceRecommendation(): ResourceRecommendation {
    const currentUsage = this.getCurrentUsage();
    
    // Check CPU usage
    if (currentUsage.cpu > this.cpuAllocation * 0.9) {
      // CPU usage is high
      return {
        action: 'increase',
        reason: 'CPU usage is approaching limit',
        currentAllocation: {
          cpu: this.cpuAllocation,
          memory: this.memoryAllocation,
          network: this.networkAllocation
        },
        recommendedAllocation: {
          cpu: Math.min(100, this.cpuAllocation * 1.5),
          memory: this.memoryAllocation,
          network: this.networkAllocation
        }
      };
    }
    
    // Check memory usage
    if (currentUsage.memory > this.memoryAllocation * 0.9) {
      // Memory usage is high
      return {
        action: 'increase',
        reason: 'Memory usage is approaching limit',
        currentAllocation: {
          cpu: this.cpuAllocation,
          memory: this.memoryAllocation,
          network: this.networkAllocation
        },
        recommendedAllocation: {
          cpu: this.cpuAllocation,
          memory: this.memoryAllocation * 1.5,
          network: this.networkAllocation
        }
      };
    }
    
    // Check if resources can be decreased
    if (currentUsage.cpu < this.cpuAllocation * 0.3 && currentUsage.memory < this.memoryAllocation * 0.3) {
      // Resource usage is low
      return {
        action: 'decrease',
        reason: 'Resource usage is significantly below allocation',
        currentAllocation: {
          cpu: this.cpuAllocation,
          memory: this.memoryAllocation,
          network: this.networkAllocation
        },
        recommendedAllocation: {
          cpu: Math.max(50, this.cpuAllocation * 0.7),
          memory: Math.max(256, this.memoryAllocation * 0.7),
          network: this.networkAllocation
        }
      };
    }
    
    // No change needed
    return {
      action: 'no_change',
      reason: 'Resource usage is within acceptable range',
      currentAllocation: {
        cpu: this.cpuAllocation,
        memory: this.memoryAllocation,
        network: this.networkAllocation
      },
      recommendedAllocation: {
        cpu: this.cpuAllocation,
        memory: this.memoryAllocation,
        network: this.networkAllocation
      }
    };
  }
  
  // Update resource allocation
  updateAllocation(allocation: Partial<ResourceAllocation>): void {
    if (allocation.cpu !== undefined) {
      this.cpuAllocation = allocation.cpu;
    }
    
    if (allocation.memory !== undefined) {
      this.memoryAllocation = allocation.memory;
    }
    
    if (allocation.network !== undefined) {
      this.networkAllocation = allocation.network;
    }
    
    console.log('✅ Updated resource allocation:', {
      cpu: this.cpuAllocation,
      memory: this.memoryAllocation,
      network: this.networkAllocation
    });
  }
  
  // Get current allocation
  getAllocation(): ResourceAllocation {
    return {
      cpu: this.cpuAllocation,
      memory: this.memoryAllocation,
      network: this.networkAllocation
    };
  }
}

export const resourceManager = new ResourceManager();
```

## Conclusion

This performance optimization guide provides comprehensive strategies for maximizing the efficiency, throughput, and reliability of the background job system. By implementing these optimizations, you can:

1. **Increase Throughput**: Process more jobs in less time
2. **Reduce Latency**: Minimize job processing time
3. **Improve Reliability**: Handle errors and retries gracefully
4. **Optimize Resources**: Use CPU, memory, and network efficiently
5. **Scale Effectively**: Handle growing workloads with horizontal and vertical scaling

For additional information, refer to:
- [API Documentation](API_DOCUMENTATION.md)
- [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Monitoring Setup](MONITORING_SETUP.md)
- [Migration Guide](MIGRATION_GUIDE.md)