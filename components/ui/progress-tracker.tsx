'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface ProgressTrackerProps {
  jobId: string;
  jobType: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  estimatedTimeRemaining?: string;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pending',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processing',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Failed',
  },
  cancelled: {
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Cancelled',
  },
};

export function ProgressTracker({
  jobId,
  jobType,
  status,
  progress,
  currentStep,
  currentPhase,
  estimatedTimeRemaining,
  error,
  onCancel,
  onRetry,
  className,
  showDetails = true,
  compact = false,
}: ProgressTrackerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  // Animate progress changes
  useEffect(() => {
    if (status === 'processing') {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [progress, status]);

  // Determine if progress is indeterminate
  const isIndeterminate = status === 'pending' || (status === 'processing' && progress === 0);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <Icon 
            className={cn(
              'h-4 w-4',
              config.color,
              status === 'processing' && 'animate-spin'
            )} 
          />
          <Badge variant="outline" className={cn(config.color)}>
            {config.label}
          </Badge>
        </div>
        
        {status === 'processing' && (
          <div className="flex-1 min-w-0">
            <Progress 
              value={isIndeterminate ? undefined : progress} 
              className="h-2"
            />
            {currentStep && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {currentStep}
              </p>
            )}
          </div>
        )}

        {estimatedTimeRemaining && status === 'processing' && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ~{estimatedTimeRemaining}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      'transition-all duration-300',
      config.bgColor,
      config.borderColor,
      isAnimating && 'scale-[1.02]',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              config.bgColor,
              config.borderColor,
              'border'
            )}>
              <Icon 
                className={cn(
                  'h-5 w-5',
                  config.color,
                  status === 'processing' && 'animate-spin'
                )} 
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold capitalize">
                  {jobType.replace('-', ' ')} Generation
                </h3>
                <Badge variant="outline" className={cn(config.color)}>
                  {config.label}
                </Badge>
              </div>
              
              {showDetails && (
                <p className="text-sm text-muted-foreground">
                  Job ID: {jobId.slice(-8)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && status === 'processing' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {onRetry && status === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(status === 'processing' || status === 'pending') && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {isIndeterminate ? 'Initializing...' : `${progress}%`}
              </span>
              {estimatedTimeRemaining && (
                <span className="text-sm text-muted-foreground">
                  ~{estimatedTimeRemaining} remaining
                </span>
              )}
            </div>
            
            <Progress 
              value={isIndeterminate ? undefined : progress} 
              className={cn(
                'h-3 transition-all duration-500',
                isAnimating && 'animate-pulse'
              )}
            />
          </div>
        )}

        {/* Current Step/Phase */}
        {showDetails && (currentStep || currentPhase) && (
          <div className="space-y-2">
            {currentPhase && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  Current Phase:
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentPhase}
                </span>
              </div>
            )}
            
            {currentStep && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Status:
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentStep}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && status === 'failed' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Generation Failed
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {status === 'completed' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Generation completed successfully!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}