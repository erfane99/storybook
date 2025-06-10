import { createClient } from '@supabase/supabase-js';
import { JobData, JobType, JobStatus, JobFilter } from './types';
import { jobConfig } from './config';
import { jobManager } from './job-manager';

interface JobPriority {
  jobId: string;
  priority: number;
  createdAt: Date;
  jobType: JobType;
  userId?: string;
}

interface ProcessingSlot {
  jobType: JobType;
  userId?: string;
  startTime: Date;
  estimatedEndTime: Date;
}

interface SchedulerStats {
  totalJobs: number;
  prioritizedJobs: number;
  batchedJobs: number;
  delayedJobs: number;
  processingSlots: number;
  averageWaitTime: number;
}

class BackgroundJobScheduler {
  private supabase: ReturnType<typeof createClient> | null = null;
  private initialized = false;
  private processingSlots: Map<string, ProcessingSlot> = new Map();
  private delayedJobs: Map<string, Date> = new Map();
  private userJobCounts: Map<string, number> = new Map();
  private typeJobCounts: Map<JobType, number> = new Map();

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase environment variables not configured for scheduler');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      this.initialized = true;
      console.log('✅ Background job scheduler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize background job scheduler:', error);
    }
  }

  // Get prioritized list of jobs ready for processing
  async getJobsForProcessing(maxJobs: number = 10, filter: JobFilter = {}): Promise<JobData[]> {
    if (!this.initialized || !this.supabase) {
      console.warn('⚠️ Scheduler not initialized, falling back to basic job retrieval');
      return jobManager.getPendingJobs(filter, maxJobs);
    }

    try {
      // Get all pending jobs
      const pendingJobs = await jobManager.getPendingJobs({}, maxJobs * 2); // Get more to allow for filtering
      
      if (pendingJobs.length === 0) {
        return [];
      }

      // Update processing slot tracking
      await this.updateProcessingSlots();

      // Calculate priorities and filter jobs
      const prioritizedJobs = await this.prioritizeJobs(pendingJobs);
      
      // Apply concurrency limits and resource constraints
      const eligibleJobs = this.applyConstraints(prioritizedJobs, maxJobs);

      // Apply user-specified filters
      const filteredJobs = this.applyFilters(eligibleJobs, filter);

      // Sort by priority and creation time
      const sortedJobs = this.sortJobsByPriority(filteredJobs);

      console.log(`📋 Scheduler selected ${sortedJobs.length} jobs for processing`);
      return sortedJobs.slice(0, maxJobs);

    } catch (error) {
      console.error('❌ Error in job scheduling:', error);
      // Fallback to basic job retrieval
      return jobManager.getPendingJobs(filter, maxJobs);
    }
  }

  // Calculate job priorities based on various factors
  private async prioritizeJobs(jobs: JobData[]): Promise<JobPriority[]> {
    const priorities: JobPriority[] = [];

    for (const job of jobs) {
      let priority = jobConfig.getJobPriority(job.type);

      // Age-based priority boost (older jobs get higher priority)
      const ageInMinutes = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60);
      priority += Math.min(ageInMinutes / 10, 5); // Max 5 point boost for age

      // User type priority boost (premium users, etc.)
      if (job.user_id) {
        const userPriority = await this.getUserPriority(job.user_id);
        priority += userPriority;
      }

      // Retry penalty (jobs that have failed before get lower priority)
      priority -= job.retry_count * 0.5;

      // Resource availability boost
      const resourceBoost = this.calculateResourceBoost(job.type);
      priority += resourceBoost;

      priorities.push({
        jobId: job.id,
        priority,
        createdAt: new Date(job.created_at),
        jobType: job.type,
        userId: job.user_id,
      });
    }

    return priorities;
  }

  // Apply concurrency limits and resource constraints
  private applyConstraints(prioritizedJobs: JobPriority[], maxJobs: number): JobPriority[] {
    const config = jobConfig.getConfig();
    const eligibleJobs: JobPriority[] = [];
    const userCounts = new Map<string, number>();
    const typeCounts = new Map<JobType, number>();

    for (const job of prioritizedJobs) {
      // Check global concurrency limit
      if (eligibleJobs.length >= maxJobs) {
        break;
      }

      // Check per-user concurrency limit
      if (job.userId) {
        const userCount = userCounts.get(job.userId) || 0;
        if (userCount >= config.maxJobsPerUser) {
          continue;
        }
      }

      // Check per-type concurrency limit
      const typeLimit = jobConfig.getConcurrencyLimit(job.jobType);
      const typeCount = typeCounts.get(job.jobType) || 0;
      if (typeCount >= typeLimit) {
        continue;
      }

      // Check if job type is currently overloaded
      if (this.isJobTypeOverloaded(job.jobType)) {
        continue;
      }

      // Check resource availability
      if (!this.hasAvailableResources(job.jobType)) {
        continue;
      }

      // Job passes all constraints
      eligibleJobs.push(job);

      // Update counters
      if (job.userId) {
        userCounts.set(job.userId, (userCounts.get(job.userId) || 0) + 1);
      }
      typeCounts.set(job.jobType, (typeCounts.get(job.jobType) || 0) + 1);
    }

    return eligibleJobs;
  }

  // Apply user-specified filters
  private applyFilters(jobs: JobPriority[], filter: JobFilter): JobPriority[] {
    let filteredJobs = jobs;

    if (filter.user_id) {
      filteredJobs = filteredJobs.filter(job => job.userId === filter.user_id);
    }

    if (filter.type) {
      filteredJobs = filteredJobs.filter(job => job.jobType === filter.type);
    }

    return filteredJobs;
  }

  // Sort jobs by priority and creation time
  private sortJobsByPriority(jobs: JobPriority[]): JobData[] {
    // Sort by priority (descending) then by creation time (ascending - older first)
    const sorted = jobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
    });

    // Convert back to JobData (we'll need to fetch the full job data)
    return this.fetchJobData(sorted.map(j => j.jobId));
  }

  // Fetch full job data for selected job IDs
  private async fetchJobData(jobIds: string[]): Promise<JobData[]> {
    const jobs: JobData[] = [];
    
    for (const jobId of jobIds) {
      const job = await jobManager.getJobStatus(jobId);
      if (job) {
        jobs.push(job);
      }
    }

    return jobs;
  }

  // Update processing slot tracking
  private async updateProcessingSlots(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get currently processing jobs
      const { data: processingJobs, error } = await this.supabase
        .from('background_jobs')
        .select('id, type, user_id, started_at')
        .eq('status', 'processing');

      if (error) throw error;

      // Clear old slots
      this.processingSlots.clear();

      // Add current processing jobs to slots
      processingJobs.forEach(job => {
        if (job.started_at) {
          const startTime = new Date(job.started_at);
          const estimatedDuration = jobConfig.getEstimatedDuration(job.type);
          const estimatedEndTime = new Date(startTime.getTime() + estimatedDuration);

          this.processingSlots.set(job.id, {
            jobType: job.type as JobType,
            userId: job.user_id,
            startTime,
            estimatedEndTime,
          });
        }
      });

      // Update user and type job counts
      this.updateJobCounts(processingJobs);

    } catch (error) {
      console.error('❌ Failed to update processing slots:', error);
    }
  }

  // Update job counts for users and types
  private updateJobCounts(processingJobs: any[]): void {
    this.userJobCounts.clear();
    this.typeJobCounts.clear();

    processingJobs.forEach(job => {
      if (job.user_id) {
        this.userJobCounts.set(job.user_id, (this.userJobCounts.get(job.user_id) || 0) + 1);
      }
      this.typeJobCounts.set(job.type, (this.typeJobCounts.get(job.type) || 0) + 1);
    });
  }

  // Get user priority level
  private async getUserPriority(userId: string): Promise<number> {
    if (!this.supabase) return 0;

    try {
      // Check if user is premium, admin, etc.
      const { data: user, error } = await this.supabase
        .from('users')
        .select('user_type, onboarding_step')
        .eq('id', userId)
        .single();

      if (error || !user) return 0;

      let priority = 0;

      // Admin users get higher priority
      if (user.user_type === 'admin') {
        priority += 3;
      }

      // Premium users get higher priority
      if (user.onboarding_step === 'paid') {
        priority += 2;
      }

      return priority;
    } catch (error) {
      console.error('❌ Failed to get user priority:', error);
      return 0;
    }
  }

  // Calculate resource availability boost
  private calculateResourceBoost(jobType: JobType): number {
    const typeConfig = jobConfig.getJobTypeConfig(jobType);
    if (!typeConfig) return 0;

    let boost = 0;

    // Boost for jobs that require fewer resources when system is under load
    const currentLoad = this.getCurrentSystemLoad();
    if (currentLoad > 0.8) {
      // Prefer lighter jobs when system is loaded
      if (typeConfig.resourceRequirements.cpu === 'low') boost += 1;
      if (typeConfig.resourceRequirements.memory === 'low') boost += 1;
    }

    return boost;
  }

  // Check if job type is currently overloaded
  private isJobTypeOverloaded(jobType: JobType): boolean {
    const currentCount = this.typeJobCounts.get(jobType) || 0;
    const limit = jobConfig.getConcurrencyLimit(jobType);
    return currentCount >= limit;
  }

  // Check if resources are available for job type
  private hasAvailableResources(jobType: JobType): boolean {
    const typeConfig = jobConfig.getJobTypeConfig(jobType);
    if (!typeConfig) return true;

    const config = jobConfig.getConfig();
    const currentLoad = this.getCurrentSystemLoad();

    // Check CPU availability
    if (typeConfig.resourceRequirements.cpu === 'high' && currentLoad > config.resourceThresholds.cpu / 100) {
      return false;
    }

    // Check if we're at global concurrency limit
    const totalProcessing = this.processingSlots.size;
    if (totalProcessing >= config.maxConcurrentJobs) {
      return false;
    }

    return true;
  }

  // Get current system load (placeholder - would integrate with actual metrics)
  private getCurrentSystemLoad(): number {
    // This would integrate with actual system metrics
    // For now, estimate based on processing slots
    const config = jobConfig.getConfig();
    return this.processingSlots.size / config.maxConcurrentJobs;
  }

  // Schedule job for delayed execution
  async scheduleDelayedJob(jobId: string, executeAt: Date): Promise<void> {
    this.delayedJobs.set(jobId, executeAt);
    console.log(`⏰ Job ${jobId} scheduled for delayed execution at ${executeAt.toISOString()}`);
  }

  // Get jobs ready for delayed execution
  getReadyDelayedJobs(): string[] {
    const now = new Date();
    const readyJobs: string[] = [];

    for (const [jobId, executeAt] of this.delayedJobs.entries()) {
      if (executeAt <= now) {
        readyJobs.push(jobId);
        this.delayedJobs.delete(jobId);
      }
    }

    return readyJobs;
  }

  // Get scheduler statistics
  getSchedulerStats(): SchedulerStats {
    const totalDelayed = this.delayedJobs.size;
    const totalProcessing = this.processingSlots.size;

    return {
      totalJobs: totalDelayed + totalProcessing,
      prioritizedJobs: 0, // Would track this in real implementation
      batchedJobs: 0, // Would track this in real implementation
      delayedJobs: totalDelayed,
      processingSlots: totalProcessing,
      averageWaitTime: this.calculateAverageWaitTime(),
    };
  }

  // Calculate average wait time for jobs
  private calculateAverageWaitTime(): number {
    if (this.delayedJobs.size === 0) return 0;

    const now = new Date();
    let totalWaitTime = 0;

    for (const executeAt of this.delayedJobs.values()) {
      const waitTime = Math.max(0, executeAt.getTime() - now.getTime());
      totalWaitTime += waitTime;
    }

    return totalWaitTime / this.delayedJobs.size;
  }

  // Cleanup expired processing slots
  cleanupExpiredSlots(): void {
    const now = new Date();
    const expiredSlots: string[] = [];

    for (const [jobId, slot] of this.processingSlots.entries()) {
      if (slot.estimatedEndTime < now) {
        expiredSlots.push(jobId);
      }
    }

    expiredSlots.forEach(jobId => {
      this.processingSlots.delete(jobId);
      console.log(`🧹 Cleaned up expired processing slot for job ${jobId}`);
    });
  }

  // Health check
  isHealthy(): boolean {
    return this.initialized;
  }

  // Get detailed status for debugging
  getDetailedStatus(): object {
    return {
      initialized: this.initialized,
      processingSlots: this.processingSlots.size,
      delayedJobs: this.delayedJobs.size,
      userJobCounts: Object.fromEntries(this.userJobCounts),
      typeJobCounts: Object.fromEntries(this.typeJobCounts),
      systemLoad: this.getCurrentSystemLoad(),
    };
  }
}

// Export singleton instance
export const jobScheduler = new BackgroundJobScheduler();
export default jobScheduler;