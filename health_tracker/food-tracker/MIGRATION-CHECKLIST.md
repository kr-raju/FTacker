# Firebase to Supabase Migration Checklist

Use this checklist to track the progress of your migration from Firebase to Supabase.

## Initial Setup

- [ ] Create Supabase project
- [ ] Configure environment variables
  - [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Set `NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase`

## Database Setup

- [ ] Run `setup-supabase.sql` in Supabase SQL Editor
- [ ] Verify all tables were created:
  - [ ] users
  - [ ] food_entries
  - [ ] connections
  - [ ] notifications
- [ ] Verify Row Level Security policies
- [ ] Verify indexes were created

## Storage Setup

- [ ] Verify `food-images` bucket was created
- [ ] Test file upload permissions
- [ ] Test file retrieval permissions

## Authentication Setup

- [ ] Enable Email provider in Supabase Authentication settings
- [ ] Configure email templates
- [ ] Verify auth callback functionality

## Code Fixes

- [ ] Fix Connection type export in connectionService.ts
- [ ] Fix acceptConnection parameter in dashboard/page.tsx
- [ ] Fix type issues in db-provider.ts
  - [ ] Update uploadFile to handle string or File
  - [ ] Make getFileUrl async and return Promise<string>

## Testing

- [ ] Test user registration
- [ ] Test user login
- [ ] Test food entry creation
- [ ] Test food entry updates and deletion
- [ ] Test user connections
- [ ] Test notifications
- [ ] Test file uploads

## Deployment

- [ ] Update environment variables in production
- [ ] Deploy application
- [ ] Verify functionality in production environment

## Post-Migration

- [ ] Consider data migration from Firebase to Supabase (if needed)
- [ ] Monitor for any issues
- [ ] Update documentation
- [ ] Consider sunsetting Firebase services if no longer needed 