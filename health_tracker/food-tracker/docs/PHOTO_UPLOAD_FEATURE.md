# Photo Upload & AI Analysis Feature

This document provides an overview of the photo upload and AI analysis feature in the Food Tracker application.

## Feature Overview

The Photo Upload feature allows users to:
1. Take or upload photos of their meals
2. Have the AI analyze the food content in the image
3. Automatically create a meal entry with the detected food items
4. View the analyzed meal on their dashboard with detailed information
5. View a full-size image and analysis details in a modal view

## Files Responsible for this Feature

### Core Logic
- `services/foodImageService.ts` - Contains logic for uploading images, analyzing them, and creating meal entries
- `services/db-provider.ts` - Provides database abstraction for storing and retrieving image data
- `services/supabase.ts` - Handles Supabase-specific storage and database operations

### UI Components
- `components/FoodEntryItem.tsx` - Displays individual meal entries, including those created from images
- `components/MealDetailModal.tsx` - Shows detailed meal information with full-size photos and AI analysis results
- `components/PhotoUploader.tsx` - Handles the photo upload UI and capture functionality
- `app/dashboard/page.tsx` - Dashboard page that includes the photo upload buttons and meal entry display

## Database Structure

### Supabase Tables
- `food_images` - Stores image metadata and analysis results
  - `id` - Unique identifier
  - `userId` - User who uploaded the image
  - `imageUrl` - URL to the stored image
  - `uploadDate` - When the image was uploaded
  - `analysisResult` - JSON containing AI analysis results
  - `entryId` - Optional link to a food entry

- `food_entries` - Stores all meal entries, including those created from images
  - Additional fields for image-based entries:
    - `imageId` - Reference to the related food image
    - `isFromImage` - Flag indicating this entry was created from an image

### Supabase Storage
- `food-images` bucket - Stores the actual image files

## User Flow

1. User clicks on a meal type's photo upload button on the dashboard
2. The PhotoUploader component opens, allowing the user to take or select a photo
3. The image is uploaded to Supabase storage via the foodImageService
4. The image is analyzed by an AI service
5. Analysis results are stored in the food_images table
6. A new food entry is created based on the analysis and linked to the image
7. The dashboard refreshes to show the new meal entry with a thumbnail
8. User can click on the entry to see full details in the MealDetailModal
9. In the modal, users can view the full-size image and detailed analysis results

## How to Test

1. Open the dashboard
2. Click on any meal type's camera icon 
3. Upload a photo of food
4. Wait for the analysis to complete (you'll see a success notification)
5. The dashboard should update with the new meal entry
6. Click on the entry to see the detailed view with the full image

## Implementation Notes

- The AI analysis is handled by an external service
- Images are stored in Supabase Storage with secure access controls
- The application supports both manual meal entries and photo-based entries
- Photo-based entries show an "AI analyzed" badge to distinguish them from manual entries 