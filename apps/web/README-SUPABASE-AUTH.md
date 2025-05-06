# Supabase Authentication Setup

This document outlines the steps needed to integrate Supabase authentication into the Open Agent Platform application.

## Installation

Add the required Supabase packages to your project:

```bash
npm install @supabase/supabase-js
```

## Environment Variables

The following environment variables must be set:

```
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Add these to your `.env.local` file.

## Supabase Configuration

1. Create a new project on [Supabase](https://supabase.com/)
2. Enable authentication in the Supabase dashboard:
   - Go to Authentication → Settings
   - Configure site URL and redirect URLs
   - Enable the Email/Password authentication method
3. For Google OAuth:
   - Set up a project in the Google Cloud Console
   - Create OAuth credentials
   - Add the client ID and secret to Supabase
   - Configure the redirect URL in both Google and Supabase

## Authentication Flow

The application uses a modular authentication system:

1. `/src/lib/auth/types.ts` defines the interfaces for authentication
2. `/src/lib/auth/supabase.ts` implements these interfaces using Supabase
3. `/src/providers/Auth.tsx` provides authentication context to the application

This design allows you to easily swap out Supabase with another authentication provider by:

- Creating a new implementation that follows the `AuthProvider` interface
- Updating the provider used in `Auth.tsx`

## Protected Routes

The application uses a middleware in `/src/middleware.ts` to protect routes that require authentication.

## Auth Pages

The following pages are implemented:

- Sign In: `/app/(auth)/signin/page.tsx`
- Sign Up: `/app/(auth)/signup/page.tsx`
- Forgot Password: `/app/(auth)/forgot-password/page.tsx`
- Reset Password: `/app/(auth)/reset-password/page.tsx`

These pages use the route group `(auth)` to share a layout that doesn't include the sidebar.

## OAuth Callback

The route `/api/auth/callback/route.ts` handles OAuth redirect callbacks from providers like Google.
