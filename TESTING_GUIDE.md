# Background Jobs Testing Guide

Comprehensive testing procedures for validating the background job system across all environments and scenarios.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Load Testing](#load-testing)
5. [Error Testing](#error-testing)
6. [Monitoring Testing](#monitoring-testing)
7. [Deployment Testing](#deployment-testing)
8. [User Acceptance Testing](#user-acceptance-testing)
9. [Security Testing](#security-testing)
10. [Performance Testing](#performance-testing)

## Testing Overview

### Testing Strategy

The background job system requires comprehensive testing across multiple dimensions:

- **Functional Testing**: Verify all job types work correctly
- **Performance Testing**: Ensure system handles expected load
- **Reliability Testing**: Validate error handling and recovery
- **Security Testing**: Confirm authentication and authorization
- **Integration Testing**: Test with external services
- **User Experience Testing**: Validate frontend interactions

### Test Environments

1. **Development**: Local testing with mock services
2. **Staging**: Full integration testing with real services
3. **Production**: Monitoring and health checks only

### Testing Tools

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev playwright @playwright/test
npm install --save-dev artillery loadtest
```

## Unit Testing

### Job Manager Tests

```typescript
// tests/lib/background-jobs/job-manager.test.ts
import { jobManager } from '@/lib/background-jobs/job-manager';

describe('JobManager', () => {
  beforeEach(() => {
    // Reset job manager state
    jest.clearAllMocks();
  });

  describe('createStorybookJob', () => {
    it('should create a storybook job with valid input', async () => {
      const inputData = {
        title: 'Test Story',
        story: 'Once upon a time...',
        characterImage: 'https://example.com/image.jpg',
        pages: [],
        audience: 'children' as const,
        isReusedImage: false
      };

      const jobId = await jobManager.createStorybookJob(inputData, 'user-123');
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
    });

    it('should handle missing user ID gracefully', async () => {
      const inputData = {
        title: 'Test Story',
        story: 'Once upon a time...',
        characterImage: 'https://example.com/image.jpg',
        pages: [],
        audience: 'children' as const
      };

      const jobId = await jobManager.createStorybookJob(inputData);
      expect(jobId).toBeDefined();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const jobId = await jobManager.createStorybookJob({
        title: 'Test',
        story: 'Test story',
        characterImage: 'https://example.com/image.jpg',
        pages: [],
        audience: 'children'
      });

      const status = await jobManager.getJobStatus(jobId);
      
      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
      expect(status?.status).toBe('pending');
      expect(status?.progress).toBe(0);
    });

    it('should return null for non-existent job', async () => {
      const status = await jobManager.getJobStatus('non-existent-job');
      expect(status).toBeNull();
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress correctly', async () => {
      const jobId = await jobManager.createStorybookJob({
        title: 'Test',
        story: 'Test story',
        characterImage: 'https://example.com/image.jpg',
        pages: [],
        audience: 'children'
      });

      const success = await jobManager.updateJobProgress(jobId, 50, 'Processing scenes');
      expect(success).toBe(true);

      const status = await jobManager.getJobStatus(jobId);
      expect(status?.progress).toBe(50);
      expect(status?.current_step).toBe('Processing scenes');
      expect(status?.status).toBe('processing');
    });

    it('should clamp progress values', async () => {
      const jobId = await jobManager.createStorybookJob({
        title: 'Test',
        story: 'Test story',
        characterImage: 'https://example.com/image.jpg',
        pages: [],
        audience: 'children'
      });

      await jobManager.updateJobProgress(jobId, 150); // Over 100
      let status = await jobManager.getJobStatus(jobId);
      expect(status?.progress).toBe(100);

      await jobManager.updateJobProgress(jobId, -10); // Under 0
      status = await jobManager.getJobStatus(jobId);
      expect(status?.progress).toBe(0);
    });
  });
});
```

### Job Processor Tests

```typescript
// tests/lib/background-jobs/job-processor.test.ts
import { jobProcessor } from '@/lib/background-jobs/job-processor';

describe('JobProcessor', () => {
  describe('processNextJobStep', () => {
    it('should process pending jobs', async () => {
      // Mock job manager to return a pending job
      jest.spyOn(jobManager, 'getPendingJobs').mockResolvedValue([
        {
          id: 'test-job-1',
          type: 'storybook',
          status: 'pending',
          progress: 0,
          input_data: {
            title: 'Test',
            story: 'Test story',
            characterImage: 'https://example.com/image.jpg',
            pages: [],
            audience: 'children'
          }
        }
      ]);

      const processed = await jobProcessor.processNextJobStep();
      expect(processed).toBe(true);
    });

    it('should respect concurrency limits', async () => {
      // Test that processor doesn't exceed max concurrent jobs
      const stats = jobProcessor.getProcessingStats();
      expect(stats.currentlyProcessing).toBeLessThanOrEqual(stats.maxConcurrentJobs);
    });
  });

  describe('health check', () => {
    it('should report healthy status when operational', () => {
      const isHealthy = jobProcessor.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });
});
```

### Configuration Tests

```typescript
// tests/lib/background-jobs/config.test.ts
import { jobConfig } from '@/lib/background-jobs/config';

describe('JobConfig', () => {
  describe('configuration validation', () => {
    it('should validate configuration correctly', () => {
      const errors = jobConfig.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should detect invalid configuration', () => {
      // Temporarily set invalid config
      jobConfig.updateConfig({ maxConcurrentJobs: 0 });
      
      const errors = jobConfig.validateConfig();
      expect(errors).toContain('maxConcurrentJobs must be at least 1');
      
      // Reset to valid config
      jobConfig.updateConfig({ maxConcurrentJobs: 3 });
    });
  });

  describe('feature flags', () => {
    it('should check feature flags correctly', () => {
      expect(jobConfig.isFeatureEnabled('enableAutoProcessing')).toBe(true);
      expect(jobConfig.isFeatureEnabled('enableHealthChecks')).toBe(true);
    });
  });

  describe('job type configuration', () => {
    it('should return correct timeout for job types', () => {
      const storybookTimeout = jobConfig.getJobTimeout('storybook');
      const cartoonizeTimeout = jobConfig.getJobTimeout('cartoonize');
      
      expect(storybookTimeout).toBeGreaterThan(cartoonizeTimeout);
    });

    it('should return estimated duration for job types', () => {
      const duration = jobConfig.getEstimatedDuration('storybook');
      expect(duration).toBeGreaterThan(0);
    });
  });
});
```

### Run Unit Tests

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- job-manager.test.ts

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test -- --watch
```

## Integration Testing

### End-to-End Job Processing

```typescript
// tests/integration/job-processing.test.ts
import { test, expect } from '@playwright/test';

test.describe('Job Processing Integration', () => {
  test('complete storybook generation workflow', async ({ page }) => {
    // Navigate to create page
    await page.goto('/create');

    // Fill in story form
    await page.fill('[data-testid="story-title"]', 'Test Adventure');
    await page.fill('[data-testid="story-content"]', 'Once upon a time, there was a brave hero who embarked on an amazing adventure through magical lands.');

    // Upload character image
    const fileInput = page.locator('[data-testid="character-image-upload"]');
    await fileInput.setInputFiles('tests/fixtures/test-character.jpg');

    // Select audience
    await page.click('[data-testid="audience-children"]');

    // Submit form
    await page.click('[data-testid="create-storybook-button"]');

    // Wait for job to start
    await expect(page.locator('[data-testid="job-progress"]')).toBeVisible();

    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="storybook-completed"]')).toBeVisible({
      timeout: 300000 // 5 minutes
    });

    // Verify storybook was created
    await expect(page.locator('[data-testid="storybook-title"]')).toContainText('Test Adventure');
  });

  test('auto-story generation workflow', async ({ page }) => {
    await page.goto('/create');

    // Switch to auto-story mode
    await page.click('[data-testid="auto-story-mode"]');

    // Upload character image
    const fileInput = page.locator('[data-testid="character-image-upload"]');
    await fileInput.setInputFiles('tests/fixtures/test-character.jpg');

    // Select genre
    await page.click('[data-testid="genre-adventure"]');

    // Select audience
    await page.click('[data-testid="audience-children"]');

    // Submit
    await page.click('[data-testid="generate-auto-story"]');

    // Wait for completion
    await expect(page.locator('[data-testid="auto-story-completed"]')).toBeVisible({
      timeout: 400000 // 6-7 minutes for auto-story
    });

    // Verify story was generated
    await expect(page.locator('[data-testid="storybook-content"]')).not.toBeEmpty();
  });
});
```

### API Integration Tests

```typescript
// tests/integration/api-integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  let token: string;
  let jobId: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    token = loginData.token;
  });

  test('should create and process a storybook job', async ({ request }) => {
    // Create job
    const createResponse = await request.post('/api/jobs/storybook/start', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        title: 'API Test Story',
        story: 'This is a test story created via API integration test.',
        characterImage: 'https://example.com/test.jpg',
        pages: [
          {
            pageNumber: 1,
            scenes: [
              {
                description: 'Test scene',
                emotion: 'happy',
                imagePrompt: 'A happy character in a sunny field'
              }
            ]
          }
        ],
        audience: 'children'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    expect(createData.jobId).toBeDefined();
    jobId = createData.jobId;

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes (10 second intervals)
    
    while (!completed && attempts < maxAttempts) {
      const statusResponse = await request.get(`/api/jobs/storybook/status/${jobId}`);
      expect(statusResponse.ok()).toBeTruthy();
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        completed = true;
        expect(statusData.result).toBeDefined();
        expect(statusData.result.storybook_id).toBeDefined();
      } else if (statusData.status === 'failed') {
        throw new Error(`Job failed: ${statusData.error}`);
      }
      
      if (!completed) {
        await new Promise(r => setTimeout(r, 10000)); // Wait 10 seconds
        attempts++;
      }
    }
    
    expect(completed).toBe(true);
  });

  test('health check endpoint returns valid data', async ({ request }) => {
    const response = await request.get('/api/jobs/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(data.systemStatus).toBeDefined();
  });
});
```

### Run Integration Tests

```bash
# Run all integration tests
npx playwright test

# Run specific test file
npx playwright test job-processing.test.ts

# Run with UI mode
npx playwright test --ui

# Run with debug mode
npx playwright test --debug
```

## Load Testing

### Job Creation Load Test

```javascript
// tests/load/job-creation.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests can fail
  },
};

export default function () {
  const url = 'https://your-domain.com/api/jobs/cartoonize/start';
  
  const payload = JSON.stringify({
    prompt: 'A happy cartoon character',
    style: 'storybook'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(url, payload, params);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has jobId': (r) => JSON.parse(r.body).jobId !== undefined,
  });
  
  sleep(1);
}
```

### Queue Processing Load Test

```javascript
// tests/load/queue-processing.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  scenarios: {
    job_creation: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { duration: '1m', target: 5 },  // 5 jobs per second
        { duration: '3m', target: 5 },  // Maintain 5 jobs per second
        { duration: '1m', target: 0 },  // Ramp down
      ],
    },
    job_processing: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '10s',
      duration: '5m',
      preAllocatedVUs: 1,
      maxVUs: 2,
      exec: 'triggerProcessing',
    },
  },
};

export default function () {
  // Create a simple job
  const url = 'https://your-domain.com/api/jobs/cartoonize/start';
  
  const payload = JSON.stringify({
    prompt: `Load test job ${Date.now()}`,
    style: 'storybook'
  });
  
  const response = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'job created': (r) => r.status === 200,
  });
  
  sleep(1);
}

export function triggerProcessing() {
  // Trigger job processing
  const url = 'https://your-domain.com/api/jobs/process';
  
  const payload = JSON.stringify({
    maxJobs: 10,
    forceProcessing: true
  });
  
  const response = http.post(url, payload, {
    headers: { 
      'Content-Type': 'application/json',
      'x-webhook-secret': 'test-secret'
    },
  });
  
  check(response, {
    'processing triggered': (r) => r.status === 200,
    'jobs processed': (r) => JSON.parse(r.body).processed > 0,
  });
  
  sleep(10);
}
```

### Run Load Tests

```bash
# Install k6
npm install -g k6

# Run job creation load test
k6 run tests/load/job-creation.js

# Run queue processing load test
k6 run tests/load/queue-processing.js

# Run with output
k6 run --out json=results.json tests/load/job-creation.js
```

## Error Testing

### Error Injection Tests

```typescript
// tests/error/error-injection.test.ts
import { test, expect } from '@playwright/test';

test.describe('Error Handling Tests', () => {
  test('should handle OpenAI API errors gracefully', async ({ page }) => {
    // Set up API mocking
    await page.route('**/api/jobs/auto-story/start', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'OpenAI API Error',
          code: 'EXTERNAL_SERVICE_ERROR',
          details: 'Rate limit exceeded'
        })
      });
    });

    // Navigate to create page
    await page.goto('/create');

    // Set up auto-story
    await page.click('[data-testid="auto-story-mode"]');
    await page.click('[data-testid="genre-adventure"]');

    // Submit form
    await page.click('[data-testid="create-storybook-button"]');

    // Verify error is displayed properly
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('OpenAI API Error');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle job timeout gracefully', async ({ page }) => {
    // Mock a job that times out
    await page.route('**/api/jobs/storybook/status/**', async (route, request) => {
      // First return processing
      if (!request.url().includes('count=')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            jobId: 'test-job',
            status: 'processing',
            progress: 50,
            currentStep: 'Processing scenes',
            estimatedTimeRemaining: '2 minutes'
          })
        });
      } else {
        // Then return timeout error
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            jobId: 'test-job',
            status: 'failed',
            error: 'Job exceeded maximum processing time',
            code: 'JOB_TIMEOUT'
          })
        });
      }
    });

    // Navigate and start job
    await page.goto('/create');
    await page.fill('[data-testid="story-title"]', 'Timeout Test');
    await page.click('[data-testid="create-storybook-button"]');

    // Verify timeout handling
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="restart-button"]')).toBeVisible();
  });

  test('should handle database errors gracefully', async ({ page }) => {
    // Mock database error
    await page.route('**/api/jobs/storybook/start', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Database error',
          code: 'DATABASE_ERROR',
          details: 'Failed to insert job record'
        })
      });
    });

    // Navigate and attempt to create job
    await page.goto('/create');
    await page.fill('[data-testid="story-title"]', 'Database Error Test');
    await page.click('[data-testid="create-storybook-button"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Database error');
  });
});
```

### Recovery Testing

```typescript
// tests/error/recovery.test.ts
import { test, expect } from '@playwright/test';

test.describe('System Recovery Tests', () => {
  test('should recover from failed job with retry', async ({ page, request }) => {
    // Create a job that will fail
    const createResponse = await request.post('/api/jobs/storybook/start', {
      data: {
        title: 'Recovery Test',
        story: 'Test story for recovery testing',
        characterImage: 'https://example.com/invalid-image.jpg', // Invalid image
        pages: [],
        audience: 'children'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const { jobId } = await createResponse.json();
    
    // Wait for job to fail
    let failed = false;
    let attempts = 0;
    
    while (!failed && attempts < 10) {
      const statusResponse = await request.get(`/api/jobs/storybook/status/${jobId}`);
      const status = await statusResponse.json();
      
      if (status.status === 'failed') {
        failed = true;
      } else {
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
      }
    }
    
    expect(failed).toBe(true);
    
    // Navigate to job dashboard
    await page.goto('/jobs');
    
    // Find and click retry button
    await page.click(`[data-testid="retry-job-${jobId}"]`);
    
    // Verify job is retried
    await expect(page.locator(`[data-testid="job-status-${jobId}"]`)).toContainText('processing');
  });

  test('should handle system restart gracefully', async ({ page, request }) => {
    // Create a job
    const createResponse = await request.post('/api/jobs/cartoonize/start', {
      data: {
        prompt: 'Test character',
        style: 'storybook'
      }
    });
    
    const { jobId } = await createResponse.json();
    
    // Simulate system restart by calling process endpoint
    const processResponse = await request.post('/api/jobs/process', {
      data: {
        specificJobId: jobId,
        forceProcessing: true
      }
    });
    
    expect(processResponse.ok()).toBeTruthy();
    
    // Verify job continues processing
    const statusResponse = await request.get(`/api/jobs/cartoonize/status/${jobId}`);
    const status = await statusResponse.json();
    
    expect(status.status).not.toBe('failed');
  });
});
```

## Monitoring Testing

### Health Check Testing

```typescript
// tests/monitoring/health-check.test.ts
import { test, expect } from '@playwright/test';

test.describe('Health Check Monitoring', () => {
  test('health endpoint returns correct status', async ({ request }) => {
    const response = await request.get('/api/jobs/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(['healthy', 'warning', 'critical']).toContain(data.status);
    expect(data.metrics).toBeDefined();
    expect(data.systemStatus).toBeDefined();
  });

  test('health check includes all required metrics', async ({ request }) => {
    const response = await request.get('/api/jobs/health');
    const data = await response.json();
    
    // Verify core metrics
    expect(data.metrics.queueDepth).toBeDefined();
    expect(data.metrics.processingCapacity).toBeDefined();
    expect(data.metrics.successRate).toBeDefined();
    expect(data.metrics.averageProcessingTime).toBeDefined();
    
    // Verify system status
    expect(data.systemStatus.monitor).toBeDefined();
    expect(data.systemStatus.manager).toBeDefined();
    expect(data.systemStatus.config).toBeDefined();
    
    // Verify operational info
    expect(data.operational.autoProcessingEnabled).toBeDefined();
    expect(data.operational.processingInterval).toBeDefined();
  });

  test('health check handles system issues correctly', async ({ request, page }) => {
    // Mock unhealthy system
    await page.route('**/api/jobs/health', async (route) => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({
          status: 'critical',
          message: 'System experiencing critical issues',
          systemStatus: {
            monitor: false,
            manager: true,
            config: true
          },
          recommendations: [
            'Check database connectivity',
            'Verify environment variables'
          ]
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/jobs');
    
    // Verify alert is shown
    await expect(page.locator('[data-testid="system-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-alert"]')).toContainText('critical');
  });
});
```

### Alert Testing

```typescript
// tests/monitoring/alerts.test.ts
import { test, expect } from '@playwright/test';

test.describe('Monitoring Alerts', () => {
  test('high queue depth triggers alert', async ({ page }) => {
    // Mock high queue depth
    await page.route('**/api/jobs/health', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'warning',
          message: 'System operational with minor issues',
          metrics: {
            queueDepth: 25,
            processingCapacity: 3
          },
          health: {
            alerts: ['Queue depth is elevated'],
            recommendations: ['Monitor queue closely and consider scaling']
          }
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/jobs');
    
    // Verify alert is shown
    await expect(page.locator('[data-testid="queue-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-alert"]')).toContainText('Queue depth is elevated');
  });

  test('high error rate triggers alert', async ({ page }) => {
    // Mock high error rate
    await page.route('**/api/jobs/health', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'warning',
          message: 'System operational with minor issues',
          metrics: {
            errorRate: 15,
            successRate: 85
          },
          health: {
            alerts: ['Job success rate could be improved'],
            recommendations: ['Review failed jobs for common patterns']
          }
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/jobs');
    
    // Verify alert is shown
    await expect(page.locator('[data-testid="error-rate-alert"]')).toBeVisible();
  });
});
```

## Deployment Testing

### Pre-Deployment Verification

```bash
#!/bin/bash
# pre-deployment-check.sh

# Check environment variables
echo "Checking environment variables..."
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "OPENAI_API_KEY" "CLOUDINARY_CLOUD_NAME")
missing_vars=0

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    missing_vars=$((missing_vars+1))
  else
    echo "✅ Found environment variable: $var"
  fi
done

if [ $missing_vars -gt 0 ]; then
  echo "❌ $missing_vars required environment variables are missing!"
  exit 1
fi

# Check database connection
echo "Checking database connection..."
npx supabase db ping
if [ $? -ne 0 ]; then
  echo "❌ Database connection failed!"
  exit 1
fi
echo "✅ Database connection successful"

# Check external services
echo "Checking OpenAI API..."
curl -s -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
if [ $? -ne 0 ]; then
  echo "❌ OpenAI API connection failed!"
  exit 1
fi
echo "✅ OpenAI API connection successful"

echo "Checking Cloudinary API..."
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/ping" \
  -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET"
if [ $? -ne 0 ]; then
  echo "❌ Cloudinary API connection failed!"
  exit 1
fi
echo "✅ Cloudinary API connection successful"

echo "All pre-deployment checks passed! ✅"
exit 0
```

### Post-Deployment Verification

```typescript
// tests/deployment/post-deploy.test.ts
import { test, expect } from '@playwright/test';

test.describe('Post-Deployment Verification', () => {
  test('health check returns healthy status', async ({ request }) => {
    const response = await request.get('/api/jobs/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('job creation works', async ({ request }) => {
    const response = await request.post('/api/jobs/cartoonize/start', {
      data: {
        prompt: 'Deployment test character',
        style: 'storybook'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.jobId).toBeDefined();
  });

  test('job processing works', async ({ request }) => {
    // Create a job
    const createResponse = await request.post('/api/jobs/cartoonize/start', {
      data: {
        prompt: 'Deployment test character',
        style: 'storybook'
      }
    });
    
    const { jobId } = await createResponse.json();
    
    // Trigger processing
    const processResponse = await request.post('/api/jobs/process', {
      data: {
        specificJobId: jobId,
        forceProcessing: true
      }
    });
    
    expect(processResponse.ok()).toBeTruthy();
    
    // Check job status
    const statusResponse = await request.get(`/api/jobs/cartoonize/status/${jobId}`);
    const status = await statusResponse.json();
    
    // Should be either processing or completed
    expect(['processing', 'completed']).toContain(status.status);
  });

  test('cron webhook endpoint works', async ({ request }) => {
    const response = await request.post('/api/cron/process-jobs', {
      headers: {
        'x-webhook-secret': process.env.WEBHOOK_SECRET || 'test-secret'
      },
      data: {
        maxJobs: 1,
        healthCheck: true
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.healthCheck).toBeDefined();
  });

  test('frontend components load correctly', async ({ page }) => {
    await page.goto('/jobs');
    
    // Check dashboard loads
    await expect(page.locator('[data-testid="job-dashboard"]')).toBeVisible();
    
    // Check progress tracker component works
    await page.goto('/create');
    await expect(page.locator('[data-testid="multi-step-form"]')).toBeVisible();
  });
});
```

## User Acceptance Testing

### User Workflow Testing

```typescript
// tests/uat/user-workflows.test.ts
import { test, expect } from '@playwright/test';

test.describe('User Acceptance Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await page.waitForURL('/');
  });

  test('user can create a storybook', async ({ page }) => {
    // Navigate to create page
    await page.goto('/create');
    
    // Fill in story details
    await page.fill('[data-testid="story-title"]', 'UAT Test Story');
    await page.click('[data-testid="next-button"]');
    
    // Upload character image
    const fileInput = page.locator('[data-testid="character-image-upload"]');
    await fileInput.setInputFiles('tests/fixtures/test-character.jpg');
    await page.click('[data-testid="next-button"]');
    
    // Select style
    await page.click('[data-testid="style-storybook"]');
    await page.click('[data-testid="next-button"]');
    
    // Wait for cartoonization
    await expect(page.locator('[data-testid="cartoonized-image"]')).toBeVisible({
      timeout: 60000 // 1 minute
    });
    await page.click('[data-testid="next-button"]');
    
    // Select audience
    await page.click('[data-testid="audience-children"]');
    await page.click('[data-testid="next-button"]');
    
    // Enter story
    await page.fill('[data-testid="story-content"]', 'Once upon a time, there was a brave hero who embarked on an amazing adventure through magical lands.');
    await page.click('[data-testid="next-button"]');
    
    // Confirm and create
    await page.click('[data-testid="create-storybook-button"]');
    
    // Wait for job to start
    await expect(page.locator('[data-testid="job-progress"]')).toBeVisible();
    
    // Verify progress updates
    await expect(page.locator('[data-testid="current-step"]')).toBeVisible();
    
    // Wait for completion (with extended timeout)
    await expect(page.locator('[data-testid="storybook-completed"]')).toBeVisible({
      timeout: 300000 // 5 minutes
    });
    
    // Verify storybook was created
    await expect(page.url()).toContain('/storybook/');
  });

  test('user can view job history', async ({ page }) => {
    // Navigate to jobs page
    await page.goto('/jobs');
    
    // Verify job history is displayed
    await expect(page.locator('[data-testid="job-dashboard"]')).toBeVisible();
    
    // Check for job entries
    const jobCount = await page.locator('[data-testid="job-card"]').count();
    expect(jobCount).toBeGreaterThan(0);
    
    // Test filtering
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    await page.waitForTimeout(500); // Wait for filter to apply
    
    const completedJobs = await page.locator('[data-testid="job-status-completed"]').count();
    expect(completedJobs).toBeGreaterThan(0);
  });

  test('user can cancel a running job', async ({ page, request }) => {
    // Create a job that will take time
    const createResponse = await request.post('/api/jobs/auto-story/start', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
      },
      data: {
        genre: 'adventure',
        characterDescription: 'A brave explorer',
        cartoonImageUrl: 'https://example.com/test.jpg',
        audience: 'children'
      }
    });
    
    const { jobId } = await createResponse.json();
    
    // Navigate to jobs page
    await page.goto('/jobs');
    
    // Find and click cancel button
    await page.click(`[data-testid="cancel-job-${jobId}"]`);
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"]');
    
    // Verify job is cancelled
    await expect(page.locator(`[data-testid="job-status-${jobId}"]`)).toContainText('cancelled');
  });
});
```

### Accessibility Testing

```typescript
// tests/uat/accessibility.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Testing', () => {
  test('create page meets accessibility standards', async ({ page }) => {
    await page.goto('/create');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('job dashboard meets accessibility standards', async ({ page }) => {
    await page.goto('/jobs');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('progress tracker meets accessibility standards', async ({ page }) => {
    // Create a job first
    // ...
    
    // Navigate to job status page
    await page.goto(`/jobs/status/${jobId}`);
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## Security Testing

### Authentication Testing

```typescript
// tests/security/authentication.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('protected endpoints require authentication', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.get('/api/jobs/user');
    expect(response.status()).toBe(401);
  });

  test('job status endpoints are accessible without auth', async ({ request }) => {
    // Create a job with auth
    const createResponse = await request.post('/api/jobs/cartoonize/start', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
      },
      data: {
        prompt: 'Security test character',
        style: 'storybook'
      }
    });
    
    const { jobId } = await createResponse.json();
    
    // Access status without auth
    const statusResponse = await request.get(`/api/jobs/cartoonize/status/${jobId}`);
    expect(statusResponse.ok()).toBeTruthy();
  });

  test('admin endpoints require admin authentication', async ({ request }) => {
    // Try to access admin endpoint with regular user auth
    const response = await request.post('/api/admin/jobs/process', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
      }
    });
    
    expect(response.status()).toBe(403);
  });
});
```

### Webhook Security Testing

```typescript
// tests/security/webhook.test.ts
import { test, expect } from '@playwright/test';

test.describe('Webhook Security', () => {
  test('cron webhook requires valid secret', async ({ request }) => {
    // Try without secret
    const noSecretResponse = await request.post('/api/cron/process-jobs');
    expect(noSecretResponse.status()).toBe(401);
    
    // Try with invalid secret
    const invalidSecretResponse = await request.post('/api/cron/process-jobs', {
      headers: {
        'x-webhook-secret': 'invalid-secret'
      }
    });
    expect(invalidSecretResponse.status()).toBe(401);
    
    // Try with valid secret
    const validSecretResponse = await request.post('/api/cron/process-jobs', {
      headers: {
        'x-webhook-secret': process.env.WEBHOOK_SECRET || 'test-secret'
      }
    });
    expect(validSecretResponse.ok()).toBeTruthy();
  });

  test('rate limiting is enforced on webhooks', async ({ request }) => {
    // Make multiple requests in quick succession
    const responses = [];
    
    for (let i = 0; i < 12; i++) {
      const response = await request.post('/api/cron/process-jobs', {
        headers: {
          'x-webhook-secret': process.env.WEBHOOK_SECRET || 'test-secret'
        }
      });
      
      responses.push(response);
    }
    
    // At least one should be rate limited
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBe(true);
  });
});
```

## Performance Testing

### Response Time Testing

```typescript
// tests/performance/response-time.test.ts
import { test, expect } from '@playwright/test';

test.describe('API Response Time', () => {
  test('job creation endpoints respond quickly', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post('/api/jobs/cartoonize/start', {
      data: {
        prompt: 'Performance test character',
        style: 'storybook'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(1000); // Under 1 second
  });

  test('job status endpoints respond quickly', async ({ request }) => {
    // Create a job first
    const createResponse = await request.post('/api/jobs/cartoonize/start', {
      data: {
        prompt: 'Performance test character',
        style: 'storybook'
      }
    });
    
    const { jobId } = await createResponse.json();
    
    // Measure status endpoint response time
    const startTime = Date.now();
    const statusResponse = await request.get(`/api/jobs/cartoonize/status/${jobId}`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(statusResponse.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(500); // Under 500ms
  });

  test('health check endpoint responds quickly', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/jobs/health');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(1000); // Under 1 second
  });
});
```

### Memory Usage Testing

```typescript
// tests/performance/memory-usage.test.ts
import { test, expect } from '@playwright/test';

test.describe('Memory Usage', () => {
  test('processing multiple jobs does not cause memory issues', async ({ request }) => {
    // Create multiple jobs
    const jobIds = [];
    
    for (let i = 0; i < 5; i++) {
      const response = await request.post('/api/jobs/cartoonize/start', {
        data: {
          prompt: `Memory test character ${i}`,
          style: 'storybook'
        }
      });
      
      const { jobId } = await response.json();
      jobIds.push(jobId);
    }
    
    // Process jobs
    const processResponse = await request.post('/api/jobs/process', {
      headers: {
        'x-webhook-secret': process.env.WEBHOOK_SECRET || 'test-secret'
      },
      data: {
        maxJobs: 5,
        forceProcessing: true
      }
    });
    
    expect(processResponse.ok()).toBeTruthy();
    
    // Check memory metrics
    const healthResponse = await request.get('/api/jobs/health');
    const healthData = await healthResponse.json();
    
    // Memory usage should be reported
    expect(healthData.metrics.resourceUtilization).toBeDefined();
    
    // Memory usage should be reasonable
    expect(healthData.metrics.resourceUtilization).toBeLessThan(90); // Under 90%
  });
});
```

## Automated Test Suite

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'lib/background-jobs/**/*.ts',
    'app/api/jobs/**/*.ts',
    'app/api/cron/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' },
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'WebKit',
      use: { browserName: 'webkit' },
    },
    {
      name: 'API Tests',
      use: { baseURL: process.env.TEST_API_URL || 'http://localhost:3000' },
      testMatch: /.*api\.test\.ts/,
    },
  ],
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
};

export default config;
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Background Job System

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start test server
        run: npm run dev & npx wait-on http://localhost:3000
      - name: Run integration tests
        run: npm run test:integration
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Build application
        run: npm run build
      - name: Start production server
        run: npm run start & npx wait-on http://localhost:3000
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: e2e-report
          path: playwright-report/
```

## Test Automation Scripts

### Run All Tests

```bash
#!/bin/bash
# run-all-tests.sh

echo "Running all tests..."

# Unit tests
echo "Running unit tests..."
npm run test:unit
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed!"
  exit 1
fi
echo "✅ Unit tests passed!"

# Integration tests
echo "Running integration tests..."
npm run test:integration
if [ $? -ne 0 ]; then
  echo "❌ Integration tests failed!"
  exit 1
fi
echo "✅ Integration tests passed!"

# E2E tests
echo "Running E2E tests..."
npm run test:e2e
if [ $? -ne 0 ]; then
  echo "❌ E2E tests failed!"
  exit 1
fi
echo "✅ E2E tests passed!"

# Performance tests
echo "Running performance tests..."
npm run test:performance
if [ $? -ne 0 ]; then
  echo "⚠️ Performance tests have issues, but continuing..."
fi

echo "✅ All tests completed successfully!"
exit 0
```

### Pre-Deployment Test

```bash
#!/bin/bash
# pre-deployment-test.sh

echo "Running pre-deployment tests..."

# Environment check
echo "Checking environment variables..."
source .env.test
./scripts/check-env.sh
if [ $? -ne 0 ]; then
  echo "❌ Environment check failed!"
  exit 1
fi

# Critical path tests
echo "Running critical path tests..."
npm run test:critical
if [ $? -ne 0 ]; then
  echo "❌ Critical path tests failed!"
  exit 1
fi

# Security tests
echo "Running security tests..."
npm run test:security
if [ $? -ne 0 ]; then
  echo "❌ Security tests failed!"
  exit 1
fi

echo "✅ Pre-deployment tests passed!"
exit 0
```

## Conclusion

This testing guide provides a comprehensive approach to validating the background job system. By following these procedures, you can ensure:

1. **Reliability**: The system handles errors gracefully and recovers from failures
2. **Performance**: Jobs are processed efficiently and within expected timeframes
3. **Security**: Authentication and authorization are properly enforced
4. **Scalability**: The system can handle expected load and growth
5. **User Experience**: Frontend components provide a smooth and intuitive experience

For additional information, refer to:
- [API Documentation](API_DOCUMENTATION.md)
- [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md)
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md)
- [Monitoring Setup](MONITORING_SETUP.md)