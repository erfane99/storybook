import { NextResponse } from 'next/server';
import { jobWorker } from '@/lib/background-jobs/worker';
import { jobManager } from '@/lib/background-jobs/job-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Optional: Add admin authentication
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader?.startsWith('Bearer ')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { 
      maxJobs = 10, 
      specificJobId, 
      cleanup = false, 
      cleanupDays = 7 
    } = body;

    console.log('🔄 Manual job processing triggered');

    const results: any = {
      timestamp: new Date().toISOString(),
      processed: 0,
      errors: 0,
      skipped: 0,
    };

    // Health check first
    if (!jobWorker.isHealthy()) {
      return NextResponse.json({
        ...results,
        error: 'Job processing system is not healthy',
        health: await jobWorker.getQueueStatus(),
      }, { status: 503 });
    }

    // Process specific job if requested
    if (specificJobId) {
      console.log(`🎯 Processing specific job: ${specificJobId}`);
      const success = await jobWorker.processJobById(specificJobId);
      
      results.processed = success ? 1 : 0;
      results.errors = success ? 0 : 1;
      results.specificJob = {
        jobId: specificJobId,
        success,
      };
    } else {
      // Process multiple jobs
      console.log(`📋 Processing up to ${maxJobs} jobs`);
      const stats = await jobWorker.processJobs(maxJobs);
      
      results.processed = stats.processed;
      results.errors = stats.errors;
      results.skipped = stats.skipped;
    }

    // Optional cleanup
    if (cleanup) {
      console.log(`🧹 Running cleanup (${cleanupDays} days)`);
      const cleaned = await jobWorker.cleanup(cleanupDays);
      results.cleanup = {
        cleaned,
        olderThanDays: cleanupDays,
      };
    }

    // Get current queue status
    const queueStatus = await jobWorker.getQueueStatus();
    results.queueStatus = queueStatus;

    // Get job statistics
    const jobStats = await jobManager.getJobStats();
    results.statistics = jobStats;

    console.log(`✅ Manual processing complete: ${results.processed} processed, ${results.errors} errors`);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Manual job processing error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process jobs',
        timestamp: new Date().toISOString(),
        processed: 0,
        errors: 1,
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for status checking
export async function GET() {
  try {
    const queueStatus = await jobWorker.getQueueStatus();
    const jobStats = await jobManager.getJobStats();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthy: jobWorker.isHealthy(),
      worker: jobWorker.getStats(),
      queue: queueStatus,
      statistics: jobStats,
    });

  } catch (error: any) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get status',
        timestamp: new Date().toISOString(),
        healthy: false,
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}