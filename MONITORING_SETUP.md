# Background Jobs Monitoring Setup

Comprehensive guide for setting up monitoring, alerting, and observability for the background job system.

## Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Health Check Automation](#health-check-automation)
3. [Alert Configuration](#alert-configuration)
4. [Performance Monitoring](#performance-monitoring)
5. [Log Management](#log-management)
6. [Error Tracking](#error-tracking)
7. [Capacity Planning](#capacity-planning)
8. [Backup and Recovery](#backup-and-recovery)
9. [Dashboard Setup](#dashboard-setup)
10. [Incident Response](#incident-response)

## Monitoring Overview

### Key Metrics to Monitor

The background job system exposes several critical metrics that should be monitored:

1. **Queue Depth**: Number of pending jobs
2. **Processing Rate**: Jobs processed per minute
3. **Success Rate**: Percentage of jobs completed successfully
4. **Error Rate**: Percentage of jobs that fail
5. **Processing Time**: Average time to complete jobs
6. **Wait Time**: How long jobs wait in queue
7. **Resource Utilization**: CPU, memory, and network usage
8. **API Response Times**: Latency of job endpoints

### Monitoring Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Health API  │───▶│ Monitoring  │───▶│  Alerting   │
└─────────────┘    │   Service   │    │   Service   │
                   └─────────────┘    └─────────────┘
                          │
                          ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Metrics   │◀───│ Dashboards  │───▶│    Logs     │
│  Database   │    │             │    │  Database   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Health Check Automation

### Uptime Monitoring

#### UptimeRobot Setup

1. Create a new monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: Background Jobs Health
   - URL: `https://your-domain.com/api/jobs/health`
   - Monitoring Interval: 5 minutes

2. Configure alert contacts:
   - Email: `your-team@example.com`
   - Slack: Connect to your team's channel
   - SMS: For critical alerts

3. Set alert conditions:
   - When: Status is not 200 OK
   - When: Response time > 10 seconds

#### Pingdom Setup

```javascript
// Pingdom custom check script
var response = JSON.parse(httpResponse.body);

if (response.status !== "healthy") {
  throw new Error("System health check failed: " + response.status);
}

if (response.metrics.queueDepth > 50) {
  throw new Error("Queue depth too high: " + response.metrics.queueDepth);
}

if (response.metrics.errorRate > 10) {
  throw new Error("Error rate too high: " + response.metrics.errorRate + "%");
}
```

### Automated Health Checks

#### GitHub Actions Workflow

```yaml
# .github/workflows/health-check.yml
name: Health Check

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API Health
        id: health
        uses: fjogeleit/http-request-action@v1
        with:
          url: 'https://your-domain.com/api/jobs/health'
          method: 'GET'
      
      - name: Parse Response
        id: parse
        run: |
          STATUS=$(echo '${{ steps.health.outputs.response }}' | jq -r '.status')
          QUEUE=$(echo '${{ steps.health.outputs.response }}' | jq -r '.metrics.queueDepth')
          ERROR_RATE=$(echo '${{ steps.health.outputs.response }}' | jq -r '.metrics.errorRate')
          echo "status=$STATUS" >> $GITHUB_OUTPUT
          echo "queue=$QUEUE" >> $GITHUB_OUTPUT
          echo "error_rate=$ERROR_RATE" >> $GITHUB_OUTPUT
      
      - name: Send Alert on Issues
        if: steps.parse.outputs.status != 'healthy'
        uses: slackapi/slack-github-action@v1.23.0
        with:
          channel-id: 'C0123456789'
          slack-message: |
            :warning: *Health Check Alert*
            Status: ${{ steps.parse.outputs.status }}
            Queue Depth: ${{ steps.parse.outputs.queue }}
            Error Rate: ${{ steps.parse.outputs.error_rate }}%
            
            <https://your-domain.com/jobs|View Job Dashboard>
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

#### Cron Job Script

```bash
#!/bin/bash
# health-check.sh

# Configuration
HEALTH_URL="https://your-domain.com/api/jobs/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/XXX/YYY/ZZZ"
EMAIL="alerts@example.com"

# Get health data
RESPONSE=$(curl -s "$HEALTH_URL")
STATUS=$(echo "$RESPONSE" | jq -r '.status')
QUEUE_DEPTH=$(echo "$RESPONSE" | jq -r '.metrics.queueDepth')
ERROR_RATE=$(echo "$RESPONSE" | jq -r '.metrics.errorRate')
PROCESSING_CAPACITY=$(echo "$RESPONSE" | jq -r '.metrics.processingCapacity')

# Check status
if [ "$STATUS" != "healthy" ]; then
  # Send Slack alert
  curl -X POST -H 'Content-type: application/json' --data "{
    \"text\": \":warning: *Health Check Alert*\nStatus: $STATUS\nQueue Depth: $QUEUE_DEPTH\nError Rate: $ERROR_RATE%\n\n<https://your-domain.com/jobs|View Job Dashboard>\"
  }" "$SLACK_WEBHOOK"
  
  # Send email alert
  echo "Health Check Alert: Status $STATUS" | mail -s "Background Jobs Alert" "$EMAIL"
  
  exit 1
fi

# Check queue depth
if [ "$QUEUE_DEPTH" -gt 50 ]; then
  # Send Slack alert
  curl -X POST -H 'Content-type: application/json' --data "{
    \"text\": \":warning: *Queue Depth Alert*\nQueue Depth: $QUEUE_DEPTH\nProcessing Capacity: $PROCESSING_CAPACITY\n\n<https://your-domain.com/jobs|View Job Dashboard>\"
  }" "$SLACK_WEBHOOK"
  
  exit 1
fi

# Check error rate
if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
  # Send Slack alert
  curl -X POST -H 'Content-type: application/json' --data "{
    \"text\": \":warning: *Error Rate Alert*\nError Rate: $ERROR_RATE%\n\n<https://your-domain.com/jobs|View Job Dashboard>\"
  }" "$SLACK_WEBHOOK"
  
  exit 1
fi

echo "Health check passed: Status $STATUS, Queue $QUEUE_DEPTH, Error Rate $ERROR_RATE%"
exit 0
```

## Alert Configuration

### Critical Alerts

Configure these alerts for immediate response:

1. **System Down Alert**
   - Trigger: Health check returns non-200 status
   - Channels: SMS, Email, Slack
   - Response: Immediate investigation

2. **Queue Depth Critical**
   - Trigger: Queue depth > 50 jobs
   - Channels: Slack, Email
   - Response: Increase processing capacity

3. **High Error Rate**
   - Trigger: Error rate > 20%
   - Channels: Slack, Email
   - Response: Investigate failing jobs

4. **Processing Stalled**
   - Trigger: No jobs processed in 15 minutes
   - Channels: Slack, Email
   - Response: Restart processing system

### Warning Alerts

Configure these alerts for monitoring:

1. **Queue Depth Warning**
   - Trigger: Queue depth > 20 jobs
   - Channels: Slack
   - Response: Monitor situation

2. **Elevated Error Rate**
   - Trigger: Error rate > 10%
   - Channels: Slack
   - Response: Review error patterns

3. **Slow Processing**
   - Trigger: Average processing time > 5 minutes
   - Channels: Slack
   - Response: Investigate performance

4. **Resource Utilization**
   - Trigger: CPU/Memory > 80%
   - Channels: Slack
   - Response: Consider scaling

### Alert Thresholds Configuration

```typescript
// lib/monitoring/alert-thresholds.ts
export const alertThresholds = {
  // Critical thresholds
  critical: {
    queueDepth: 50,
    errorRate: 20, // percentage
    processingTime: 15 * 60 * 1000, // 15 minutes
    waitTime: 10 * 60 * 1000, // 10 minutes
    resourceUtilization: 90, // percentage
    stuckJobs: 5, // number of stuck jobs
  },
  
  // Warning thresholds
  warning: {
    queueDepth: 20,
    errorRate: 10, // percentage
    processingTime: 5 * 60 * 1000, // 5 minutes
    waitTime: 3 * 60 * 1000, // 3 minutes
    resourceUtilization: 80, // percentage
    stuckJobs: 2, // number of stuck jobs
  }
};
```

### Slack Integration

```typescript
// lib/monitoring/slack-alerts.ts
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendSlackAlert(
  channel: string,
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical',
  data?: any
) {
  try {
    const color = severity === 'critical' ? '#FF0000' : 
                  severity === 'warning' ? '#FFA500' : 
                  '#36C5F0';
    
    const emoji = severity === 'critical' ? ':red_circle:' : 
                  severity === 'warning' ? ':warning:' : 
                  ':information_source:';
    
    await slack.chat.postMessage({
      channel,
      text: `${emoji} *${title}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        data ? {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '```' + JSON.stringify(data, null, 2) + '```'
          }
        } : null,
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard',
                emoji: true
              },
              url: 'https://your-domain.com/jobs'
            }
          ]
        }
      ].filter(Boolean),
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            },
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'development',
              short: true
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}
```

### Email Alerts

```typescript
// lib/monitoring/email-alerts.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmailAlert(
  recipients: string[],
  subject: string,
  message: string,
  severity: 'info' | 'warning' | 'critical',
  data?: any
) {
  try {
    const subjectPrefix = severity === 'critical' ? '[CRITICAL] ' : 
                          severity === 'warning' ? '[WARNING] ' : 
                          '[INFO] ';
    
    const htmlContent = `
      <h1 style="color: ${severity === 'critical' ? '#FF0000' : severity === 'warning' ? '#FFA500' : '#36C5F0'}">
        ${subject}
      </h1>
      <p>${message}</p>
      ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
      <p>
        <a href="https://your-domain.com/jobs" style="
          background-color: #4CAF50;
          border: none;
          color: white;
          padding: 10px 20px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        ">View Dashboard</a>
      </p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
    `;
    
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM || 'alerts@example.com',
      to: recipients.join(', '),
      subject: subjectPrefix + subject,
      html: htmlContent
    });
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}
```

## Performance Monitoring

### Metrics Collection

```typescript
// lib/monitoring/metrics-collector.ts
import { jobMonitor } from '@/lib/background-jobs/monitor';
import { jobConfig } from '@/lib/background-jobs/config';

interface PerformanceMetrics {
  timestamp: string;
  queueDepth: number;
  processingRate: number;
  successRate: number;
  errorRate: number;
  averageProcessingTime: number;
  resourceUtilization: number;
  jobsPerHour: number;
  jobsPerDay: number;
}

class MetricsCollector {
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistoryLength = 1000; // Keep last 1000 data points
  
  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      // Skip if metrics collection is disabled
      if (!jobConfig.isFeatureEnabled('enableMetricsCollection')) {
        return null;
      }
      
      // Get metrics from monitor
      const [jobStats, performanceMetrics] = await Promise.all([
        jobMonitor.getJobStatistics(),
        jobMonitor.getPerformanceMetrics()
      ]);
      
      // Calculate processing rate
      const processingRate = performanceMetrics.jobsPerHour / 60; // Jobs per minute
      
      // Create metrics object
      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        queueDepth: jobStats.queueDepth,
        processingRate,
        successRate: jobStats.successRate,
        errorRate: 100 - jobStats.successRate,
        averageProcessingTime: jobStats.averageProcessingTime,
        resourceUtilization: performanceMetrics.resourceUtilization,
        jobsPerHour: performanceMetrics.jobsPerHour,
        jobsPerDay: performanceMetrics.jobsPerDay
      };
      
      // Add to history
      this.metricsHistory.push(metrics);
      
      // Trim history if needed
      if (this.metricsHistory.length > this.maxHistoryLength) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistoryLength);
      }
      
      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      return null;
    }
  }
  
  getMetricsHistory(hours: number = 24): PerformanceMetrics[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this.metricsHistory.filter(m => 
      new Date(m.timestamp) >= cutoff
    );
  }
  
  getLatestMetrics(): PerformanceMetrics | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    
    return this.metricsHistory[this.metricsHistory.length - 1];
  }
}

export const metricsCollector = new MetricsCollector();
```

### Metrics API Endpoint

```typescript
// app/api/monitoring/metrics/route.ts
import { NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metrics-collector';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const latest = url.searchParams.get('latest') === 'true';
    
    if (latest) {
      // Get latest metrics
      const metrics = metricsCollector.getLatestMetrics();
      
      if (!metrics) {
        return NextResponse.json({
          error: 'No metrics available'
        }, { status: 404 });
      }
      
      return NextResponse.json(metrics);
    } else {
      // Get historical metrics
      const metrics = metricsCollector.getMetricsHistory(hours);
      
      return NextResponse.json({
        count: metrics.length,
        timespan: `${hours} hours`,
        metrics
      });
    }
  } catch (error) {
    console.error('Metrics API error:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve metrics'
    }, { status: 500 });
  }
}
```

### Performance Dashboard

```typescript
// components/monitoring/performance-dashboard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface PerformanceMetrics {
  timestamp: string;
  queueDepth: number;
  processingRate: number;
  successRate: number;
  errorRate: number;
  averageProcessingTime: number;
  resourceUtilization: number;
  jobsPerHour: number;
  jobsPerDay: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [timespan, setTimespan] = useState<'6h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      
      try {
        const hours = timespan === '6h' ? 6 : timespan === '24h' ? 24 : 168;
        const response = await fetch(`/api/monitoring/metrics?hours=${hours}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        
        const data = await response.json();
        setMetrics(data.metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    
    // Set up polling
    const interval = setInterval(fetchMetrics, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [timespan]);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return timespan === '7d' 
      ? date.toLocaleDateString()
      : date.toLocaleTimeString();
  };
  
  // Calculate averages
  const averageQueueDepth = metrics.length 
    ? metrics.reduce((sum, m) => sum + m.queueDepth, 0) / metrics.length
    : 0;
    
  const averageSuccessRate = metrics.length
    ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
    : 0;
    
  const averageProcessingTime = metrics.length
    ? metrics.reduce((sum, m) => sum + m.averageProcessingTime, 0) / metrics.length
    : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Monitoring</h2>
        
        <Tabs value={timespan} onValueChange={(v) => setTimespan(v as any)}>
          <TabsList>
            <TabsTrigger value="6h">6 Hours</TabsTrigger>
            <TabsTrigger value="24h">24 Hours</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading metrics...</p>
        </div>
      ) : metrics.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p>No metrics data available for the selected timespan.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Queue Depth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageQueueDepth.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Jobs waiting to be processed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageSuccessRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Jobs completed successfully
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Processing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(averageProcessingTime / 1000 / 60).toFixed(1)} min
                </div>
                <p className="text-xs text-muted-foreground">
                  Time to complete jobs
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue Depth Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        minTickGap={30}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => formatTimestamp(label)}
                        formatter={(value) => [value, 'Queue Depth']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="queueDepth" 
                        stroke="#8884d8" 
                        name="Queue Depth"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Processing Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        minTickGap={30}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(label) => formatTimestamp(label)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="processingRate" 
                        stroke="#82ca9d" 
                        name="Processing Rate (jobs/min)"
                        yAxisId="left"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageProcessingTime" 
                        stroke="#ffc658" 
                        name="Avg. Processing Time (ms)"
                        yAxisId="right"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Success vs. Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp}
                        minTickGap={30}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => formatTimestamp(label)}
                      />
                      <Legend />
                      <Bar 
                        dataKey="successRate" 
                        fill="#82ca9d" 
                        name="Success Rate (%)"
                        stackId="a"
                      />
                      <Bar 
                        dataKey="errorRate" 
                        fill="#ff8042" 
                        name="Error Rate (%)"
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
```

## Log Management

### Centralized Logging

#### Winston Logger Setup

```typescript
// lib/monitoring/logger.ts
import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transport options
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // File transport for all logs
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// Export logger
export default logger;
```

#### Middleware for HTTP Logging

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import logger from '@/lib/monitoring/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  
  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  // Log request
  logger.http(`[${requestId}] ${request.method} ${request.url}`);
  
  // Continue with request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add response headers
  response.headers.set('x-request-id', requestId);
  
  // Log response time
  const duration = Date.now() - start;
  logger.http(`[${requestId}] Completed in ${duration}ms`);
  
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### Log Aggregation Services

#### Logtail Setup

```typescript
// lib/monitoring/logtail.ts
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import winston from 'winston';
import logger from './logger';

// Initialize Logtail
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

// Add Logtail transport to winston
if (process.env.NODE_ENV === 'production') {
  logger.add(new LogtailTransport(logtail));
}

// Export enhanced logger
export default logger;
```

#### Papertrail Setup

```typescript
// lib/monitoring/papertrail.ts
import winston from 'winston';
import { Papertrail } from 'winston-papertrail';
import logger from './logger';

// Add Papertrail transport in production
if (process.env.NODE_ENV === 'production') {
  const papertrailTransport = new Papertrail({
    host: process.env.PAPERTRAIL_HOST,
    port: parseInt(process.env.PAPERTRAIL_PORT || '12345'),
    hostname: process.env.PAPERTRAIL_HOSTNAME || 'background-jobs',
    program: 'background-jobs',
    colorize: true,
  });
  
  logger.add(papertrailTransport);
}

// Export enhanced logger
export default logger;
```

### Log Analysis

#### Log Patterns to Monitor

```typescript
// Critical error patterns
const criticalPatterns = [
  'Database connection failed',
  'OpenAI API error',
  'Job exceeded maximum processing time',
  'Out of memory',
  'Maximum retries exceeded',
];

// Warning patterns
const warningPatterns = [
  'Job retry attempt',
  'API rate limit approaching',
  'High queue depth',
  'Slow database query',
];

// Success patterns
const successPatterns = [
  'Job completed successfully',
  'Processing completed',
  'Queue processed successfully',
];
```

#### Log Analysis Script

```bash
#!/bin/bash
# analyze-logs.sh

LOG_FILE="logs/all.log"
REPORT_FILE="logs/analysis_$(date +%Y%m%d).txt"

echo "Log Analysis Report - $(date)" > $REPORT_FILE
echo "=================================" >> $REPORT_FILE

# Count critical errors
echo "Critical Errors:" >> $REPORT_FILE
grep -E "error.*Database connection failed|error.*OpenAI API error|error.*Job exceeded maximum|error.*Out of memory|error.*Maximum retries" $LOG_FILE | wc -l >> $REPORT_FILE

# Count warnings
echo "Warnings:" >> $REPORT_FILE
grep -E "warn.*Job retry attempt|warn.*API rate limit|warn.*High queue depth|warn.*Slow database" $LOG_FILE | wc -l >> $REPORT_FILE

# Count successful operations
echo "Successful Operations:" >> $REPORT_FILE
grep -E "info.*Job completed successfully|info.*Processing completed|info.*Queue processed" $LOG_FILE | wc -l >> $REPORT_FILE

# Most common errors
echo "Most Common Errors:" >> $REPORT_FILE
grep "error" $LOG_FILE | sort | uniq -c | sort -nr | head -10 >> $REPORT_FILE

# Job processing statistics
echo "Job Processing Statistics:" >> $REPORT_FILE
echo "Total jobs created:" >> $REPORT_FILE
grep "Created .* job:" $LOG_FILE | wc -l >> $REPORT_FILE

echo "Jobs completed:" >> $REPORT_FILE
grep "Job completed:" $LOG_FILE | wc -l >> $REPORT_FILE

echo "Jobs failed:" >> $REPORT_FILE
grep "Job failed:" $LOG_FILE | wc -l >> $REPORT_FILE

# Send report
if [ -f $REPORT_FILE ]; then
  mail -s "Log Analysis Report" alerts@example.com < $REPORT_FILE
fi
```

## Error Tracking

### Sentry Integration

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.2,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      beforeSend(event) {
        // Don't send PII
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });
  }
}

export function captureJobError(error: Error, jobId: string, jobType: string) {
  Sentry.withScope((scope) => {
    scope.setTag('job_id', jobId);
    scope.setTag('job_type', jobType);
    scope.setLevel(Sentry.Severity.Error);
    Sentry.captureException(error);
  });
}

export function captureJobEvent(message: string, jobId: string, jobType: string, level: Sentry.Severity = Sentry.Severity.Info) {
  Sentry.withScope((scope) => {
    scope.setTag('job_id', jobId);
    scope.setTag('job_type', jobType);
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}
```

### Error Grouping and Analysis

```typescript
// lib/monitoring/error-analyzer.ts
interface ErrorPattern {
  pattern: RegExp;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

const errorPatterns: ErrorPattern[] = [
  {
    pattern: /OpenAI API Error: Rate limit exceeded/i,
    category: 'Rate Limiting',
    priority: 'high',
    recommendation: 'Implement rate limiting and backoff strategy for OpenAI API calls'
  },
  {
    pattern: /Database connection failed/i,
    category: 'Database',
    priority: 'critical',
    recommendation: 'Check database connectivity and credentials'
  },
  {
    pattern: /Job exceeded maximum processing time/i,
    category: 'Timeout',
    priority: 'medium',
    recommendation: 'Increase job timeout or optimize processing steps'
  },
  {
    pattern: /Out of memory/i,
    category: 'Resources',
    priority: 'critical',
    recommendation: 'Increase memory allocation or optimize memory usage'
  },
  {
    pattern: /Maximum retries exceeded/i,
    category: 'Retry',
    priority: 'high',
    recommendation: 'Investigate persistent failures and improve error handling'
  },
  {
    pattern: /Invalid input/i,
    category: 'Validation',
    priority: 'low',
    recommendation: 'Improve input validation and user feedback'
  },
  {
    pattern: /Network request failed/i,
    category: 'Network',
    priority: 'medium',
    recommendation: 'Check network connectivity and external service status'
  }
];

export function analyzeError(error: string): {
  category: string;
  priority: string;
  recommendation: string;
} {
  for (const pattern of errorPatterns) {
    if (pattern.pattern.test(error)) {
      return {
        category: pattern.category,
        priority: pattern.priority,
        recommendation: pattern.recommendation
      };
    }
  }
  
  return {
    category: 'Unknown',
    priority: 'medium',
    recommendation: 'Investigate error and add to known patterns'
  };
}

export function groupErrorsByCategory(errors: string[]): Record<string, number> {
  const categories: Record<string, number> = {};
  
  for (const error of errors) {
    const { category } = analyzeError(error);
    categories[category] = (categories[category] || 0) + 1;
  }
  
  return categories;
}
```

## Capacity Planning

### Resource Monitoring

```typescript
// lib/monitoring/resource-monitor.ts
import os from 'os';

interface ResourceMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  uptime: number;
  loadAverage: number[];
}

export function getResourceMetrics(): ResourceMetrics {
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
    timestamp: new Date().toISOString(),
    cpu: parseFloat(cpuUsage.toFixed(2)),
    memory: parseFloat(memoryUsage.toFixed(2)),
    uptime: os.uptime(),
    loadAverage: os.loadavg()
  };
}

export function shouldScaleUp(metrics: ResourceMetrics): boolean {
  // Check if we need to scale up
  if (metrics.cpu > 80 || metrics.memory > 85) {
    return true;
  }
  
  // Check load average (5 minute)
  if (metrics.loadAverage[1] > os.cpus().length * 0.8) {
    return true;
  }
  
  return false;
}

export function getScalingRecommendation(metrics: ResourceMetrics): string {
  if (metrics.cpu > 90) {
    return 'Critical CPU usage - immediate scaling recommended';
  }
  
  if (metrics.memory > 90) {
    return 'Critical memory usage - immediate scaling recommended';
  }
  
  if (metrics.cpu > 80) {
    return 'High CPU usage - consider scaling up';
  }
  
  if (metrics.memory > 85) {
    return 'High memory usage - consider scaling up';
  }
  
  if (metrics.loadAverage[1] > os.cpus().length) {
    return 'High load average - consider scaling up';
  }
  
  return 'Resource utilization normal';
}
```

### Scaling Indicators

Monitor these metrics to determine when to scale:

1. **Queue Depth Trend**
   - Increasing trend over 30+ minutes
   - Consistently above 20 jobs

2. **Processing Time Trend**
   - Increasing average processing time
   - Consistently above 5 minutes per job

3. **Resource Utilization**
   - CPU consistently above 80%
   - Memory consistently above 85%
   - Load average above CPU count

4. **Error Rate Trend**
   - Increasing error rate
   - Consistently above 10%

### Scaling Thresholds

```typescript
// lib/monitoring/scaling-thresholds.ts
export const scalingThresholds = {
  // Queue-based scaling
  queue: {
    scaleUp: 30,    // Scale up when queue depth > 30
    scaleDown: 5,   // Scale down when queue depth < 5
    criticalAlert: 50, // Critical alert when queue depth > 50
  },
  
  // Resource-based scaling
  resources: {
    cpu: {
      scaleUp: 80,    // Scale up when CPU > 80%
      scaleDown: 30,  // Scale down when CPU < 30%
      criticalAlert: 95, // Critical alert when CPU > 95%
    },
    memory: {
      scaleUp: 85,    // Scale up when memory > 85%
      scaleDown: 40,  // Scale down when memory < 40%
      criticalAlert: 95, // Critical alert when memory > 95%
    },
    loadAverage: {
      scaleUp: 0.8,   // Scale up when load average > 0.8 * CPU count
      scaleDown: 0.3, // Scale down when load average < 0.3 * CPU count
      criticalAlert: 1.0, // Critical alert when load average > CPU count
    },
  },
  
  // Performance-based scaling
  performance: {
    processingTime: {
      scaleUp: 300000,    // Scale up when avg processing time > 5 minutes
      scaleDown: 60000,   // Scale down when avg processing time < 1 minute
      criticalAlert: 600000, // Critical alert when avg processing time > 10 minutes
    },
    errorRate: {
      scaleUp: 10,    // Scale up when error rate > 10%
      scaleDown: 2,   // Scale down when error rate < 2%
      criticalAlert: 20, // Critical alert when error rate > 20%
    },
  },
};
```

## Backup and Recovery

### Database Backup Strategy

```typescript
// lib/monitoring/backup-manager.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

class BackupManager {
  private supabase: ReturnType<typeof createClient>;
  private backupDir: string;
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Create backup directory if it doesn't exist
    this.backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  async backupJobsTable(): Promise<string> {
    try {
      // Get all jobs
      const { data, error } = await this.supabase
        .from('background_jobs')
        .select('*');
      
      if (error) throw error;
      
      // Create backup file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `jobs_backup_${timestamp}.json`;
      const filePath = path.join(this.backupDir, filename);
      
      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Backup created: ${filename}`);
      return filePath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }
  
  async restoreJobsFromBackup(backupFile: string): Promise<number> {
    try {
      // Read backup file
      const filePath = path.join(this.backupDir, backupFile);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Insert jobs
      const { error } = await this.supabase
        .from('background_jobs')
        .insert(data);
      
      if (error) throw error;
      
      console.log(`✅ Restored ${data.length} jobs from backup`);
      return data.length;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }
  
  listBackups(): string[] {
    return fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('jobs_backup_'))
      .sort()
      .reverse();
  }
  
  deleteOldBackups(keepDays: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    
    let deleted = 0;
    
    fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('jobs_backup_'))
      .forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      });
    
    console.log(`🧹 Deleted ${deleted} old backups`);
    return deleted;
  }
}

export const backupManager = new BackupManager();
```

### Backup Automation

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run backup script
        run: node scripts/backup-database.js
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          
      - name: Upload backup
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/
          retention-days: 7
```

### Recovery Procedures

```typescript
// scripts/recovery-procedures.ts
import { jobManager } from '@/lib/background-jobs/job-manager';
import { jobWorker } from '@/lib/background-jobs/worker';
import { backupManager } from '@/lib/monitoring/backup-manager';

async function recoverStuckJobs() {
  console.log('🔄 Recovering stuck jobs...');
  
  try {
    // Find jobs stuck in processing state
    const stuckJobs = await jobManager.getJobs({
      status: 'processing'
    });
    
    console.log(`Found ${stuckJobs.length} stuck jobs`);
    
    // Reset stuck jobs to pending
    let recovered = 0;
    
    for (const job of stuckJobs) {
      // Check if job is actually stuck (no progress for 10+ minutes)
      const lastUpdate = new Date(job.updated_at).getTime();
      const now = Date.now();
      
      if (now - lastUpdate > 10 * 60 * 1000) {
        // Reset to pending
        await jobManager.updateJobProgress(job.id, 0, 'Recovered from stuck state');
        recovered++;
      }
    }
    
    console.log(`✅ Recovered ${recovered} stuck jobs`);
    return recovered;
  } catch (error) {
    console.error('❌ Recovery failed:', error);
    throw error;
  }
}

async function restoreFromBackup(backupFile: string) {
  console.log(`🔄 Restoring from backup: ${backupFile}`);
  
  try {
    // Stop job worker
    jobWorker.stop();
    
    // Restore from backup
    const restored = await backupManager.restoreJobsFromBackup(backupFile);
    
    // Restart job worker
    jobWorker.start();
    
    console.log(`✅ Restored ${restored} jobs from backup`);
    return restored;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    
    // Ensure worker is restarted even if restore fails
    jobWorker.start();
    
    throw error;
  }
}

async function performSystemRecovery() {
  console.log('🚨 Performing system recovery...');
  
  try {
    // 1. Stop job worker
    jobWorker.stop();
    console.log('✅ Stopped job worker');
    
    // 2. Create backup
    await backupManager.backupJobsTable();
    console.log('✅ Created backup');
    
    // 3. Reset stuck jobs
    const stuckJobs = await recoverStuckJobs();
    console.log(`✅ Reset ${stuckJobs} stuck jobs`);
    
    // 4. Restart job worker
    jobWorker.start();
    console.log('✅ Restarted job worker');
    
    // 5. Trigger processing
    const result = await jobWorker.processJobs(10);
    console.log(`✅ Processed ${result.processed} jobs`);
    
    console.log('✅ System recovery completed successfully');
    return true;
  } catch (error) {
    console.error('❌ System recovery failed:', error);
    
    // Ensure worker is restarted even if recovery fails
    jobWorker.start();
    
    return false;
  }
}

// Export recovery functions
export {
  recoverStuckJobs,
  restoreFromBackup,
  performSystemRecovery
};
```

## Dashboard Setup

### Admin Dashboard

```typescript
// app/admin/monitoring/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PerformanceDashboard } from '@/components/monitoring/performance-dashboard';
import { JobsOverview } from '@/components/monitoring/jobs-overview';
import { SystemHealth } from '@/components/monitoring/system-health';
import { ErrorAnalysis } from '@/components/monitoring/error-analysis';
import { useToast } from '@/hooks/use-toast';

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/admin/check');
        
        if (response.ok) {
          setIsAdmin(true);
        } else {
          // Redirect non-admins
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to verify admin access',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdmin();
  }, [toast]);
  
  const handleSystemRecovery = async () => {
    if (!confirm('Are you sure you want to perform system recovery? This will reset stuck jobs and restart processing.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/recovery', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform system recovery');
      }
      
      toast({
        title: 'Success',
        description: 'System recovery completed successfully',
      });
    } catch (error) {
      console.error('Recovery failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to perform system recovery',
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleSystemRecovery}>
            System Recovery
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <SystemHealth />
        </TabsContent>
        
        <TabsContent value="performance">
          <PerformanceDashboard />
        </TabsContent>
        
        <TabsContent value="jobs">
          <JobsOverview />
        </TabsContent>
        
        <TabsContent value="errors">
          <ErrorAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### System Health Component

```typescript
// components/monitoring/system-health.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock
} from 'lucide-react';

interface SystemHealthData {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  systemStatus: {
    monitor: boolean;
    manager: boolean;
    config: boolean;
  };
  metrics: {
    queueDepth: number;
    processingCapacity: number;
    successRate: number;
    averageProcessingTime: number;
    jobsPerHour: number;
    errorRate: number;
  };
  health: {
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

export function SystemHealth() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/jobs/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchHealthData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading system health data...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <div className="mt-2">
            <Button onClick={fetchHealthData}>Retry</Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!healthData) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p>No health data available</p>
          <Button onClick={fetchHealthData} className="mt-4">
            Check Health
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className={`border-l-4 ${
        healthData.status === 'healthy' ? 'border-l-green-500' :
        healthData.status === 'warning' ? 'border-l-yellow-500' :
        'border-l-red-500'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {getStatusIcon(healthData.status)}
            <div>
              <h3 className="text-xl font-semibold mb-1">
                System Status: {healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}
              </h3>
              <p className="text-muted-foreground">
                {healthData.message}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {new Date(healthData.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={fetchHealthData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Alerts */}
      {healthData.health.alerts.length > 0 && (
        <Alert variant={healthData.status === 'critical' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Active Alerts</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {healthData.health.alerts.map((alert, index) => (
                <li key={index}>{alert}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Server className="h-4 w-4 mr-2" />
              Queue Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.metrics.queueDepth}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing capacity: {healthData.metrics.processingCapacity} jobs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.metrics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Error rate: {healthData.metrics.errorRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(healthData.metrics.averageProcessingTime / 1000 / 60).toFixed(1)} min
            </div>
            <p className="text-xs text-muted-foreground">
              Average job processing time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Cpu className="h-4 w-4 mr-2" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.metrics.jobsPerHour} / hr
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs processed per hour
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Components */}
      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthData.systemStatus.monitor ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Job Monitor</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthData.systemStatus.manager ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Job Manager</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${healthData.systemStatus.config ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Configuration</span>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-2">Operational Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Processing:</span>
                <Badge variant={healthData.operational.autoProcessingEnabled ? 'default' : 'outline'}>
                  {healthData.operational.autoProcessingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Metrics Collection:</span>
                <Badge variant={healthData.operational.metricsCollectionEnabled ? 'default' : 'outline'}>
                  {healthData.operational.metricsCollectionEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Processing Interval:</span>
                <span className="text-sm font-mono">
                  {healthData.operational.processingInterval / 1000}s
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Max Concurrent Jobs:</span>
                <span className="text-sm font-mono">
                  {healthData.operational.maxConcurrentJobs}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recommendations */}
      {healthData.health.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthData.health.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Stuck Jobs */}
      {healthData.health.stuckJobsCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Stuck Jobs Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              {healthData.health.stuckJobsCount} jobs appear to be stuck in processing state.
            </p>
            <Button variant="outline" onClick={handleSystemRecovery}>
              Recover Stuck Jobs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Incident Response

### Incident Response Plan

```markdown
# Incident Response Plan

## Severity Levels

### Level 1: Critical
- System completely down
- Data loss or corruption
- Security breach
- Response time: Immediate (within 15 minutes)

### Level 2: High
- Major functionality broken
- Significant performance degradation
- High error rates (>20%)
- Response time: Within 1 hour

### Level 3: Medium
- Minor functionality issues
- Moderate performance issues
- Elevated error rates (10-20%)
- Response time: Within 4 hours

### Level 4: Low
- Cosmetic issues
- Isolated errors
- Non-critical functionality affected
- Response time: Within 24 hours

## Response Team

- **Primary Responder**: First person to acknowledge the incident
- **Incident Manager**: Coordinates response efforts
- **Technical Lead**: Directs technical investigation and fixes
- **Communications Lead**: Handles stakeholder communications

## Response Procedure

### 1. Detection & Reporting
- Monitor alerts from health check system
- User-reported issues
- Log anomalies
- Performance degradation

### 2. Assessment & Triage
- Determine severity level
- Identify affected components
- Estimate impact (users affected, data at risk)
- Assign incident owner

### 3. Containment
- Isolate affected components
- Implement temporary workarounds
- Protect user data
- Consider service degradation vs. complete outage

### 4. Investigation
- Review logs and metrics
- Identify root cause
- Document findings
- Develop fix strategy

### 5. Resolution
- Implement fixes
- Test in isolated environment
- Deploy to production
- Verify resolution

### 6. Recovery
- Restore full functionality
- Process backlogged jobs
- Verify data integrity
- Return to normal operations

### 7. Post-Incident Review
- Document incident timeline
- Identify root cause
- Document lessons learned
- Implement preventative measures

## Communication Templates

### Internal Alert
```
[INCIDENT] [SEVERITY] Background Job System Issue

Time: [TIMESTAMP]
Status: [INVESTIGATING/IDENTIFIED/RESOLVING/RESOLVED]
Impact: [DESCRIPTION OF IMPACT]
Components: [AFFECTED COMPONENTS]

Current Actions:
- [ACTION 1]
- [ACTION 2]

Next Update: [TIME]
```

### User Communication
```
We're currently experiencing issues with our story generation system. Our team is working to resolve this as quickly as possible. We apologize for any inconvenience.

Status updates will be posted here: [STATUS PAGE URL]
```

### Resolution Notice
```
The issues with our story generation system have been resolved. All services are now operating normally. We apologize for any inconvenience this may have caused.

If you're still experiencing problems, please contact support.
```

## Incident Severity Examples

### Critical Incidents
- Database connection failure
- Complete processing stoppage
- Security breach
- Data corruption

### High Severity Incidents
- Processing queue depth > 50 jobs
- Error rate > 20%
- Average processing time > 15 minutes
- Multiple stuck jobs

### Medium Severity Incidents
- Processing queue depth > 20 jobs
- Error rate 10-20%
- Slow processing (5-15 minutes)
- Individual stuck jobs

### Low Severity Incidents
- Minor UI issues
- Isolated errors
- Slightly elevated processing times
- Non-critical feature issues
```

### Incident Response Script

```typescript
// scripts/incident-response.ts
import { jobMonitor } from '@/lib/background-jobs/monitor';
import { jobWorker } from '@/lib/background-jobs/worker';
import { backupManager } from '@/lib/monitoring/backup-manager';
import { sendSlackAlert } from '@/lib/monitoring/slack-alerts';
import { sendEmailAlert } from '@/lib/monitoring/email-alerts';
import { performSystemRecovery } from '@/lib/monitoring/recovery-procedures';

async function handleCriticalIncident(description: string, error?: any) {
  console.log(`🚨 CRITICAL INCIDENT: ${description}`);
  
  try {
    // 1. Create backup
    await backupManager.backupJobsTable();
    
    // 2. Send alerts
    await Promise.all([
      sendSlackAlert(
        process.env.SLACK_ALERT_CHANNEL || 'alerts',
        'CRITICAL INCIDENT: Background Job System',
        description,
        'critical',
        error
      ),
      sendEmailAlert(
        [process.env.ALERT_EMAIL || 'alerts@example.com'],
        'CRITICAL INCIDENT: Background Job System',
        description,
        'critical',
        error
      )
    ]);
    
    // 3. Generate health report
    const healthReport = await jobMonitor.generateHealthReport();
    
    // 4. Stop job worker
    jobWorker.stop();
    
    // 5. Attempt recovery
    const recoverySuccess = await performSystemRecovery();
    
    // 6. Send recovery status
    const recoveryMessage = recoverySuccess
      ? 'Automatic recovery completed successfully'
      : 'Automatic recovery failed, manual intervention required';
    
    await Promise.all([
      sendSlackAlert(
        process.env.SLACK_ALERT_CHANNEL || 'alerts',
        'Recovery Status: Background Job System',
        recoveryMessage,
        recoverySuccess ? 'info' : 'critical'
      ),
      sendEmailAlert(
        [process.env.ALERT_EMAIL || 'alerts@example.com'],
        'Recovery Status: Background Job System',
        recoveryMessage,
        recoverySuccess ? 'info' : 'critical'
      )
    ]);
    
    return recoverySuccess;
  } catch (recoveryError) {
    console.error('❌ Incident response failed:', recoveryError);
    
    // Ensure worker is restarted
    jobWorker.start();
    
    // Send final alert
    await sendSlackAlert(
      process.env.SLACK_ALERT_CHANNEL || 'alerts',
      'URGENT: Incident Response Failed',
      'Automatic incident response failed, immediate manual intervention required',
      'critical',
      recoveryError
    );
    
    return false;
  }
}

export { handleCriticalIncident };
```

## Conclusion

This monitoring setup provides comprehensive visibility into the background job system's health, performance, and reliability. By implementing these monitoring tools and procedures, you can:

1. **Detect Issues Early**: Identify problems before they impact users
2. **Respond Quickly**: Automated alerts and recovery procedures
3. **Optimize Performance**: Track metrics to guide optimization efforts
4. **Plan Capacity**: Make data-driven scaling decisions
5. **Ensure Reliability**: Maintain high availability and data integrity

For additional information, refer to:
- [API Documentation](API_DOCUMENTATION.md)
- [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md)