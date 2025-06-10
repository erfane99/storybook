# Background Jobs Development Setup Guide

This guide provides step-by-step instructions for setting up a development environment for the background job system.

## Table of Contents

1. [Development Prerequisites](#development-prerequisites)
2. [Local Environment Setup](#local-environment-setup)
3. [Development Workflow](#development-workflow)
4. [Testing with Mock Services](#testing-with-mock-services)
5. [Debugging Techniques](#debugging-techniques)
6. [Local Monitoring](#local-monitoring)
7. [Development Tools](#development-tools)

## Development Prerequisites

### Required Software

- **Node.js 18+**: Required for running the application
- **npm 8+**: Package manager for JavaScript
- **Git**: Version control system
- **VS Code** (recommended): Code editor with TypeScript support

### System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: At least 1GB free space
- **Internet Connection**: Required for API calls and database access

### Required Accounts

- **Supabase Account**: For database and authentication
- **OpenAI API Key**: For AI-powered content generation
- **Cloudinary Account**: For image storage and processing

## Local Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/storybook-app.git
cd storybook-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.production.example .env.local
```

Edit `.env.local` and fill in your development values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Background Jobs Configuration
ENABLE_AUTO_PROCESSING=true
JOB_PROCESSING_INTERVAL=10000
MAX_CONCURRENT_JOBS=2
MAX_JOBS_PER_USER=3
JOB_TIMEOUT_MINUTES=5
JOB_RETENTION_DAYS=1

# Development Settings
USE_MOCK=false
NODE_ENV=development
```

### 4. Set Up Supabase Database

#### Option 1: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

#### Option 2: Using Supabase Cloud

1. Create a new project in [Supabase Dashboard](https://app.supabase.io/)
2. Go to SQL Editor
3. Run each migration file from `supabase/migrations/` in order

### 5. Start Development Server

```bash
npm run dev
```

The server will be available at http://localhost:3000

## Development Workflow

### Recommended Workflow

1. **Make Changes**: Modify code in your editor
2. **Run Tests**: `npm run test` to verify changes
3. **Start Server**: `npm run dev` to run locally
4. **Test Manually**: Use the UI or API endpoints
5. **Commit Changes**: `git commit -m "Description of changes"`

### Hot Reloading

The development server supports hot reloading. When you make changes to:

- **Frontend Components**: Changes appear immediately
- **API Routes**: Server restarts automatically
- **Background Job Code**: May require manual restart

To manually restart the server:

```bash
# Press Ctrl+C to stop the server
npm run dev
```

### Working with Background Jobs

When developing background job features:

1. Set `ENABLE_AUTO_PROCESSING=true` in `.env.local`
2. Set `JOB_PROCESSING_INTERVAL=10000` for faster processing
3. Use the job dashboard at http://localhost:3000/jobs
4. Monitor the console for job processing logs

## Testing with Mock Services

### Enable Mock Mode

For development without calling external APIs:

```env
USE_MOCK=true
```

This will:
- Return mock responses for OpenAI calls
- Skip actual image generation
- Use placeholder data for story generation

### Mock Data

Mock data is stored in:

```
public/mock-images/      # Mock images
lib/mocks/openai.ts      # OpenAI API mocks
lib/mocks/cloudinary.ts  # Cloudinary API mocks
```

### Creating Test Jobs

Use the API endpoints to create test jobs:

```bash
# Create a test cartoonize job
curl -X POST http://localhost:3000/api/jobs/cartoonize/start \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test character", "style": "storybook"}'

# Create a test storybook job
curl -X POST http://localhost:3000/api/jobs/storybook/start \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Story",
    "story": "Once upon a time...",
    "characterImage": "https://example.com/image.jpg",
    "pages": [{"pageNumber": 1, "scenes": [{"description": "Test scene", "emotion": "happy", "imagePrompt": "A happy scene"}]}],
    "audience": "children"
  }'
```

### Manual Job Processing

Trigger job processing manually:

```bash
# Process up to 5 jobs
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 5, "forceProcessing": true}'
```

## Debugging Techniques

### Console Logging

Enhanced logging is available in development:

```typescript
// Add detailed logging
console.log('🔄 Processing job:', jobId);
console.error('❌ Error processing job:', error);
```

### VS Code Debugging

1. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Next.js: Node",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "env": {
        "NODE_OPTIONS": "--inspect"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

2. Set breakpoints in your code
3. Press F5 to start debugging

### Inspecting Job Data

View job data in the database:

```sql
-- View all jobs
SELECT * FROM background_jobs ORDER BY created_at DESC LIMIT 10;

-- View pending jobs
SELECT * FROM background_jobs WHERE status = 'pending';

-- View failed jobs
SELECT * FROM background_jobs WHERE status = 'failed';
```

### Debugging API Endpoints

Use the Network tab in browser DevTools to:
- Monitor API requests
- View request/response data
- Check for errors

For API testing, use tools like:
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [Thunder Client](https://www.thunderclient.com/) (VS Code extension)

## Local Monitoring

### Health Check Dashboard

Access the health dashboard at:
```
http://localhost:3000/admin/monitoring
```

### Job Dashboard

View and manage jobs at:
```
http://localhost:3000/jobs
```

### Console Monitoring

Monitor job processing in the console:

```bash
# Filter job processing logs
npm run dev | grep "Processing job"

# Filter error logs
npm run dev | grep "Error"

# Save logs to file
npm run dev > job-logs.txt 2>&1
```

### Database Monitoring

Monitor the database using Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.io/)
2. Select your project
3. Go to SQL Editor
4. Run monitoring queries:

```sql
-- Monitor queue depth
SELECT 
  status, 
  COUNT(*) as count 
FROM background_jobs 
GROUP BY status;

-- Monitor processing times
SELECT 
  type, 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM background_jobs 
WHERE status = 'completed' 
GROUP BY type;
```

## Development Tools

### Useful npm Scripts

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run specific test file
npm run test -- job-manager.test.ts

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start

# Clean up database (remove old jobs)
npm run cleanup-jobs
```

### Recommended VS Code Extensions

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **TypeScript Error Translator**: Better TypeScript errors
- **REST Client**: Test API endpoints
- **Supabase**: Supabase integration
- **Thunder Client**: API testing

### Development Utilities

#### Reset Database

```bash
# Reset job table (caution: removes all jobs)
npm run reset-jobs
```

#### Generate Test Data

```bash
# Create test jobs
npm run create-test-jobs
```

#### Monitor Performance

```bash
# Run performance monitoring
npm run monitor-performance
```

## Troubleshooting

### Common Issues

#### Job Processing Not Working

1. Check `ENABLE_AUTO_PROCESSING` is set to `true`
2. Verify `JOB_PROCESSING_INTERVAL` is not too high
3. Check console for errors
4. Verify database connection

#### Database Connection Issues

1. Check Supabase credentials in `.env.local`
2. Verify network connection to Supabase
3. Check if tables exist in database

#### OpenAI API Issues

1. Verify API key is valid
2. Check for rate limiting errors
3. Try enabling mock mode (`USE_MOCK=true`)

#### Memory Issues

1. Reduce `MAX_CONCURRENT_JOBS` to 1
2. Check for memory leaks using Node.js profiler
3. Increase available memory

### Getting Help

If you encounter issues:

1. Check the documentation:
   - [API Documentation](API_DOCUMENTATION.md)
   - [Integration Guide](BACKGROUND_JOBS_INTEGRATION.md)
   - [Testing Guide](TESTING_GUIDE.md)

2. Search for similar issues in the issue tracker

3. Ask for help in the team chat

## Next Steps

After setting up your development environment:

1. Review the [API Documentation](API_DOCUMENTATION.md)
2. Explore the background job system architecture
3. Run the test suite to understand functionality
4. Try creating and processing different job types
5. Experiment with performance optimizations

Happy coding!