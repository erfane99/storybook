'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Palette,
  Wand2,
  Book
} from 'lucide-react';
import { formatDate } from '@/lib/utils/helpers';
import { ProgressTracker, JobStatus } from './progress-tracker';
import { cn } from '@/lib/utils';

interface JobStatusCardProps {
  jobId: string;
  jobType: 'storybook' | 'auto-story' | 'scenes' | 'cartoonize' | 'image-generation';
  status: JobStatus;
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: string;
  error?: string;
  result?: any;
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

const jobTypeConfig = {
  storybook: {
    icon: Book,
    label: 'Storybook',
    description: 'Complete illustrated storybook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'auto-story': {
    icon: Wand2,
    label: 'Auto Story',
    description: 'AI-generated story with scenes',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  scenes: {
    icon: FileText,
    label: 'Scene Generation',
    description: 'Story broken into visual scenes',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  cartoonize: {
    icon: Palette,
    label: 'Cartoonize',
    description: 'Image converted to cartoon style',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  'image-generation': {
    icon: ImageIcon,
    label: 'Image Generation',
    description: 'Custom scene illustration',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
};

export function JobStatusCard({
  jobId,
  jobType,
  status,
  progress,
  currentStep,
  currentPhase,
  createdAt,
  updatedAt,
  estimatedTimeRemaining,
  error,
  result,
  onView,
  onDownload,
  onDelete,
  onRetry,
  onCancel,
  className,
}: JobStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = jobTypeConfig[jobType];
  const Icon = config.icon;

  const isActive = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isActive && 'ring-2 ring-blue-200 bg-blue-50/30',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              config.bgColor
            )}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>
            
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {config.label}
                <Badge 
                  variant={isCompleted ? 'default' : isFailed ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {status}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isCompleted && onView && (
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {isCompleted && onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {isFailed && onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Tracker */}
        <ProgressTracker
          jobId={jobId}
          jobType={jobType}
          status={status}
          progress={progress}
          currentStep={currentStep}
          currentPhase={currentPhase}
          estimatedTimeRemaining={estimatedTimeRemaining}
          error={error}
          onCancel={isActive ? onCancel : undefined}
          onRetry={isFailed ? onRetry : undefined}
          compact={!isExpanded}
          showDetails={isExpanded}
        />

        {/* Job Details */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(createdAt)}</span>
            </div>
            
            {updatedAt !== createdAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated {formatDate(updatedAt)}</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Less' : 'More'} Details
          </Button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Job ID:</span>
                <p className="text-muted-foreground font-mono text-xs">
                  {jobId}
                </p>
              </div>
              
              <div>
                <span className="font-medium">Type:</span>
                <p className="text-muted-foreground">
                  {config.label}
                </p>
              </div>
            </div>

            {/* Result Information */}
            {isCompleted && result && (
              <div className="space-y-2">
                <span className="font-medium text-sm">Results:</span>
                
                {result.storybook_id && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Storybook created successfully
                    </span>
                  </div>
                )}
                
                {result.url && (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Image generated
                    </span>
                  </div>
                )}
                
                {result.pages && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {result.pages.length} pages created
                    </span>
                  </div>
                )}
                
                {result.cached && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Retrieved from cache
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {isCompleted && (
              <div className="flex gap-2 pt-2">
                {onView && (
                  <Button variant="outline" size="sm" onClick={onView}>
                    <Eye className="h-4 w-4 mr-1" />
                    View Result
                  </Button>
                )}
                
                {onDownload && (
                  <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}