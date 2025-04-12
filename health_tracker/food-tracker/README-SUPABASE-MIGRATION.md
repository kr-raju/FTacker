# Firebase to Supabase Migration Guide

This guide documents how the Food Tracker app was migrated from Firebase to Supabase while maintaining compatibility with both database providers.

## Architecture Overview

The application uses a provider-agnostic approach, allowing it to work with either Firebase or Supabase as the backend database. This is achieved through an abstraction layer in the `db-provider.ts` file.

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

### Key Components

1. **db-provider.ts**: The central abstraction layer that routes database operations to either Firebase or Supabase
2. **firebase.ts**: Implementation of database operations using Firebase
3. **supabase.ts**: Implementation of database operations using Supabase
4. **auth-provider.tsx**: React context provider that handles authentication state

## Provider-Agnostic Design

The db-provider.ts file serves as an abstraction layer with these key features:

- Determines which provider to use based on environment variable `NEXT_PUBLIC_DEFAULT_DB_PROVIDER`
- Provides helper functions to convert between camelCase (JavaScript) and snake_case (PostgreSQL)
- Implements standard CRUD operations that work with both providers
- Handles authentication operations (register, login, logout)
- Handles file storage operations

## Database Operations

All database operations are abstracted through the following methods:

- `createDocument(collection, data)`
- `getDocument(collection, id)`
- `updateDocument(collection, id, data)`
- `deleteDocument(collection, id)`
- `queryDocuments(collection, filters)`

## Authentication

Authentication is handled through the auth-provider.tsx React context:

- Uses the Supabase client directly for auth operations
- Manages user state and session persistence
- Handles login, registration, and logout
- Manages user profiles automatically
- Provides auth state to components via the `useAuth()` hook

## Data Conversion

Since Supabase uses PostgreSQL with snake_case columns and Firebase uses camelCase properties, conversion utilities handle this difference:

- `convertToCamelCase()`: Converts database results from snake_case to camelCase
- `convertToSnakeCase()`: Converts application data from camelCase to snake_case before saving

## File Storage

File operations are abstracted through:

- `uploadFile(bucket, path, file)`
- `uploadBase64File(bucket, path, base64Data)`
- `getFileUrl(bucket, path)`
- `deleteFile(bucket, path)`

## Migration Steps Completed

1. Created Supabase implementation of all database operations
2. Created database tables in Supabase with proper schemas
3. Set up Row Level Security policies for data protection
4. Created storage buckets with appropriate access policies
5. Updated authentication flow to work with Supabase
6. Implemented data conversion between camelCase and snake_case
7. Updated components to use the provider-agnostic methods

## Configuration

To switch between providers, set the environment variable:

```
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase
```

Or for Firebase:

```
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=firebase
```

## Remaining Work

Some services still have direct Firebase dependencies and need to be updated:

- connectionService.ts needs to be fully refactored to use provider-agnostic methods
- Additional components may need updates to use the auth-provider

## Testing

When testing the application:

1. Test with both providers enabled to ensure compatibility
2. Verify authentication flows (register, login, logout)
3. Test CRUD operations on all data types
4. Verify file uploads and retrievals
5. Check connection and notification functionality 

## Database Schema

The following tables need to be created in Supabase to match the Firebase collections:

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_info JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{
    "measurement_unit": "metric", 
    "calorie_goal": 2000, 
    "water_goal": 2000
  }'::jsonb
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own data
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
```

### food_entries

```sql
CREATE TABLE food_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER,
  protein_g DECIMAL(10, 2),
  carbs_g DECIMAL(10, 2),
  fat_g DECIMAL(10, 2),
  meal_type TEXT,
  date DATE NOT NULL,
  time TIME,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Row Level Security
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- Users can read/update/delete only their own entries
CREATE POLICY "Users can view their own food entries" 
  ON food_entries FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own food entries" 
  ON food_entries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own food entries" 
  ON food_entries FOR UPDATE 
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own food entries" 
  ON food_entries FOR DELETE 
  USING (auth.uid() = user_id);
```

### connections

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  connected_user_id UUID REFERENCES users(id) NOT NULL,
  status TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Row Level Security
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections where they are either the user or the connected user
CREATE POLICY "Users can view their own connections" 
  ON connections FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
  
CREATE POLICY "Users can insert their own connections" 
  ON connections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own connections" 
  ON connections FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
```

### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);
```

## Storage Buckets

In addition to the database tables, a storage bucket for food images needs to be created:

```sql
-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'Food Images', false);

-- Users can upload their own food images
CREATE POLICY "Users can upload their own food images"
ON storage.objects FOR INSERT 
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own food images
CREATE POLICY "Users can view their own food images"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own food images
CREATE POLICY "Users can update their own food images"
ON storage.objects FOR UPDATE
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own food images
CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Environment Variables

To support both Firebase and Supabase, you need to configure the following environment variables:

### Firebase Configuration

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Provider Selection

```
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase  # or 'firebase'
```

Create a `.env.local` file in the project root with these variables. For development, you can also use `.env.development.local`.

## How to Test the Migration

1. **Set up Supabase Project**:
   - Create a new Supabase project
   - Run the SQL scripts to create tables and policies
   - Create the storage bucket for food images

2. **Configure Environment Variables**:
   - Add Supabase URL and Anon Key to your environment
   - Set `NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase`

3. **Run the Application**:
   - Start the application with `npm run dev`
   - Test user registration and login
   - Test CRUD operations for food entries
   - Test connections and notifications
   - Test file uploads and retrievals

4. **Verify Data in Supabase**:
   - Check the Supabase Dashboard to verify data is being stored correctly
   - Verify Row Level Security is working as expected 