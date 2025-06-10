'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobStatusCard } from '@/components/ui/job-status-card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDate } from '@/lib/utils/helpers';

interface Job {
  jobId: string;
  jobType: 'storybook' | 'auto-story' | 'scenes' | 'cartoonize' | 'image-generation';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: string;
  error?: string;
  result?: any;
}

interface JobDashboardProps {
  className?: string;
  maxJobs?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const statusFilters = [
  { value: 'all', label: 'All Jobs', icon: null },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'processing', label: 'Processing', icon: Loader2 },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
  { value: 'failed', label: 'Failed', icon: XCircle },
  { value: 'cancelled', label: 'Cancelled', icon: AlertCircle },
];

const typeFilters = [
  { value: 'all', label: 'All Types' },
  { value: 'storybook', label: 'Storybook' },
  { value: 'auto-story', label: 'Auto Story' },
  { value: 'scenes', label: 'Scenes' },
  { value: 'cartoonize', label: 'Cartoonize' },
  { value: 'image-generation', label: 'Image Generation' },
];

export function JobDashboard({
  className,
  maxJobs = 50,
  autoRefresh = true,
  refreshInterval = 5000,
}: JobDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch jobs from API
  const fetchJobs = async () => {
    if (!user) return;

    try {
      // This would be implemented as a new API endpoint
      const response = await fetch('/api/jobs/user', {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to fetch jobs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load job history',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on search and filters
  useEffect(() => {
    let filtered = jobs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.jobId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.currentStep?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(job => job.jobType === typeFilter);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, typeFilter]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user) return;

    fetchJobs(); // Initial fetch

    const interval = setInterval(fetchJobs, refreshInterval);
    return () => clearInterval(interval);
  }, [user, autoRefresh, refreshInterval]);

  // Handle job actions
  const handleJobView = (job: Job) => {
    if (job.result?.storybook_id) {
      window.open(`/storybook/${job.result.storybook_id}`, '_blank');
    } else if (job.result?.url) {
      window.open(job.result.url, '_blank');
    }
  };

  const handleJobDownload = (job: Job) => {
    // Implement download logic based on job type
    toast({
      title: 'Download',
      description: 'Download functionality would be implemented here',
    });
  };

  const handleJobDelete = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/${job.jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete job');
      }

      setJobs(prev => prev.filter(j => j.jobId !== job.jobId));
      toast({
        title: 'Success',
        description: 'Job deleted successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete job',
      });
    }
  };

  const handleJobRetry = async (job: Job) => {
    // Implement retry logic - would create a new job with same parameters
    toast({
      title: 'Retry',
      description: 'Retry functionality would be implemented here',
    });
  };

  const handleJobCancel = async (job: Job) => {
    try {
      const response = await fetch(`/api/jobs/cancel/${job.jobId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      // Update job status locally
      setJobs(prev => prev.map(j => 
        j.jobId === job.jobId 
          ? { ...j, status: 'cancelled' as const }
          : j
      ));

      toast({
        title: 'Success',
        description: 'Job cancelled successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel job',
      });
    }
  };

  // Get status counts
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Please sign in to view your job history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Dashboard</CardTitle>
              <p className="text-muted-foreground">
                Track your background jobs and view results
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {formatDate(lastRefresh)}
                </span>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={fetchJobs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {statusFilters.slice(1).map(filter => {
              const Icon = filter.icon;
              const count = statusCounts[filter.value] || 0;
              
              return (
                <div key={filter.value} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{filter.label}</p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {typeFilters.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading jobs...</p>
          </CardContent>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {jobs.length === 0 
                ? "You haven't created any jobs yet" 
                : "No jobs match your current filters"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <JobStatusCard
              key={job.jobId}
              jobId={job.jobId}
              jobType={job.jobType}
              status={job.status}
              progress={job.progress}
              currentStep={job.currentStep}
              currentPhase={job.currentPhase}
              createdAt={job.createdAt}
              updatedAt={job.updatedAt}
              estimatedTimeRemaining={job.estimatedTimeRemaining}
              error={job.error}
              result={job.result}
              onView={() => handleJobView(job)}
              onDownload={() => handleJobDownload(job)}
              onDelete={() => handleJobDelete(job)}
              onRetry={() => handleJobRetry(job)}
              onCancel={() => handleJobCancel(job)}
            />
          ))}
        </div>
      )}
    </div>
  );
}