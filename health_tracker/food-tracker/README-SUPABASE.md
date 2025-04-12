# Supabase Setup for Food Tracker

This guide explains how to set up Supabase for the Food Tracker application.

## Implemented Changes

1. **Installed Supabase Client**
   - Added `@supabase/supabase-js` to package.json

2. **Created Database Tables**
   - Created the following tables:
     - `users`
     - `food_entries`
     - `food_images`
     - `connections`
     - `notifications`

3. **Set up Row Level Security**
   - Applied RLS policies to all tables to ensure proper data access control

4. **Created Storage Buckets**
   - Created `food-images` bucket for storing food images
   - Set up appropriate bucket policies

5. **Added Authentication Provider**
   - Created Auth Provider context to handle authentication state
   - Updated login, register, and profile pages to use the provider

6. **Fixed Data Provider Integration**
   - Created a provider-agnostic db-provider service
   - Implemented proper camelCase/snake_case conversion utilities
   - Updated imports to use the db-provider instead of direct Firebase references

7. **Refactored Connection Service**
   - Updated connectionService.ts to use the provider-agnostic db-provider methods
   - Removed direct Firebase dependencies
   - Fixed type definitions and improved documentation

## Next Steps

1. **Update Remaining Services**
   - Ensure any remaining Firebase-specific code is updated to use the db-provider

2. **Test All Functionality**
   - Verify that all features work correctly with Supabase

3. **Deploy to Production**
   - Update environment variables for production
   - Deploy to hosting platform

## Environment Setup

To use Supabase instead of Firebase, set the following environment variable:

```
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase
```

Make sure to also add your Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Important Notes

### Column Naming Convention
Supabase uses snake_case for column names (e.g., `user_id`), while JavaScript typically uses camelCase (e.g., `userId`). 
To handle this difference, we:

1. Added conversion functions in `db-provider.ts` to transform between these formats:
   - `convertToCamelCase`: Converts database response from snake_case to camelCase
   - `convertToSnakeCase`: Converts JavaScript objects from camelCase to snake_case

2. Fixed query filters to properly handle this conversion:
   - When using array-style filters (`{ field: 'userId', operator: '==', value: 'abc' }`), the field name is automatically converted
   - When using object-style filters (`{ userId: 'abc' }`), the keys are converted to snake_case

### SQL Errors and Their Solutions

Common SQL errors we found and fixed:

1. **Column name errors** - `column connections.userId does not exist`
   - Solution: Convert all field names to snake_case when querying Supabase
   - Updated `queryDocuments` to handle this conversion automatically

2. **Parameter format errors** - Issues with array-style filters
   - Solution: Properly transform array-style filters to format Supabase expects
   - Added special handling in `db-provider.ts` to convert filter formats

## Table Structure

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile JSONB
);
```

### Connections Table
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  connected_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(user_id, connected_user_id)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Prerequisites

1. A Supabase account
2. A Supabase project

## Environment Variables

Make sure your `.env.local` file has the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase
```

## Ongoing Migration Notes

Some files still use direct Firebase imports and need to be updated:

1. `connectionService.ts` - Uses direct Firebase imports, needs refactoring
2. Other possible service files - Check for direct Firebase imports

## Running the Application

Once you've set up Supabase, you can run the application with:

```bash
npm run dev
```

## Troubleshooting

If you encounter SQL errors about missing columns:

1. Check the error message to see which column is mentioned
2. Ensure you're using array-style filters with the field/operator/value format
3. If using direct object filters, ensure the key name matches the database column (in camelCase)

## Future Improvements

1. Refactor all services to use the provider-agnostic approach
2. Add comprehensive tests for Supabase integration
3. Update any remaining Firebase-specific code 

## Database Schema

The Supabase instance has the following tables:

### users
- id (uuid, primary key)
- email (string, unique)
- name (string)
- photo_url (string, optional)
- age (integer, optional)
- weight (float, optional)
- height (float, optional)
- sex (string, optional)
- activity_level (string, optional)
- goal (string, optional)
- created_at (timestamp)
- updated_at (timestamp)

### food_entries
- id (uuid, primary key)
- user_id (uuid, references users.id)
- name (string)
- calories (integer)
- protein (float, optional)
- carbs (float, optional)
- fat (float, optional)
- meal_type (string)
- date (timestamp)
- image_url (string, optional)
- created_at (timestamp)
- updated_at (timestamp)

### connections
- id (uuid, primary key)
- user_id (uuid, references users.id)
- connected_user_id (uuid, references users.id)
- status (string: 'pending', 'accepted', 'rejected')
- created_at (timestamp)
- updated_at (timestamp)

### notifications
- id (uuid, primary key)
- user_id (uuid, references users.id)
- type (string)
- message (string)
- is_read (boolean)
- action_url (string, optional)
- sender_name (string, optional)
- sender_email (string, optional)
- created_at (timestamp)
- updated_at (timestamp)

## How to Test

1. Start the app: `npm run dev`
2. Register a new user
3. Log in with the registered user
4. Set up a profile
5. Add food entries
6. Connect with other users
7. View shared tracking data 