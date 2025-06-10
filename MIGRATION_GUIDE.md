# Background Jobs Migration Guide

This guide provides detailed procedures for migrating from direct API processing to the background job system with zero downtime, feature flags, and rollback procedures.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Zero-Downtime Migration](#zero-downtime-migration)
3. [Feature Flag Usage](#feature-flag-usage)
4. [Rollback Procedures](#rollback-procedures)
5. [Data Migration](#data-migration)
6. [Backward Compatibility](#backward-compatibility)
7. [Gradual Replacement](#gradual-replacement)
8. [Testing During Migration](#testing-during-migration)
9. [Post-Migration Verification](#post-migration-verification)

## Migration Overview

### Current vs. New Architecture

**Current Architecture:**
- Direct API calls for processing
- Timeout-prone operations
- No progress tracking
- Limited error handling
- No automatic retries

**New Architecture:**
- Background job processing
- Real-time progress tracking
- Comprehensive error handling
- Automatic retries
- Monitoring and alerting

### Migration Benefits

1. **Improved Reliability**: Eliminate timeout errors
2. **Better User Experience**: Real-time progress updates
3. **Enhanced Monitoring**: Comprehensive system visibility
4. **Automatic Recovery**: Self-healing from failures
5. **Scalability**: Handle more concurrent users

### Migration Risks

1. **Data Consistency**: Ensuring no jobs are lost during transition
2. **User Experience**: Maintaining seamless experience during migration
3. **Performance Impact**: Temporary processing delays during transition
4. **Integration Issues**: Ensuring all systems work with new architecture

## Zero-Downtime Migration

### Phase 1: Parallel Systems

Run both old and new systems simultaneously:

```typescript
// app/api/story/create-storybook/route.ts
import { NextResponse } from 'next/server';
import { jobManager } from '@/lib/background-jobs/job-manager';

export async function POST(request: Request) {
  try {
    const useBackgroundJobs = process.env.USE_BACKGROUND_JOBS === 'true';
    const requestData = await request.json();
    
    if (useBackgroundJobs) {
      // New: Background job approach
      const jobId = await jobManager.createStorybookJob(requestData, user_id);
      
      if (!jobId) {
        throw new Error('Failed to create background job');
      }
      
      // Calculate estimated completion time
      const estimatedMinutes = Math.max(2, requestData.pages.length * 0.5);
      const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);
      
      // Return job information
      return NextResponse.json({
        jobId,
        status: 'pending',
        estimatedCompletion: estimatedCompletion.toISOString(),
        estimatedMinutes,
        pollingUrl: `/api/jobs/storybook/status/${jobId}`,
        message: 'Storybook generation started. Use the polling URL to track progress.'
      });
    } else {
      // Old: Direct processing approach
      // Original implementation...
    }
  } catch (error) {
    // Error handling...
  }
}
```

### Phase 2: Gradual Traffic Shifting

Implement traffic percentage routing:

```typescript
// lib/migration/traffic-router.ts
export function shouldUseBackgroundJobs(userId?: string): boolean {
  // Environment override
  if (process.env.USE_BACKGROUND_JOBS === 'true') {
    return true;
  }
  
  if (process.env.USE_BACKGROUND_JOBS === 'false') {
    return false;
  }
  
  // Get migration percentage (default 0%)
  const migrationPercentage = parseInt(process.env.BACKGROUND_JOBS_PERCENTAGE || '0');
  
  // If user ID provided, use consistent routing
  if (userId) {
    // Hash user ID to get consistent routing
    const hash = userId.split('').reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) % 100;
    }, 0);
    
    // Route based on hash
    return hash < migrationPercentage;
  }
  
  // Random routing for anonymous users
  return Math.random() * 100 < migrationPercentage;
}
```

### Phase 3: Monitoring and Adjustment

```typescript
// lib/migration/migration-monitor.ts
interface MigrationMetrics {
  timestamp: string;
  oldSystemRequests: number;
  newSystemRequests: number;
  oldSystemErrors: number;
  newSystemErrors: number;
  oldSystemLatency: number;
  newSystemLatency: number;
}

class MigrationMonitor {
  private metrics: MigrationMetrics[] = [];
  
  recordOldSystemRequest(latencyMs: number, error: boolean) {
    this.updateMetrics('oldSystemRequests', 1);
    this.updateMetrics('oldSystemLatency', latencyMs);
    
    if (error) {
      this.updateMetrics('oldSystemErrors', 1);
    }
  }
  
  recordNewSystemRequest(latencyMs: number, error: boolean) {
    this.updateMetrics('newSystemRequests', 1);
    this.updateMetrics('newSystemLatency', latencyMs);
    
    if (error) {
      this.updateMetrics('newSystemErrors', 1);
    }
  }
  
  private updateMetrics(key: string, value: number) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timestamp = `${now.toISOString().split('T')[0]} ${hour}:${minute}:00`;
    
    // Find or create metrics for this timestamp
    let metrics = this.metrics.find(m => m.timestamp === timestamp);
    
    if (!metrics) {
      metrics = {
        timestamp,
        oldSystemRequests: 0,
        newSystemRequests: 0,
        oldSystemErrors: 0,
        newSystemErrors: 0,
        oldSystemLatency: 0,
        newSystemLatency: 0
      };
      this.metrics.push(metrics);
    }
    
    // Update metrics
    if (key === 'oldSystemLatency' || key === 'newSystemLatency') {
      // For latency, we track moving average
      const requestCount = key === 'oldSystemLatency' 
        ? metrics.oldSystemRequests 
        : metrics.newSystemRequests;
      
      if (requestCount > 0) {
        const currentTotal = (metrics[key as keyof MigrationMetrics] as number) * (requestCount - 1);
        metrics[key as keyof MigrationMetrics] = (currentTotal + value) / requestCount;
      } else {
        metrics[key as keyof MigrationMetrics] = value;
      }
    } else {
      // For counters, we increment
      metrics[key as keyof MigrationMetrics] = (metrics[key as keyof MigrationMetrics] as number) + value;
    }
    
    // Trim metrics to last 24 hours
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    this.metrics = this.metrics.filter(m => new Date(m.timestamp) >= cutoff);
  }
  
  getMetrics(hours: number = 24): MigrationMetrics[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this.metrics.filter(m => new Date(m.timestamp) >= cutoff);
  }
  
  getLatestMetrics(): MigrationMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }
    
    return this.metrics[this.metrics.length - 1];
  }
  
  getSummary(): {
    oldSystemErrorRate: number;
    newSystemErrorRate: number;
    oldSystemLatency: number;
    newSystemLatency: number;
    trafficPercentage: number;
  } {
    const metrics = this.getMetrics();
    
    if (metrics.length === 0) {
      return {
        oldSystemErrorRate: 0,
        newSystemErrorRate: 0,
        oldSystemLatency: 0,
        newSystemLatency: 0,
        trafficPercentage: 0
      };
    }
    
    const totalOldRequests = metrics.reduce((sum, m) => sum + m.oldSystemRequests, 0);
    const totalNewRequests = metrics.reduce((sum, m) => sum + m.newSystemRequests, 0);
    const totalRequests = totalOldRequests + totalNewRequests;
    
    const totalOldErrors = metrics.reduce((sum, m) => sum + m.oldSystemErrors, 0);
    const totalNewErrors = metrics.reduce((sum, m) => sum + m.newSystemErrors, 0);
    
    const avgOldLatency = metrics.reduce((sum, m) => sum + m.oldSystemLatency * m.oldSystemRequests, 0) / 
      Math.max(1, totalOldRequests);
    
    const avgNewLatency = metrics.reduce((sum, m) => sum + m.newSystemLatency * m.newSystemRequests, 0) / 
      Math.max(1, totalNewRequests);
    
    return {
      oldSystemErrorRate: totalOldRequests > 0 ? (totalOldErrors / totalOldRequests) * 100 : 0,
      newSystemErrorRate: totalNewRequests > 0 ? (totalNewErrors / totalNewRequests) * 100 : 0,
      oldSystemLatency: avgOldLatency,
      newSystemLatency: avgNewLatency,
      trafficPercentage: totalRequests > 0 ? (totalNewRequests / totalRequests) * 100 : 0
    };
  }
  
  shouldIncreaseTraffic(): boolean {
    const summary = this.getSummary();
    
    // Only recommend increasing if:
    // 1. New system error rate is <= old system error rate
    // 2. New system latency is acceptable
    // 3. Current traffic percentage is < 100%
    return (
      summary.newSystemErrorRate <= summary.oldSystemErrorRate &&
      summary.newSystemLatency < 10000 && // 10 seconds max latency
      summary.trafficPercentage < 100
    );
  }
  
  shouldDecreaseTraffic(): boolean {
    const summary = this.getSummary();
    
    // Recommend decreasing if:
    // 1. New system error rate is significantly higher than old system
    // 2. New system latency is much worse than old system
    return (
      summary.newSystemErrorRate > summary.oldSystemErrorRate * 1.5 ||
      summary.newSystemLatency > summary.oldSystemLatency * 2
    );
  }
  
  getRecommendedTrafficPercentage(): number {
    const currentPercentage = parseInt(process.env.BACKGROUND_JOBS_PERCENTAGE || '0');
    
    if (this.shouldIncreaseTraffic()) {
      // Increase by 10% increments, up to 100%
      return Math.min(100, currentPercentage + 10);
    }
    
    if (this.shouldDecreaseTraffic()) {
      // Decrease by 50% in case of issues
      return Math.max(0, currentPercentage / 2);
    }
    
    // No change recommended
    return currentPercentage;
  }
}

export const migrationMonitor = new MigrationMonitor();
```

## Feature Flag Usage

### Feature Flag Implementation

```typescript
// lib/feature-flags/index.ts
interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userGroups?: string[];
}

class FeatureFlagManager {
  private flags: Record<string, FeatureFlag> = {};
  
  constructor() {
    // Initialize feature flags
    this.initializeFlags();
  }
  
  private initializeFlags() {
    // Background Jobs feature flag
    this.flags.backgroundJobs = {
      name: 'backgroundJobs',
      description: 'Use background job processing for long-running operations',
      enabled: process.env.USE_BACKGROUND_JOBS === 'true',
      rolloutPercentage: parseInt(process.env.BACKGROUND_JOBS_PERCENTAGE || '0')
    };
    
    // Job Monitoring feature flag
    this.flags.jobMonitoring = {
      name: 'jobMonitoring',
      description: 'Enable job monitoring dashboard',
      enabled: process.env.ENABLE_JOB_MONITORING === 'true',
      rolloutPercentage: 100
    };
    
    // Auto Processing feature flag
    this.flags.autoProcessing = {
      name: 'autoProcessing',
      description: 'Enable automatic job processing',
      enabled: process.env.ENABLE_AUTO_PROCESSING === 'true',
      rolloutPercentage: 100
    };
  }
  
  isEnabled(flagName: string, userId?: string): boolean {
    const flag = this.flags[flagName];
    
    if (!flag) {
      return false;
    }
    
    // Check if feature is enabled globally
    if (!flag.enabled) {
      return false;
    }
    
    // Check user groups if specified
    if (userId && flag.userGroups && flag.userGroups.length > 0) {
      // Check if user is in allowed groups
      // This would require a database lookup in a real implementation
      return flag.userGroups.includes(userId);
    }
    
    // Check percentage rollout
    if (flag.rolloutPercentage < 100) {
      if (userId) {
        // Consistent hashing for user ID
        const hash = userId.split('').reduce((acc, char) => {
          return (acc * 31 + char.charCodeAt(0)) % 100;
        }, 0);
        
        return hash < flag.rolloutPercentage;
      } else {
        // Random percentage for anonymous users
        return Math.random() * 100 < flag.rolloutPercentage;
      }
    }
    
    return true;
  }
  
  getAllFlags(): Record<string, FeatureFlag> {
    return { ...this.flags };
  }
  
  updateFlag(flagName: string, updates: Partial<FeatureFlag>): boolean {
    if (!this.flags[flagName]) {
      return false;
    }
    
    this.flags[flagName] = {
      ...this.flags[flagName],
      ...updates
    };
    
    return true;
  }
}

export const featureFlags = new FeatureFlagManager();
```

### Feature Flag API

```typescript
// app/api/admin/feature-flags/route.ts
import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get all feature flags
    const flags = featureFlags.getAllFlags();
    
    return NextResponse.json(flags);
  } catch (error) {
    console.error('Feature flags API error:', error);
    
    return NextResponse.json({
      error: 'Failed to get feature flags'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check admin authentication
    // This would be implemented with proper auth in a real system
    const isAdmin = true;
    
    if (!isAdmin) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Update feature flag
    const { flagName, updates } = await request.json();
    
    if (!flagName || !updates) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }
    
    const success = featureFlags.updateFlag(flagName, updates);
    
    if (!success) {
      return NextResponse.json({
        error: 'Feature flag not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      flag: featureFlags.getAllFlags()[flagName]
    });
  } catch (error) {
    console.error('Feature flags API error:', error);
    
    return NextResponse.json({
      error: 'Failed to update feature flag'
    }, { status: 500 });
  }
}
```

### Feature Flag Usage in Components

```typescript
// components/story/MultiStepStoryForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useAuth } from '@/contexts/auth-context';

export function MultiStepStoryForm() {
  const { user } = useAuth();
  const useBackgroundJobs = useFeatureFlag('backgroundJobs', user?.id);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      if (useBackgroundJobs) {
        // New: Background job approach
        const response = await fetch('/api/jobs/storybook/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to start storybook generation');
        }

        const { jobId, pollingUrl } = await response.json();
        
        // Set up polling
        setJobId(jobId);
        setPollingUrl(pollingUrl);
      } else {
        // Old: Direct processing approach
        const response = await fetch('/api/story/create-storybook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to create storybook');
        }

        const data = await response.json();
        
        // Handle direct response
        router.push(`/storybook/${data.id}`);
      }
    } catch (error) {
      // Error handling...
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Rest of component...
}
```

### Feature Flag Hook

```typescript
// hooks/use-feature-flag.ts
import { useState, useEffect } from 'react';

export function useFeatureFlag(flagName: string, userId?: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    // Check environment variable first (server-rendered value)
    const envFlag = process.env.NEXT_PUBLIC_FEATURE_FLAGS 
      ? JSON.parse(process.env.NEXT_PUBLIC_FEATURE_FLAGS)[flagName]
      : undefined;
    
    if (envFlag !== undefined) {
      setIsEnabled(envFlag);
      return;
    }
    
    // Check local storage for cached value
    const cachedValue = localStorage.getItem(`feature_flag_${flagName}`);
    if (cachedValue !== null) {
      setIsEnabled(cachedValue === 'true');
      return;
    }
    
    // Fetch from API
    const checkFlag = async () => {
      try {
        const response = await fetch(`/api/feature-flags/${flagName}?userId=${userId || ''}`);
        
        if (response.ok) {
          const { enabled } = await response.json();
          setIsEnabled(enabled);
          
          // Cache in local storage
          localStorage.setItem(`feature_flag_${flagName}`, enabled.toString());
        }
      } catch (error) {
        console.error(`Failed to check feature flag ${flagName}:`, error);
      }
    };
    
    checkFlag();
  }, [flagName, userId]);
  
  return isEnabled;
}
```

## Rollback Procedures

### Emergency Rollback

```typescript
// scripts/emergency-rollback.ts
import { featureFlags } from '@/lib/feature-flags';
import { jobWorker } from '@/lib/background-jobs/worker';
import { backupManager } from '@/lib/monitoring/backup-manager';
import { sendSlackAlert } from '@/lib/monitoring/slack-alerts';

async function performEmergencyRollback() {
  console.log('🚨 EMERGENCY ROLLBACK INITIATED');
  
  try {
    // 1. Disable background jobs feature flag
    featureFlags.updateFlag('backgroundJobs', {
      enabled: false,
      rolloutPercentage: 0
    });
    console.log('✅ Disabled background jobs feature flag');
    
    // 2. Stop job worker
    jobWorker.stop();
    console.log('✅ Stopped job worker');
    
    // 3. Create backup
    await backupManager.backupJobsTable();
    console.log('✅ Created backup of job table');
    
    // 4. Update environment variables
    process.env.USE_BACKGROUND_JOBS = 'false';
    process.env.BACKGROUND_JOBS_PERCENTAGE = '0';
    console.log('✅ Updated environment variables');
    
    // 5. Send alert
    await sendSlackAlert(
      process.env.SLACK_ALERT_CHANNEL || 'alerts',
      'EMERGENCY ROLLBACK COMPLETED',
      'Background jobs system has been rolled back to direct processing',
      'critical'
    );
    
    console.log('✅ Emergency rollback completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Emergency rollback failed:', error);
    
    // Send alert
    await sendSlackAlert(
      process.env.SLACK_ALERT_CHANNEL || 'alerts',
      'EMERGENCY ROLLBACK FAILED',
      'Background jobs system rollback failed, immediate manual intervention required',
      'critical',
      error
    );
    
    return false;
  }
}

// Export rollback function
export { performEmergencyRollback };
```

### Rollback API Endpoint

```typescript
// app/api/admin/rollback/route.ts
import { NextResponse } from 'next/server';
import { performEmergencyRollback } from '@/scripts/emergency-rollback';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check admin authentication
    // This would be implemented with proper auth in a real system
    const isAdmin = true;
    
    if (!isAdmin) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Get confirmation
    const { confirm } = await request.json();
    
    if (confirm !== 'CONFIRM_ROLLBACK') {
      return NextResponse.json({
        error: 'Confirmation required'
      }, { status: 400 });
    }
    
    // Perform rollback
    const success = await performEmergencyRollback();
    
    if (!success) {
      return NextResponse.json({
        error: 'Rollback failed'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Emergency rollback completed successfully'
    });
  } catch (error) {
    console.error('Rollback API error:', error);
    
    return NextResponse.json({
      error: 'Failed to perform rollback'
    }, { status: 500 });
  }
}
```

### Rollback UI Component

```typescript
// components/admin/RollbackControl.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function RollbackControl() {
  const [confirmation, setConfirmation] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);
  const { toast } = useToast();
  
  const handleRollback = async () => {
    if (confirmation !== 'CONFIRM_ROLLBACK') {
      toast({
        variant: 'destructive',
        title: 'Invalid Confirmation',
        description: 'Please type CONFIRM_ROLLBACK to proceed'
      });
      return;
    }
    
    if (!confirm('Are you ABSOLUTELY SURE you want to perform an emergency rollback? This will disable the background job system and revert to direct processing.')) {
      return;
    }
    
    setIsRollingBack(true);
    
    try {
      const response = await fetch('/api/admin/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirm: confirmation
        })
      });
      
      if (!response.ok) {
        throw new Error('Rollback failed');
      }
      
      toast({
        title: 'Rollback Successful',
        description: 'Emergency rollback completed successfully'
      });
      
      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Rollback failed:', error);
      
      toast({
        variant: 'destructive',
        title: 'Rollback Failed',
        description: 'Emergency rollback failed, please contact system administrator'
      });
    } finally {
      setIsRollingBack(false);
    }
  };
  
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">Emergency Rollback</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This will immediately disable the background job system and revert to direct processing.
            Only use in case of critical system failure.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Type CONFIRM_ROLLBACK to proceed:
            </label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="border-red-300"
            />
          </div>
          
          <Button
            variant="destructive"
            onClick={handleRollback}
            disabled={isRollingBack || confirmation !== 'CONFIRM_ROLLBACK'}
            className="w-full"
          >
            {isRollingBack ? 'Rolling Back...' : 'Perform Emergency Rollback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Data Migration

### Job Data Migration

```typescript
// scripts/migrate-job-data.ts
import { createClient } from '@supabase/supabase-js';

async function migrateJobData() {
  console.log('🔄 Starting job data migration...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    // 1. Get all storybooks without job IDs
    const { data: storybooks, error: storybooksError } = await supabase
      .from('storybook_entries')
      .select('id, title, user_id, created_at')
      .is('job_id', null);
    
    if (storybooksError) throw storybooksError;
    
    console.log(`Found ${storybooks.length} storybooks without job IDs`);
    
    // 2. Create job records for each storybook
    let created = 0;
    
    for (const storybook of storybooks) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Create job record
      const { error: jobError } = await supabase
        .from('background_jobs')
        .insert({
          id: jobId,
          type: 'storybook',
          status: 'completed',
          progress: 100,
          user_id: storybook.user_id,
          created_at: storybook.created_at,
          updated_at: storybook.created_at,
          started_at: storybook.created_at,
          completed_at: storybook.created_at,
          input_data: {
            title: storybook.title
          },
          result_data: {
            storybook_id: storybook.id
          }
        });
      
      if (jobError) {
        console.error(`Failed to create job for storybook ${storybook.id}:`, jobError);
        continue;
      }
      
      // Update storybook with job ID
      const { error: updateError } = await supabase
        .from('storybook_entries')
        .update({ job_id: jobId })
        .eq('id', storybook.id);
      
      if (updateError) {
        console.error(`Failed to update storybook ${storybook.id}:`, updateError);
        continue;
      }
      
      created++;
    }
    
    console.log(`✅ Created ${created} job records for existing storybooks`);
    return created;
  } catch (error) {
    console.error('❌ Job data migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateJobData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

// Export for programmatic usage
export { migrateJobData };
```

### Schema Migration

```sql
-- migrations/add_job_id_to_storybooks.sql

-- Add job_id column to storybook_entries table
ALTER TABLE storybook_entries
ADD COLUMN job_id TEXT REFERENCES background_jobs(id);

-- Create index for faster lookups
CREATE INDEX idx_storybook_entries_job_id ON storybook_entries(job_id);

-- Add migration tracking
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('20250701000000', 'add_job_id_to_storybooks', NOW());
```

## Backward Compatibility

### Compatibility Layer

```typescript
// lib/migration/compatibility-layer.ts
import { jobManager } from '@/lib/background-jobs/job-manager';

// Convert job status to legacy format
export function convertJobToLegacyFormat(job: any): any {
  if (!job) return null;
  
  // Map job status to legacy status
  const statusMap: Record<string, string> = {
    'pending': 'processing',
    'processing': 'processing',
    'completed': 'success',
    'failed': 'error',
    'cancelled': 'cancelled'
  };
  
  // Convert to legacy format
  return {
    id: job.result_data?.storybook_id || job.id,
    status: statusMap[job.status] || 'processing',
    title: job.input_data?.title || 'Untitled',
    created_at: job.created_at,
    completed_at: job.completed_at,
    error: job.error_message,
    progress: job.progress,
    // Add any other fields needed by legacy clients
  };
}

// Create a job from a legacy request
export async function createJobFromLegacyRequest(
  endpoint: string,
  data: any,
  userId?: string
): Promise<any> {
  // Map legacy endpoints to job types
  const endpointMap: Record<string, string> = {
    '/api/story/create-storybook': 'storybook',
    '/api/story/generate-auto-story': 'auto-story',
    '/api/story/generate-scenes': 'scenes',
    '/api/image/cartoonize': 'cartoonize',
    '/api/story/generate-cartoon-image': 'image-generation'
  };
  
  const jobType = endpointMap[endpoint];
  
  if (!jobType) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  // Create appropriate job type
  let jobId: string | null = null;
  
  switch (jobType) {
    case 'storybook':
      jobId = await jobManager.createStorybookJob(data, userId);
      break;
    case 'auto-story':
      jobId = await jobManager.createAutoStoryJob(data, userId);
      break;
    case 'scenes':
      jobId = await jobManager.createSceneJob(data, userId);
      break;
    case 'cartoonize':
      jobId = await jobManager.createCartoonizeJob(data, userId);
      break;
    case 'image-generation':
      jobId = await jobManager.createImageJob(data, userId);
      break;
  }
  
  if (!jobId) {
    throw new Error('Failed to create job');
  }
  
  // Return job ID and polling URL
  return {
    jobId,
    pollingUrl: `/api/jobs/${jobType}/status/${jobId}`
  };
}

// Get legacy format response for backward compatibility
export async function getLegacyFormatResponse(
  endpoint: string,
  jobId: string
): Promise<any> {
  // Get job status
  const job = await jobManager.getJobStatus(jobId);
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  // If job is completed, return legacy format result
  if (job.status === 'completed' && job.result_data) {
    switch (job.type) {
      case 'storybook':
        return {
          id: job.result_data.storybook_id,
          title: job.input_data.title,
          story: job.input_data.story,
          pages: job.result_data.pages,
          audience: job.input_data.audience,
          has_errors: job.result_data.has_errors,
          warning: job.result_data.warning
        };
      case 'auto-story':
        return {
          storybookId: job.result_data.storybook_id
        };
      case 'scenes':
        return {
          pages: job.result_data.pages,
          audience: job.input_data.audience,
          characterImage: job.input_data.characterImage
        };
      case 'cartoonize':
        return {
          url: job.result_data.url,
          cached: job.result_data.cached
        };
      case 'image-generation':
        return {
          url: job.result_data.url,
          prompt_used: job.result_data.prompt_used,
          reused: job.result_data.reused
        };
    }
  }
  
  // If job is not completed, return legacy processing status
  return {
    status: 'processing',
    message: 'Your request is still processing',
    progress: job.progress,
    jobId: job.id
  };
}
```

### Legacy API Endpoints

```typescript
// app/api/story/create-storybook/route.ts
import { NextResponse } from 'next/server';
import { createJobFromLegacyRequest, getLegacyFormatResponse } from '@/lib/migration/compatibility-layer';
import { shouldUseBackgroundJobs } from '@/lib/migration/traffic-router';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const userId = requestData.user_id;
    
    // Check if we should use background jobs
    if (shouldUseBackgroundJobs(userId)) {
      // Create background job
      const { jobId, pollingUrl } = await createJobFromLegacyRequest(
        '/api/story/create-storybook',
        requestData,
        userId
      );
      
      // For backward compatibility, we need to poll until completion
      // This defeats the purpose of background jobs, but maintains compatibility
      let job = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5 second intervals)
      
      while (attempts < maxAttempts) {
        // Get job status
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}${pollingUrl}`);
        job = await response.json();
        
        if (job.status === 'completed' || job.status === 'failed') {
          break;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
      
      // Convert to legacy format
      const legacyResponse = await getLegacyFormatResponse(
        '/api/story/create-storybook',
        jobId
      );
      
      return NextResponse.json(legacyResponse);
    } else {
      // Original implementation...
    }
  } catch (error) {
    // Error handling...
  }
}
```

## Gradual Replacement

### Replacement Strategy

1. **Phase 1: Infrastructure Setup (Week 1)**
   - Deploy background job system
   - Set up monitoring
   - Configure feature flags
   - Implement compatibility layer

2. **Phase 2: Testing (Week 2)**
   - Internal testing with feature flags
   - Monitoring and performance validation
   - Rollback testing

3. **Phase 3: Controlled Rollout (Weeks 3-4)**
   - 5% of traffic → background jobs
   - Monitor error rates and performance
   - Gradually increase to 20%

4. **Phase 4: Expanded Rollout (Weeks 5-6)**
   - Increase to 50% of traffic
   - Continue monitoring
   - Address any issues

5. **Phase 5: Full Rollout (Weeks 7-8)**
   - Increase to 100% of traffic
   - Maintain compatibility layer
   - Monitor system performance

6. **Phase 6: Legacy Cleanup (Week 9+)**
   - Remove compatibility layer
   - Clean up legacy code
   - Optimize background job system

### Rollout Schedule

```typescript
// scripts/update-rollout-percentage.ts
import { migrationMonitor } from '@/lib/migration/migration-monitor';
import { sendSlackAlert } from '@/lib/monitoring/slack-alerts';

async function updateRolloutPercentage() {
  try {
    // Get current percentage
    const currentPercentage = parseInt(process.env.BACKGROUND_JOBS_PERCENTAGE || '0');
    
    // Get recommended percentage
    const recommendedPercentage = migrationMonitor.getRecommendedTrafficPercentage();
    
    // If no change, exit
    if (recommendedPercentage === currentPercentage) {
      console.log(`No change in rollout percentage: ${currentPercentage}%`);
      return;
    }
    
    // Get migration metrics
    const summary = migrationMonitor.getSummary();
    
    // Update environment variable
    process.env.BACKGROUND_JOBS_PERCENTAGE = recommendedPercentage.toString();
    
    // Log change
    console.log(`Updated rollout percentage: ${currentPercentage}% → ${recommendedPercentage}%`);
    
    // Send alert
    await sendSlackAlert(
      process.env.SLACK_MIGRATION_CHANNEL || 'migration',
      'Migration Rollout Update',
      `Background jobs rollout percentage updated from ${currentPercentage}% to ${recommendedPercentage}%`,
      recommendedPercentage > currentPercentage ? 'info' : 'warning',
      {
        oldSystemErrorRate: summary.oldSystemErrorRate.toFixed(2) + '%',
        newSystemErrorRate: summary.newSystemErrorRate.toFixed(2) + '%',
        oldSystemLatency: (summary.oldSystemLatency / 1000).toFixed(2) + 's',
        newSystemLatency: (summary.newSystemLatency / 1000).toFixed(2) + 's'
      }
    );
    
    return recommendedPercentage;
  } catch (error) {
    console.error('Failed to update rollout percentage:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  updateRolloutPercentage()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

// Export for programmatic usage
export { updateRolloutPercentage };
```

### Automated Rollout Adjustment

```yaml
# .github/workflows/adjust-rollout.yml
name: Adjust Migration Rollout

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  adjust-rollout:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Update rollout percentage
        run: node scripts/update-rollout-percentage.js
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_MIGRATION_CHANNEL: 'migration'
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          BACKGROUND_JOBS_PERCENTAGE: ${{ vars.BACKGROUND_JOBS_PERCENTAGE }}
          
      - name: Update environment variable
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const percentage = fs.readFileSync('rollout-percentage.txt', 'utf8').trim();
            
            await github.rest.actions.updateRepoVariable({
              owner: context.repo.owner,
              repo: context.repo.repo,
              name: 'BACKGROUND_JOBS_PERCENTAGE',
              value: percentage
            });
```

## Testing During Migration

### A/B Testing

```typescript
// lib/migration/ab-testing.ts
interface ABTestResult {
  system: 'old' | 'new';
  endpoint: string;
  duration: number;
  success: boolean;
  error?: string;
  userId?: string;
}

class ABTestingManager {
  private results: ABTestResult[] = [];
  
  recordResult(result: ABTestResult) {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Trim results to last 1000
    if (this.results.length > 1000) {
      this.results = this.results.slice(-1000);
    }
  }
  
  getResults(hours: number = 24): ABTestResult[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this.results.filter(r => 
      new Date(r.timestamp) >= cutoff
    );
  }
  
  getComparison(): {
    oldSystem: {
      totalRequests: number;
      successRate: number;
      averageDuration: number;
    };
    newSystem: {
      totalRequests: number;
      successRate: number;
      averageDuration: number;
    };
  } {
    const results = this.getResults();
    
    const oldResults = results.filter(r => r.system === 'old');
    const newResults = results.filter(r => r.system === 'new');
    
    const oldSuccessful = oldResults.filter(r => r.success).length;
    const newSuccessful = newResults.filter(r => r.success).length;
    
    const oldTotalDuration = oldResults.reduce((sum, r) => sum + r.duration, 0);
    const newTotalDuration = newResults.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      oldSystem: {
        totalRequests: oldResults.length,
        successRate: oldResults.length > 0 ? (oldSuccessful / oldResults.length) * 100 : 0,
        averageDuration: oldResults.length > 0 ? oldTotalDuration / oldResults.length : 0
      },
      newSystem: {
        totalRequests: newResults.length,
        successRate: newResults.length > 0 ? (newSuccessful / newResults.length) * 100 : 0,
        averageDuration: newResults.length > 0 ? newTotalDuration / newResults.length : 0
      }
    };
  }
  
  getEndpointComparison(endpoint: string): {
    oldSystem: {
      totalRequests: number;
      successRate: number;
      averageDuration: number;
    };
    newSystem: {
      totalRequests: number;
      successRate: number;
      averageDuration: number;
    };
  } {
    const results = this.getResults().filter(r => r.endpoint === endpoint);
    
    const oldResults = results.filter(r => r.system === 'old');
    const newResults = results.filter(r => r.system === 'new');
    
    const oldSuccessful = oldResults.filter(r => r.success).length;
    const newSuccessful = newResults.filter(r => r.success).length;
    
    const oldTotalDuration = oldResults.reduce((sum, r) => sum + r.duration, 0);
    const newTotalDuration = newResults.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      oldSystem: {
        totalRequests: oldResults.length,
        successRate: oldResults.length > 0 ? (oldSuccessful / oldResults.length) * 100 : 0,
        averageDuration: oldResults.length > 0 ? oldTotalDuration / oldResults.length : 0
      },
      newSystem: {
        totalRequests: newResults.length,
        successRate: newResults.length > 0 ? (newSuccessful / newResults.length) * 100 : 0,
        averageDuration: newResults.length > 0 ? newTotalDuration / newResults.length : 0
      }
    };
  }
}

export const abTesting = new ABTestingManager();
```

### Shadow Testing

```typescript
// lib/migration/shadow-testing.ts
import { jobManager } from '@/lib/background-jobs/job-manager';

// Shadow test by creating a background job but not waiting for it
export async function shadowTest(
  endpoint: string,
  data: any,
  userId?: string
): Promise<string | null> {
  try {
    console.log(`🔄 Shadow testing ${endpoint}`);
    
    // Map endpoints to job types
    const endpointMap: Record<string, string> = {
      '/api/story/create-storybook': 'storybook',
      '/api/story/generate-auto-story': 'auto-story',
      '/api/story/generate-scenes': 'scenes',
      '/api/image/cartoonize': 'cartoonize',
      '/api/story/generate-cartoon-image': 'image-generation'
    };
    
    const jobType = endpointMap[endpoint];
    
    if (!jobType) {
      console.warn(`Unknown endpoint for shadow testing: ${endpoint}`);
      return null;
    }
    
    // Create job based on type
    let jobId: string | null = null;
    
    switch (jobType) {
      case 'storybook':
        jobId = await jobManager.createStorybookJob(data, userId);
        break;
      case 'auto-story':
        jobId = await jobManager.createAutoStoryJob(data, userId);
        break;
      case 'scenes':
        jobId = await jobManager.createSceneJob(data, userId);
        break;
      case 'cartoonize':
        jobId = await jobManager.createCartoonizeJob(data, userId);
        break;
      case 'image-generation':
        jobId = await jobManager.createImageJob(data, userId);
        break;
    }
    
    if (jobId) {
      console.log(`✅ Created shadow job: ${jobId}`);
    }
    
    return jobId;
  } catch (error) {
    console.error('❌ Shadow test failed:', error);
    return null;
  }
}

// Compare shadow test results with direct processing
export async function compareShadowResults(
  jobId: string,
  directResult: any
): Promise<{
  match: boolean;
  differences?: string[];
}> {
  try {
    // Get job status
    const job = await jobManager.getJobStatus(jobId);
    
    if (!job || job.status !== 'completed') {
      return { match: false, differences: ['Job not completed'] };
    }
    
    // Compare results based on job type
    switch (job.type) {
      case 'storybook':
        return compareStorybookResults(job.result_data, directResult);
      case 'auto-story':
        return compareAutoStoryResults(job.result_data, directResult);
      case 'scenes':
        return compareScenesResults(job.result_data, directResult);
      case 'cartoonize':
        return compareCartoonizeResults(job.result_data, directResult);
      case 'image-generation':
        return compareImageResults(job.result_data, directResult);
      default:
        return { match: false, differences: ['Unknown job type'] };
    }
  } catch (error) {
    console.error('❌ Shadow result comparison failed:', error);
    return { match: false, differences: ['Comparison error'] };
  }
}

// Helper functions for comparing different result types
function compareStorybookResults(jobResult: any, directResult: any): {
  match: boolean;
  differences?: string[];
} {
  const differences = [];
  
  // Check storybook ID
  if (jobResult.storybook_id !== directResult.id) {
    differences.push('Different storybook ID');
  }
  
  // Check page count
  if (jobResult.pages.length !== directResult.pages.length) {
    differences.push(`Different page count: ${jobResult.pages.length} vs ${directResult.pages.length}`);
  }
  
  // Check for errors
  if (jobResult.has_errors !== directResult.has_errors) {
    differences.push('Different error status');
  }
  
  return {
    match: differences.length === 0,
    differences: differences.length > 0 ? differences : undefined
  };
}

// Implement other comparison functions similarly...
```

## Post-Migration Verification

### Verification Checklist

```markdown
# Post-Migration Verification Checklist

## System Health
- [ ] Health check endpoint returns "healthy" status
- [ ] Queue depth is normal (< 10 jobs)
- [ ] Error rate is acceptable (< 5%)
- [ ] Processing capacity is sufficient

## Functionality
- [ ] Storybook generation works end-to-end
- [ ] Auto-story generation completes successfully
- [ ] Scene generation produces correct output
- [ ] Image cartoonization works properly
- [ ] All job types can be processed

## Performance
- [ ] Average processing time is acceptable
- [ ] Job throughput meets expectations
- [ ] Resource utilization is within limits
- [ ] No memory leaks observed

## User Experience
- [ ] Progress tracking works correctly
- [ ] Estimated completion times are accurate
- [ ] Error messages are clear and actionable
- [ ] Cancellation functionality works

## Monitoring
- [ ] Alerts are properly configured
- [ ] Metrics are being collected
- [ ] Dashboards show accurate data
- [ ] Log aggregation is working

## Security
- [ ] Authentication is enforced
- [ ] Authorization is properly applied
- [ ] Rate limiting is effective
- [ ] Webhook security is maintained

## Recovery
- [ ] Stuck jobs are detected
- [ ] Automatic recovery works
- [ ] Manual recovery procedures work
- [ ] Backup and restore functions work

## Legacy Support
- [ ] Compatibility layer works correctly
- [ ] Legacy endpoints still function
- [ ] No regressions in existing functionality
```

### Verification Script

```typescript
// scripts/verify-migration.ts
import { jobManager } from '@/lib/background-jobs/job-manager';
import { jobWorker } from '@/lib/background-jobs/worker';
import { jobMonitor } from '@/lib/background-jobs/monitor';

async function verifyMigration(): Promise<{
  success: boolean;
  results: Record<string, boolean>;
  details: Record<string, any>;
}> {
  console.log('🔍 Verifying migration...');
  
  const results: Record<string, boolean> = {};
  const details: Record<string, any> = {};
  
  try {
    // 1. Check system health
    console.log('Checking system health...');
    const healthReport = await jobMonitor.generateHealthReport();
    results.systemHealthy = healthReport.systemHealth.status === 'healthy';
    details.healthReport = {
      status: healthReport.systemHealth.status,
      queueDepth: healthReport.jobStatistics.queueDepth,
      errorRate: healthReport.systemHealth.errorRate
    };
    
    // 2. Test job creation
    console.log('Testing job creation...');
    const testJobId = await jobManager.createCartoonizeJob({
      prompt: 'Migration verification test',
      style: 'storybook'
    });
    results.jobCreation = !!testJobId;
    details.testJobId = testJobId;
    
    // 3. Test job processing
    console.log('Testing job processing...');
    if (testJobId) {
      const processingResult = await jobWorker.processJobById(testJobId);
      results.jobProcessing = processingResult;
      
      // Get job status
      const jobStatus = await jobManager.getJobStatus(testJobId);
      details.jobStatus = {
        status: jobStatus?.status,
        progress: jobStatus?.progress
      };
    } else {
      results.jobProcessing = false;
    }
    
    // 4. Check queue status
    console.log('Checking queue status...');
    const queueStatus = await jobWorker.getQueueStatus();
    results.queueStatus = !!queueStatus;
    details.queueStatus = queueStatus;
    
    // 5. Check job statistics
    console.log('Checking job statistics...');
    const jobStats = await jobManager.getJobStats();
    results.jobStats = !!jobStats;
    details.jobStats = jobStats;
    
    // 6. Check for stuck jobs
    console.log('Checking for stuck jobs...');
    const stuckJobs = await jobMonitor.getStuckJobs();
    results.noStuckJobs = stuckJobs.length === 0;
    details.stuckJobsCount = stuckJobs.length;
    
    // 7. Check performance metrics
    console.log('Checking performance metrics...');
    const performanceMetrics = await jobMonitor.getPerformanceMetrics();
    results.performanceMetrics = !!performanceMetrics;
    details.performanceMetrics = performanceMetrics;
    
    // Overall success
    const success = Object.values(results).every(Boolean);
    
    console.log(`✅ Migration verification ${success ? 'passed' : 'failed'}`);
    
    return {
      success,
      results,
      details
    };
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    
    return {
      success: false,
      results: {
        error: false
      },
      details: {
        error: error.message || 'Unknown error'
      }
    };
  }
}

// Run if executed directly
if (require.main === module) {
  verifyMigration()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(() => process.exit(1));
}

// Export for programmatic usage
export { verifyMigration };
```

## Conclusion

This migration guide provides a comprehensive approach to transitioning from direct API processing to the background job system. By following these procedures, you can ensure:

1. **Zero Downtime**: Users experience no service interruptions
2. **Data Integrity**: No jobs or user data is lost during migration
3. **Gradual Adoption**: Controlled rollout minimizes risk
4. **Rollback Safety**: Quick recovery if issues arise
5. **Backward Compatibility**: Legacy systems continue to function

For additional information, refer to:
- [API Documentation](API_DOCUMENTATION.md)
- [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md)
- [Monitoring Setup](MONITORING_SETUP.md)