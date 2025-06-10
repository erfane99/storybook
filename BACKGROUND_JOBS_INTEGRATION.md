# Background Jobs Integration Guide

This guide provides comprehensive step-by-step instructions for integrating the complete background job system into any production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [API Integration](#api-integration)
5. [Frontend Integration](#frontend-integration)
6. [Testing Procedures](#testing-procedures)
7. [Deployment Verification](#deployment-verification)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Performance Optimization](#performance-optimization)

## Prerequisites

### Required Services
- **Supabase Database**: PostgreSQL database with RLS support
- **OpenAI API**: For AI-powered content generation
- **Cloudinary**: For image storage and processing
- **Deployment Platform**: Netlify, Vercel, or similar

### Required Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install framer-motion lucide-react
npm install cloudinary
```

### System Requirements
- Node.js 18+ 
- PostgreSQL 14+
- Minimum 512MB RAM for background processing
- Reliable internet connection for external API calls

## Database Setup

### 1. Execute Migrations

Run all migration files in order:

```sql
-- Execute these files in your Supabase SQL editor:
-- 1. supabase/migrations/20250505080750_sparkling_hat.sql
-- 2. supabase/migrations/20250505080805_old_harbor.sql
-- 3. supabase/migrations/20250507095903_pale_leaf.sql
-- 4. supabase/migrations/20250514124036_silver_glitter.sql
-- 5. supabase/migrations/20250515134026_velvet_frost.sql
-- 6. supabase/migrations/20250525131928_maroon_bridge.sql
-- 7. supabase/migrations/20250527102720_royal_night.sql
-- 8. supabase/migrations/20250607112841_pale_spark.sql
-- 9. supabase/migrations/20250610112606_floating_disk.sql
```

### 2. Verify Tables Created

Confirm these tables exist:
- `users` - User profiles and authentication
- `storybook_entries` - Complete storybooks
- `background_jobs` - Job queue and status tracking
- `phone_otp` - Phone verification
- `print_requests` - Print order management
- `cartoon_cache` - Image caching

### 3. Index Optimization

Add performance indexes:

```sql
-- Optimize job processing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_jobs_processing 
ON background_jobs(status, created_at) WHERE status IN ('pending', 'processing');

-- Optimize user job lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_jobs_user_status 
ON background_jobs(user_id, status, created_at);

-- Optimize cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_jobs_cleanup 
ON background_jobs(status, completed_at) WHERE status IN ('completed', 'failed', 'cancelled');
```

### 4. RLS Policy Verification

Verify Row Level Security is enabled:

```sql
-- Check RLS is enabled on critical tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('background_jobs', 'storybook_entries', 'users')
AND rowsecurity = true;
```

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.production.example .env.local
```

### 2. Configure Required Variables

**Database & Authentication:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**AI Services:**
```env
OPENAI_API_KEY=sk-your-openai-key
```

**Image Storage:**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Background Jobs Configuration:**
```env
ENABLE_AUTO_PROCESSING=true
JOB_PROCESSING_INTERVAL=30000
MAX_CONCURRENT_JOBS=3
MAX_JOBS_PER_USER=5
JOB_TIMEOUT_MINUTES=15
JOB_RETENTION_DAYS=7
```

**Security:**
```env
WEBHOOK_SECRET=your-webhook-secret-256-bit
GITHUB_WEBHOOK_SECRET=your-github-secret
VERCEL_WEBHOOK_SECRET=your-vercel-secret
```

**Monitoring:**
```env
MONITORING_ENABLED=true
ENABLE_PRIORITY_PROCESSING=true
ENABLE_METRICS_COLLECTION=true
ENABLE_HEALTH_CHECKS=true
```

### 3. Validate Configuration

Run the configuration validator:

```bash
npm run validate-config
```

## API Integration

### 1. Replace Timeout-Prone Endpoints

**Before (Direct Processing):**
```typescript
// OLD: Direct API call with timeout risk
const response = await fetch('/api/story/create-storybook', {
  method: 'POST',
  body: JSON.stringify(storyData)
});
```

**After (Background Jobs):**
```typescript
// NEW: Background job with polling
const startResponse = await fetch('/api/jobs/storybook/start', {
  method: 'POST',
  body: JSON.stringify(storyData)
});
const { jobId, pollingUrl } = await startResponse.json();

// Poll for completion
const pollJob = async () => {
  const statusResponse = await fetch(`/api/jobs/storybook/status/${jobId}`);
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    return status.result;
  } else if (status.status === 'failed') {
    throw new Error(status.error);
  }
  
  // Continue polling
  setTimeout(pollJob, 2000);
};
```

### 2. Endpoint Migration Map

| Old Endpoint | New Start Endpoint | New Status Endpoint |
|--------------|-------------------|-------------------|
| `/api/story/create-storybook` | `/api/jobs/storybook/start` | `/api/jobs/storybook/status/[jobId]` |
| `/api/story/generate-auto-story` | `/api/jobs/auto-story/start` | `/api/jobs/auto-story/status/[jobId]` |
| `/api/story/generate-scenes` | `/api/jobs/scenes/start` | `/api/jobs/scenes/status/[jobId]` |
| `/api/image/cartoonize` | `/api/jobs/cartoonize/start` | `/api/jobs/cartoonize/status/[jobId]` |
| `/api/story/generate-cartoon-image` | `/api/jobs/image/start` | `/api/jobs/image/status/[jobId]` |

### 3. Error Handling Updates

```typescript
// Enhanced error handling for background jobs
try {
  const { jobId } = await startJob(jobData);
  const result = await pollJobCompletion(jobId);
  return result;
} catch (error) {
  if (error.code === 'JOB_TIMEOUT') {
    // Handle timeout gracefully
    showTimeoutMessage();
  } else if (error.code === 'JOB_FAILED') {
    // Handle job failure
    showRetryOption();
  } else {
    // Handle other errors
    showGenericError();
  }
}
```

## Frontend Integration

### 1. Install Polling Hook

The `useJobPolling` hook is already included. Use it like this:

```typescript
import { useJobPolling } from '@/hooks/use-job-polling';

function StoryCreationComponent() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  const { data, isPolling, error } = useJobPolling(jobId, pollingUrl, {
    onComplete: (result) => {
      // Handle completion
      router.push(`/storybook/${result.storybook_id}`);
    },
    onError: (error) => {
      // Handle error
      setError(error);
    }
  });

  const handleSubmit = async (formData) => {
    const response = await fetch('/api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    const { jobId, pollingUrl } = await response.json();
    setJobId(jobId);
  };

  return (
    <div>
      {isPolling && (
        <ProgressTracker
          jobId={data?.jobId}
          status={data?.status}
          progress={data?.progress}
          currentStep={data?.currentStep}
        />
      )}
    </div>
  );
}
```

### 2. Update Form Components

Replace direct API calls in form submission handlers:

```typescript
// Update MultiStepStoryForm.tsx
const handleSubmit = async () => {
  setIsSubmitting(true);
  
  try {
    // Start background job instead of direct processing
    const response = await fetch('/api/jobs/storybook/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Failed to start storybook generation');
    }

    const { jobId, pollingUrl, estimatedCompletion } = await response.json();
    
    // Set up polling
    setJobId(jobId);
    setPollingUrl(pollingUrl);
    
    toast({
      title: 'Generation Started',
      description: `Your storybook will be ready in approximately ${estimatedMinutes} minutes.`
    });

  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message
    });
    setIsSubmitting(false);
  }
};
```

### 3. Add Progress Components

The progress tracking components are already included:
- `ProgressTracker` - Shows real-time progress
- `JobStatusCard` - Displays job status with actions
- `JobDashboard` - Central job management

## Testing Procedures

### 1. Unit Testing

Test individual components:

```bash
# Test job creation
npm run test -- --testNamePattern="job creation"

# Test polling functionality
npm run test -- --testNamePattern="job polling"

# Test error handling
npm run test -- --testNamePattern="error handling"
```

### 2. Integration Testing

Test complete workflows:

```bash
# Test storybook generation end-to-end
npm run test:e2e -- storybook-generation

# Test auto-story generation
npm run test:e2e -- auto-story-generation

# Test image processing
npm run test:e2e -- image-processing
```

### 3. Load Testing

Test system under load:

```bash
# Simulate concurrent users
npm run test:load -- --users=10 --duration=5m

# Test queue management
npm run test:queue -- --jobs=50
```

### 4. Manual Testing Checklist

- [ ] Create storybook with background job
- [ ] Generate auto-story with polling
- [ ] Process multiple images concurrently
- [ ] Test job cancellation
- [ ] Verify error handling and retries
- [ ] Test system under high load
- [ ] Verify cleanup of old jobs
- [ ] Test health check endpoints

## Deployment Verification

### 1. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations executed
- [ ] SSL certificates valid
- [ ] External services accessible
- [ ] Webhook endpoints configured

### 2. Post-Deployment Verification

**Health Check:**
```bash
curl https://your-domain.com/api/jobs/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "All systems operational",
  "metrics": {
    "queueDepth": 0,
    "processingCapacity": 3,
    "successRate": 100
  }
}
```

**Job Processing Test:**
```bash
# Test manual job processing
curl -X POST https://your-domain.com/api/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 1}'
```

**Cron Webhook Test:**
```bash
# Test cron processing
curl -X POST https://your-domain.com/api/cron/process-jobs \
  -H "x-webhook-secret: your-secret" \
  -H "Content-Type: application/json"
```

### 3. Monitoring Setup

Configure monitoring endpoints:

```bash
# Set up health check monitoring (every 5 minutes)
*/5 * * * * curl -f https://your-domain.com/api/jobs/health || alert

# Set up queue depth monitoring
*/1 * * * * curl -s https://your-domain.com/api/jobs/health | jq '.metrics.queueDepth' | awk '$1 > 20 { print "Queue depth high: " $1 }'
```

## Troubleshooting Guide

### Common Issues

**1. Jobs Stuck in Pending Status**

Symptoms: Jobs created but never start processing

Solutions:
- Check if auto-processing is enabled: `ENABLE_AUTO_PROCESSING=true`
- Verify cron jobs are running
- Check system health: `GET /api/jobs/health`
- Manually trigger processing: `POST /api/jobs/process`

**2. High Error Rates**

Symptoms: Many jobs failing with errors

Solutions:
- Check OpenAI API key validity
- Verify Cloudinary configuration
- Check database connectivity
- Review error logs for patterns

**3. Slow Processing**

Symptoms: Jobs taking longer than expected

Solutions:
- Increase concurrent job limit: `MAX_CONCURRENT_JOBS=5`
- Optimize database queries
- Check external API response times
- Monitor system resources

**4. Memory Issues**

Symptoms: Out of memory errors during processing

Solutions:
- Reduce concurrent jobs: `MAX_CONCURRENT_JOBS=2`
- Implement job batching
- Add memory monitoring
- Optimize image processing

### Debug Commands

```bash
# Check job queue status
curl https://your-domain.com/api/jobs/process

# Get detailed health report
curl https://your-domain.com/api/jobs/health

# Check specific job status
curl https://your-domain.com/api/jobs/storybook/status/job-id

# Manual job processing
curl -X POST https://your-domain.com/api/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 5, "forceProcessing": true}'
```

### Log Analysis

Monitor these log patterns:

```bash
# Successful job processing
grep "✅.*job.*completed" logs/

# Failed jobs
grep "❌.*job.*failed" logs/

# Stuck jobs
grep "🔍.*stuck.*jobs" logs/

# System health issues
grep "❌.*Health check failed" logs/
```

## Performance Optimization

### 1. Database Optimization

**Connection Pooling:**
```env
# Optimize database connections
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=30000
```

**Query Optimization:**
```sql
-- Add indexes for frequent queries
CREATE INDEX CONCURRENTLY idx_jobs_user_recent 
ON background_jobs(user_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';
```

### 2. Concurrency Tuning

**Production Settings:**
```env
MAX_CONCURRENT_JOBS=5
MAX_JOBS_PER_USER=3
JOB_PROCESSING_INTERVAL=15000
```

**Development Settings:**
```env
MAX_CONCURRENT_JOBS=2
MAX_JOBS_PER_USER=2
JOB_PROCESSING_INTERVAL=10000
```

### 3. Caching Strategies

**Image Caching:**
- Enable Cloudinary auto-optimization
- Implement browser caching headers
- Use CDN for static assets

**API Response Caching:**
```typescript
// Cache job status responses
const cacheKey = `job-status-${jobId}`;
const cachedStatus = await redis.get(cacheKey);
if (cachedStatus && job.status !== 'processing') {
  return JSON.parse(cachedStatus);
}
```

### 4. Resource Management

**Memory Optimization:**
```env
NODE_OPTIONS="--max-old-space-size=1024"
```

**CPU Optimization:**
- Use worker threads for CPU-intensive tasks
- Implement job priority queues
- Add circuit breakers for external APIs

### 5. Monitoring and Alerting

**Key Metrics to Track:**
- Queue depth (alert if > 20)
- Processing time (alert if > 10 minutes)
- Error rate (alert if > 10%)
- Success rate (alert if < 90%)

**Alert Configuration:**
```bash
# Queue depth alert
if queue_depth > 20; then
  send_alert "High queue depth: $queue_depth"
fi

# Error rate alert
if error_rate > 10; then
  send_alert "High error rate: $error_rate%"
fi
```

## Next Steps

After successful integration:

1. **Monitor Performance**: Track key metrics for the first week
2. **Optimize Settings**: Adjust concurrency and timeout values based on usage
3. **Scale Resources**: Increase limits as user base grows
4. **Add Features**: Implement job prioritization and advanced scheduling
5. **Backup Strategy**: Set up automated database backups
6. **Disaster Recovery**: Plan for system failure scenarios

For additional support, refer to:
- [API Documentation](API_DOCUMENTATION.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md)
- [Monitoring Setup](MONITORING_SETUP.md)