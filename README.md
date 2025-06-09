# StoryCanvas - AI Storybook Generator

Transform real photos into magical illustrated storybooks using AI.

## Features

- Upload personal photos and convert them to cartoon-style illustrations
- Generate custom stories with AI assistance
- Multiple art styles and audience targeting
- Professional printing services
- User authentication and story management

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

### Required Environment Variables

#### Supabase (Database & Auth)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-side only)

#### OpenAI (AI Generation)
- `OPENAI_API_KEY` - Your OpenAI API key for DALL-E and GPT

#### Cloudinary (Image Storage)
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret (server-side only)

#### Optional
- `USE_MOCK=false` - Set to true for development without API calls
- `NEXT_PUBLIC_SITE_URL` - Your production domain

## Development

```bash
npm install
npm run dev
```

## Deployment

This project is configured for Netlify deployment. Set your environment variables in the Netlify dashboard under Site Settings > Environment Variables.

**Important**: Never commit `.env` files to version control. All secrets should be configured in your deployment platform's environment variables.

## Security

- All sensitive API keys are server-side only
- Client-side code only has access to `NEXT_PUBLIC_*` variables
- Database access is protected with Row Level Security (RLS)
- User authentication handled by Supabase Auth