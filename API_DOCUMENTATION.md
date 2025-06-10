# Background Jobs API Documentation

Complete API reference for the background job system, including all endpoints, request/response formats, and integration examples.

## Table of Contents

1. [Authentication](#authentication)
2. [Job Management Endpoints](#job-management-endpoints)
3. [Monitoring Endpoints](#monitoring-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Webhook Endpoints](#webhook-endpoints)
6. [Error Codes](#error-codes)
7. [Rate Limiting](#rate-limiting)
8. [Integration Examples](#integration-examples)

## Authentication

### User Authentication

Most endpoints require user authentication via Supabase Auth:

```typescript
// Include in request headers
{
  "Authorization": "Bearer <supabase_access_token>",
  "Content-Type": "application/json"
}
```

### Webhook Authentication

Webhook endpoints require secret validation:

```typescript
// Include in request headers
{
  "x-webhook-secret": "<your_webhook_secret>",
  "Content-Type": "application/json"
}
```

## Job Management Endpoints

### Storybook Generation

#### Start Storybook Job

**Endpoint:** `POST /api/jobs/storybook/start`

**Description:** Creates a background job for complete storybook generation

**Authentication:** Required (user)

**Request Body:**
```typescript
{
  title: string;                    // Story title
  story: string;                    // Story content
  characterImage: string;           // Character image URL
  pages: Array<{                    // Story pages
    pageNumber: number;
    scenes: Array<{
      description: string;
      emotion: string;
      imagePrompt: string;
    }>;
  }>;
  audience: 'children' | 'young_adults' | 'adults';
  isReusedImage?: boolean;          // Optional, default false
}
```

**Response:**
```typescript
{
  jobId: string;                    // Unique job identifier
  status: 'pending';                // Initial status
  estimatedCompletion: string;      // ISO timestamp
  estimatedMinutes: number;         // Estimated duration
  pollingUrl: string;               // Status polling endpoint
  message: string;                  // Human-readable message
}
```

**Example:**
```typescript
const response = await fetch('/api/jobs/storybook/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "My Adventure",
    story: "Once upon a time...",
    characterImage: "https://example.com/character.jpg",
    pages: [
      {
        pageNumber: 1,
        scenes: [
          {
            description: "Hero begins journey",
            emotion: "excited",
            imagePrompt: "A brave character starting an adventure"
          }
        ]
      }
    ],
    audience: "children"
  })
});

const { jobId, pollingUrl } = await response.json();
```

#### Get Storybook Job Status

**Endpoint:** `GET /api/jobs/storybook/status/[jobId]`

**Description:** Retrieves current status and progress of storybook generation

**Authentication:** Not required (public status)

**Response:**
```typescript
{
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;                 // 0-100
  currentStep?: string;             // Current processing step
  createdAt: string;                // ISO timestamp
  updatedAt: string;                // ISO timestamp
  startedAt?: string;               // ISO timestamp
  completedAt?: string;             // ISO timestamp
  estimatedTimeRemaining?: string;  // Human-readable estimate
  result?: {                        // Available when completed
    storybook_id: string;
    pages: Array<any>;
    has_errors: boolean;
    warning?: string;
  };
  error?: string;                   // Error message if failed
  retryCount?: number;              // Number of retries attempted
  maxRetries?: number;              // Maximum retries allowed
}
```

### Auto-Story Generation

#### Start Auto-Story Job

**Endpoint:** `POST /api/jobs/auto-story/start`

**Description:** Creates a background job for AI-generated story creation

**Authentication:** Required (user)

**Request Body:**
```typescript
{
  genre: 'adventure' | 'siblings' | 'bedtime' | 'fantasy' | 'history';
  characterDescription: string;     // Character description
  cartoonImageUrl: string;          // Character image URL
  audience: 'children' | 'young_adults' | 'adults';
}
```

**Response:**
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedCompletion: string;
  estimatedMinutes: number;
  pollingUrl: string;
  message: string;
  phases: string[];                 // Processing phases
}
```

#### Get Auto-Story Job Status

**Endpoint:** `GET /api/jobs/auto-story/status/[jobId]`

**Description:** Retrieves status of auto-story generation

**Response:** Similar to storybook status with additional fields:
```typescript
{
  // ... standard job status fields
  currentPhase?: string;            // Current generation phase
  result?: {
    storybook_id: string;
    generated_story: string;
  };
}
```

### Scene Generation

#### Start Scene Job

**Endpoint:** `POST /api/jobs/scenes/start`

**Description:** Creates a background job for scene generation from story text

**Authentication:** Optional

**Request Body:**
```typescript
{
  story: string;                    // Story text (min 50 characters)
  characterImage?: string;          // Optional character image
  audience: 'children' | 'young_adults' | 'adults';
}
```

**Response:**
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedCompletion: string;
  estimatedMinutes: number;
  pollingUrl: string;
  message: string;
  storyInfo: {
    wordCount: number;
    audience: string;
    estimatedScenes: string;
  };
}
```

#### Get Scene Job Status

**Endpoint:** `GET /api/jobs/scenes/status/[jobId]`

**Response:**
```typescript
{
  // ... standard job status fields
  result?: {
    pages: Array<{
      pageNumber: number;
      scenes: Array<{
        description: string;
        emotion: string;
        imagePrompt: string;
        generatedImage?: string;
      }>;
    }>;
    character_description?: string;
  };
  sceneInfo?: {
    totalPages: number;
    totalScenes: number;
    averageScenesPerPage: number;
  };
}
```

### Image Processing

#### Start Cartoonize Job

**Endpoint:** `POST /api/jobs/cartoonize/start`

**Description:** Creates a background job for image cartoonization

**Authentication:** Optional

**Request Body (JSON):**
```typescript
{
  prompt: string;                   // Image description
  style: 'storybook' | 'semi-realistic' | 'comic-book' | 'flat-illustration' | 'anime';
  imageUrl?: string;                // Optional source image
}
```

**Request Body (FormData):**
```typescript
{
  image: File;                      // Image file
  prompt: string;                   // Image description
  style: string;                    // Art style
}
```

**Response:**
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedCompletion: string;
  estimatedMinutes: number;
  pollingUrl: string;
  message: string;
  processingInfo: {
    style: string;
    promptLength: number;
    hasSourceImage: boolean;
  };
}
```

#### Get Cartoonize Job Status

**Endpoint:** `GET /api/jobs/cartoonize/status/[jobId]`

**Response:**
```typescript
{
  // ... standard job status fields
  result?: {
    url: string;                    // Generated image URL
    cached: boolean;                // Whether result was cached
  };
  processingInfo?: {
    cached: boolean;
    message: string;
  };
}
```

#### Start Image Generation Job

**Endpoint:** `POST /api/jobs/image/start`

**Description:** Creates a background job for single image generation

**Request Body:**
```typescript
{
  image_prompt: string;             // Scene description
  character_description: string;    // Character details
  emotion: string;                  // Character emotion
  audience: 'children' | 'young_adults' | 'adults';
  isReusedImage?: boolean;          // Optional
  cartoon_image?: string;           // Optional character image
  style?: string;                   // Optional art style
}
```

**Response:**
```typescript
{
  jobId: string;
  status: 'pending';
  estimatedCompletion: string;
  estimatedMinutes: number;
  pollingUrl: string;
  message: string;
  imageInfo: {
    style: string;
    audience: string;
    emotion: string;
    isReusedImage: boolean;
    promptLength: number;
  };
}
```

#### Get Image Job Status

**Endpoint:** `GET /api/jobs/image/status/[jobId]`

**Response:**
```typescript
{
  // ... standard job status fields
  result?: {
    url: string;                    // Generated image URL
    prompt_used: string;            // Final prompt used
    reused: boolean;                // Whether image was reused
  };
  generationInfo?: {
    reused: boolean;
    promptUsed: string;
    style: string;
  };
}
```

## Monitoring Endpoints

### System Health Check

**Endpoint:** `GET /api/jobs/health`

**Description:** Comprehensive system health and status information

**Authentication:** Not required

**Response:**
```typescript
{
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  systemStatus: {
    monitor: boolean;
    manager: boolean;
    config: boolean;
    timestamp: string;
  };
  configSummary: {
    environment: string;
    autoProcessing: boolean;
    processingInterval: number;
    maxConcurrentJobs: number;
    jobTimeout: number;
    maxRetries: number;
    features: {
      priorityProcessing: boolean;
      jobCancellation: boolean;
      metricsCollection: boolean;
      healthChecks: boolean;
    };
  };
  metrics: {
    queueDepth: number;
    processingCapacity: number;
    successRate: number;
    averageProcessingTime: number;
    jobsPerHour: number;
    errorRate: number;
  };
  statistics: {
    jobs: {
      totalJobs: number;
      pendingJobs: number;
      processingJobs: number;
      completedJobs: number;
      failedJobs: number;
      averageProcessingTime: number;
      successRate: number;
      queueDepth: number;
      oldestPendingJob?: string;
    };
    byType: {
      [jobType: string]: {
        total: number;
        completed: number;
        failed: number;
        averageTime: number;
        successRate: number;
      };
    };
    performance: {
      jobsPerHour: number;
      jobsPerDay: number;
      peakProcessingTime: number;
      resourceUtilization: number;
      errorFrequency: number;
      retryRate: number;
    };
  };
  health: {
    status: string;
    alerts: string[];
    recommendations: string[];
    stuckJobsCount: number;
  };
  operational: {
    autoProcessingEnabled: boolean;
    metricsCollectionEnabled: boolean;
    processingInterval: number;
    maxConcurrentJobs: number;
  };
}
```

## Admin Endpoints

### Manual Job Processing

**Endpoint:** `POST /api/jobs/process`

**Description:** Manually trigger job processing (admin/development)

**Authentication:** Optional (recommended for production)

**Request Body:**
```typescript
{
  maxJobs?: number;                 // Max jobs to process (default: 10)
  specificJobId?: string;           // Process specific job
  cleanup?: boolean;                // Run cleanup (default: false)
  cleanupDays?: number;             // Cleanup threshold (default: 7)
  forceProcessing?: boolean;        // Override safety checks
  jobTypes?: string[];              // Filter by job types
}
```

**Response:**
```typescript
{
  timestamp: string;
  processed: number;
  errors: number;
  skipped: number;
  configuration: object;
  specificJob?: {
    jobId: string;
    success: boolean;
  };
  filteredTypes?: string[];
  cleanup?: {
    cleaned: number;
    olderThanDays: number;
  } | {
    error: string;
    details: string;
  };
  queueStatus: object;
  statistics: object;
  performance: {
    processingRate: number;
    errorRate: number;
    efficiency: number;
  };
  recommendations: string[];
}
```

### Get Processing Status

**Endpoint:** `GET /api/jobs/process`

**Description:** Get current processing system status

**Response:**
```typescript
{
  timestamp: string;
  healthy: boolean;
  worker: {
    isRunning: boolean;
    processingInterval: number;
    maxRunTime: number;
    processorStats: object;
  };
  queue: object;
  statistics: object;
  configuration: object;
  features: {
    autoProcessing: boolean;
    priorityProcessing: boolean;
    metricsCollection: boolean;
    healthChecks: boolean;
  };
}
```

## Webhook Endpoints

### Cron Job Processing

**Endpoint:** `POST /api/cron/process-jobs`

**Description:** Webhook endpoint for external cron services

**Authentication:** Webhook secret required

**Headers:**
```typescript
{
  "x-webhook-secret": "your-webhook-secret",
  // OR provider-specific headers:
  "x-github-token": "your-github-secret",
  "x-vercel-signature": "your-vercel-secret",
  "Content-Type": "application/json"
}
```

**Request Body:**
```typescript
{
  maxJobs?: number;                 // Max jobs to process
  jobTypes?: string[];              // Filter by job types
  emergencyMode?: boolean;          // Override safety checks
  cleanup?: boolean;                // Run cleanup
  cleanupDays?: number;             // Cleanup threshold
  healthCheck?: boolean;            // Run health check first
}
```

**Response:**
```typescript
{
  timestamp: string;
  provider: string;                 // Detected cron provider
  processed: number;
  errors: number;
  skipped: number;
  emergencyMode: boolean;
  healthCheck?: {
    healthy: boolean;
    message: string;
    details?: any;
  };
  queueStatus: object;
  statistics: object;
  performance: {
    processingTime: number;
    processingRate: number;
    errorRate: number;
    efficiency: number;
  };
  recommendations: string[];
  cleanup?: {
    cleaned: number;
    olderThanDays: number;
  };
}
```

## Error Codes

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User limit exceeded or access denied |
| 404 | Not Found | Job ID not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | System error or external service failure |
| 503 | Service Unavailable | System maintenance or overload |

### Application Error Codes

```typescript
{
  error: string;                    // Error message
  code?: string;                    // Error code
  details?: string;                 // Additional details (development only)
  configurationError?: boolean;     // Configuration issue
  retryAfter?: number;              // Retry delay (seconds)
  recommendations?: string[];       // Suggested actions
}
```

**Common Error Codes:**

- `JOB_NOT_FOUND` - Job ID does not exist
- `JOB_TIMEOUT` - Job exceeded maximum processing time
- `JOB_FAILED` - Job failed during processing
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_INPUT` - Request validation failed
- `CONFIGURATION_ERROR` - Missing environment variables
- `EXTERNAL_SERVICE_ERROR` - OpenAI/Cloudinary API error
- `DATABASE_ERROR` - Database connection or query error

## Rate Limiting

### User Endpoints

- **Rate Limit:** 100 requests per 15 minutes per IP
- **Job Creation:** 5 jobs per hour per user
- **Status Polling:** 1 request per second per job

### Webhook Endpoints

- **Rate Limit:** 10 requests per minute per provider
- **Burst Limit:** 3 requests per 10 seconds

### Headers

Rate limit information is included in response headers:

```typescript
{
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "95",
  "X-RateLimit-Reset": "1640995200",
  "Retry-After": "60"               // Only when rate limited
}
```

## Integration Examples

### React Hook for Job Polling

```typescript
import { useJobPolling } from '@/hooks/use-job-polling';

function useStorybookGeneration() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingUrl, setPollingUrl] = useState<string | null>(null);

  const { data, isPolling, error } = useJobPolling(jobId, pollingUrl, {
    pollingInterval: 2000,
    onComplete: (result) => {
      console.log('Storybook completed:', result);
    },
    onError: (error) => {
      console.error('Job failed:', error);
    }
  });

  const startGeneration = async (storyData: any) => {
    try {
      const response = await fetch('/api/jobs/storybook/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const { jobId, pollingUrl } = await response.json();
      setJobId(jobId);
      setPollingUrl(pollingUrl);
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  return {
    startGeneration,
    jobStatus: data,
    isProcessing: isPolling,
    error
  };
}
```

### Node.js Client Example

```typescript
class StorybookClient {
  constructor(private baseUrl: string, private token: string) {}

  async createStorybook(data: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/jobs/storybook/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const { jobId } = await response.json();
    return jobId;
  }

  async waitForCompletion(jobId: string): Promise<any> {
    while (true) {
      const response = await fetch(`${this.baseUrl}/api/jobs/storybook/status/${jobId}`);
      const status = await response.json();

      if (status.status === 'completed') {
        return status.result;
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Job failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async generateStorybook(data: any): Promise<any> {
    const jobId = await this.createStorybook(data);
    return this.waitForCompletion(jobId);
  }
}

// Usage
const client = new StorybookClient('https://your-domain.com', 'your-token');
const result = await client.generateStorybook({
  title: 'My Story',
  story: 'Once upon a time...',
  // ... other data
});
```

### Webhook Handler Example

```typescript
// Express.js webhook handler
app.post('/webhook/cron', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    const response = await fetch('https://your-domain.com/api/cron/process-jobs', {
      method: 'POST',
      headers: {
        'x-webhook-secret': process.env.WEBHOOK_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxJobs: 5,
        healthCheck: true
      })
    });

    const result = await response.json();
    
    res.json({
      success: true,
      processed: result.processed,
      errors: result.errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Health Check Monitoring

```bash
#!/bin/bash
# health-check.sh - Monitor system health

HEALTH_URL="https://your-domain.com/api/jobs/health"
WEBHOOK_URL="https://your-monitoring-service.com/webhook"

# Check health
RESPONSE=$(curl -s "$HEALTH_URL")
STATUS=$(echo "$RESPONSE" | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  # Send alert
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"alert\": \"System health check failed\",
      \"status\": \"$STATUS\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }"
fi

# Log result
echo "$(date): Health status: $STATUS"
```

For more examples and advanced usage patterns, see the [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md) and [Testing Guide](TESTING_GUIDE.md).