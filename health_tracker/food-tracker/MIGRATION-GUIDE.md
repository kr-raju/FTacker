# Food Tracker: Firebase to Supabase Migration Guide

This comprehensive guide documents the steps required to migrate the Food Tracker application from Firebase to Supabase, while maintaining compatibility with both database providers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Supabase Project](#setup-supabase-project)
3. [Configure Environment Variables](#configure-environment-variables)
4. [Database Schema Setup](#database-schema-setup)
5. [Storage Setup](#storage-setup)
6. [Authentication Setup](#authentication-setup)
7. [Provider-Agnostic Design](#provider-agnostic-design)
8. [Testing the Migration](#testing-the-migration)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Known Limitations](#known-limitations)

## Prerequisites

Before starting the migration, ensure you have:

- Node.js (version 16+) installed
- npm or yarn installed
- Basic understanding of PostgreSQL
- Access to create a Supabase project
- Existing Firebase project details
- Git repository access for the Food Tracker app

## Setup Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project:
   - Enter project name (e.g. "food-tracker")
   - Set a secure database password
   - Choose the region closest to your users
   - Choose the free tier (or paid if needed)

3. Once your project is created, go to Project Settings > API:
   - Copy the `Project URL` (this will be your `NEXT_PUBLIC_SUPABASE_URL`)
   - Copy the `anon` public key (this will be your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Configure Environment Variables

1. In your project root, create a `.env.local` file with the following variables:

```
# Firebase Configuration (keep your existing Firebase config)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Supabase Configuration (add your new Supabase config)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database Provider Selection (use 'firebase' or 'supabase')
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase
```

## Database Schema Setup

Execute the SQL script in the Supabase SQL Editor to create all required tables and set up security policies:

1. Navigate to the SQL Editor in your Supabase dashboard
2. Copy the contents of `setup-supabase.sql` from the repository
3. Run the SQL script in the editor

The script will:
- Create necessary PostgreSQL extensions
- Create tables for users, food entries, connections, and notifications
- Set up Row Level Security policies
- Create indexes for performance
- Set up triggers for automatic timestamp updates

### Table Schemas Overview

#### users

Stores user profile information:
- `id`: UUID (references auth.users)
- `email`: TEXT (user's email)
- `display_name`: TEXT (user's display name)
- `created_at`: TIMESTAMPTZ (when the user was created)
- `updated_at`: TIMESTAMPTZ (when the user was last updated)
- `user_info`: JSONB (additional user information)
- `settings`: JSONB (user preferences and settings)

#### food_entries

Stores food entries for tracking nutrition:
- `id`: UUID (primary key)
- `user_id`: UUID (references users.id)
- `name`: TEXT (name of the food)
- `calories`: INTEGER (calorie count)
- `protein_g`: DECIMAL (protein in grams)
- `carbs_g`: DECIMAL (carbs in grams)
- `fat_g`: DECIMAL (fat in grams)
- `meal_type`: TEXT (e.g., breakfast, lunch, dinner)
- `date`: DATE (date of the entry)
- `time`: TIME (time of the entry)
- `image_url`: TEXT (URL to food image)
- `created_at`: TIMESTAMPTZ (when entry was created)
- `updated_at`: TIMESTAMPTZ (when entry was last updated)
- `metadata`: JSONB (additional entry information)

#### connections

Manages connections between users:
- `id`: UUID (primary key)
- `user_id`: UUID (references users.id, the requester)
- `connected_user_id`: UUID (references users.id, the recipient)
- `status`: TEXT (pending, accepted, rejected)
- `role`: TEXT (viewer, editor, etc.)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ
- `metadata`: JSONB

#### notifications

Stores notifications for users:
- `id`: UUID (primary key)
- `user_id`: UUID (references users.id)
- `type`: TEXT (notification type)
- `data`: JSONB (notification data)
- `read`: BOOLEAN (whether notification has been read)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

## Storage Setup

The setup script automatically creates a storage bucket for food images. Here's what it does:

1. Creates a `food-images` bucket for storing user-uploaded food photos
2. Sets up policies so users can only access their own images
3. Configures the proper permissions for upload, retrieve, update, and delete operations

File paths in the bucket should follow this pattern: `user_id/filename.extension`

## Authentication Setup

1. Enable Email authentication in Supabase:
   - Go to Authentication > Providers
   - Ensure Email provider is enabled
   - Configure additional settings as needed

2. Set up email verification (optional but recommended):
   - Go to Authentication > Email Templates
   - Customize the confirmation email template
   - Ensure redirect URLs are set correctly

3. Set up the auth callback handler:
   - The project includes an auth callback page at `/app/auth/callback/page.tsx`
   - This handles email verification redirects and session management

## Provider-Agnostic Design

The application uses a provider-agnostic architecture to work with both Firebase and Supabase:

### Key Components

1. **db-provider.ts**: Central abstraction layer that routes operations to Firebase or Supabase
2. **firebase.ts**: Implementation of database operations using Firebase
3. **supabase.ts**: Implementation of database operations using Supabase
4. **auth-provider.tsx**: React context managing authentication state

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Next.js Application            │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             auth-provider.tsx               │
│      (Authentication Context Provider)      │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              db-provider.ts                 │
│           (Abstraction Layer)               │
└────────┬─────────────────────────┬──────────┘
         │                         │
         ▼                         ▼
┌────────────────┐        ┌────────────────┐
│  firebase.ts   │        │  supabase.ts   │
└────────┬───────┘        └────────┬───────┘
         │                         │
         ▼                         ▼
┌────────────────┐        ┌────────────────┐
│    Firebase    │        │    Supabase    │
└────────────────┘        └────────────────┘
```

### Data Naming Conversion

Since Firebase uses camelCase and Supabase uses snake_case, the application includes utilities to convert between them:

- `convertToCamelCase()`: Converts database results from snake_case to camelCase
- `convertToSnakeCase()`: Converts application data from camelCase to snake_case

## Testing the Migration

Follow these steps to verify the migration works correctly:

1. **Run the application locally**:
   ```bash
   cd food-tracker
   npm install
   npm run dev
   ```

2. **Test authentication flows**:
   - Register a new user
   - Verify email (if enabled)
   - Log in with the new user
   - Test password reset

3. **Test data operations**:
   - Create food entries
   - Update food entries
   - Delete food entries
   - View food entries in different views (day, week, month)

4. **Test connections**:
   - Send connection requests
   - Accept connection requests
   - Reject connection requests
   - View connected users

5. **Test notifications**:
   - Verify connection notifications work
   - Mark notifications as read

6. **Test file uploads**:
   - Upload food images
   - View uploaded images
   - Delete images

7. **Verify data in Supabase dashboard**:
   - Check tables contain correct data
   - Verify row-level security is working
   - Check storage for uploaded files

## Troubleshooting Common Issues

### Authentication Issues

- **Email verification not working**: Check redirect URLs in Supabase auth settings
- **User profile not being created**: Verify the database has a users table and check the insert permissions

### Database Issues

- **Permission denied errors**: Review RLS policies
- **Missing data**: Ensure camelCase/snake_case conversion is working

### Storage Issues

- **Upload errors**: Check storage bucket permissions and folder structure
- **File not found errors**: Verify the path format and permissions

## Known Limitations

1. **Offline support**: Supabase doesn't have built-in offline support like Firebase
2. **Real-time limitations**: Supabase real-time capabilities differ from Firebase Firestore
3. **Function execution**: Firebase Cloud Functions would need to be replaced with serverless functions or Supabase Edge Functions 