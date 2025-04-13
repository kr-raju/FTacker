# Food Tracker

A comprehensive web application for tracking your daily food intake, monitoring calories, and managing your nutrition goals.

## Features

- **User Authentication**: Secure login and registration system
- **Food Tracking**: Log your daily food intake
- **Calorie Monitoring**: Track your calorie consumption
- **Profile Management**: Set up and manage your personal profile
- **Dashboard**: View your nutrition statistics and progress
- **AI Food Analysis**: Take photos of your food for automatic calorie and nutrition analysis
- **User Connections**: Connect with friends and family to share food tracking data
- **Notifications**: Receive updates on connection requests and more

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: 
  - Supabase (Database, Authentication, Storage)
  - Firebase (Alternative backend provider)
- **AI**: Gemini 2.0 Flash for food image analysis
- **Language**: TypeScript

## AI Food Analysis Feature

The application includes an advanced AI-powered food analysis system that allows users to:

1. **Take or upload food photos**: Capture images directly in the app or upload from a gallery
2. **Receive automatic analysis**: AI identifies food items, estimates calories and nutritional content
3. **Save to daily log**: Analyzed meals are automatically added to the user's daily food log

### AI Implementation Details

- **AI Model**: Google's Gemini 2.0 Flash multimodal model
- **API Integration**: Direct integration with Gemini API for real-time analysis
- **Prompt Engineering**: Detailed prompts ensure accurate food identification and nutrition estimation

#### AI Analysis Prompt

The system sends the following prompt to Gemini API:

```
You are a professional nutritionist and food expert. Analyze this food image and provide the following information:

1. Identify the main food items visible in the image
2. Estimate the calories for each identified item
3. Identify any drinks visible (water, coffee, soda, etc.)
4. Estimate portion sizes where possible
5. Identify any side dishes
6. Assess the overall healthiness of the meal (on a scale of 1-10)
7. Provide health benefits or concerns based on the food composition

Format your response as a valid JSON object with the following structure:
{
  "items": [
    {
      "name": "item name",
      "calories": estimated calories (number),
      "portion": "estimated portion size (e.g., '1 cup', '250g', etc.)",
      "type": "breakfast/lunch/dinner/snacks/coffee/custom",
      "isHealthy": true/false (whether this item is considered healthy)
    }
  ],
  "totalCalories": sum of all calories,
  "mealType": "best guess for meal type (breakfast/lunch/dinner/snacks/coffee/custom)",
  "waterIntake": estimated water intake in ml (if visible, otherwise 0),
  "description": "brief description of the overall meal",
  "healthScore": number from 1-10 (10 being the healthiest),
  "healthAssessment": "brief assessment of meal's nutritional value, health benefits, and any concerns",
  "healthyAlternatives": "suggestions for making this meal healthier (if applicable)"
}

Be precise with your analysis and provide realistic calorie estimates.
```

#### AI Response Data Structure

The AI returns a structured JSON response with the following information:

- **Items**: List of food items with names, calories, portions, and health status
- **Total Calories**: Total calorie count for the entire meal
- **Meal Type**: Classification of the meal (breakfast, lunch, dinner, etc.)
- **Water Intake**: Estimated water content in milliliters
- **Health Score**: Rating from 1-10 on healthiness
- **Health Assessment**: Text analysis of nutritional value
- **Healthy Alternatives**: Suggestions for healthier options

### Health Score Calculation

In addition to the AI-provided health score, the app calculates its own score based on:

- **Calorie content**: Lower calorie meals score higher
- **Food components**: Presence of vegetables and fruits increases score
- **Processed foods**: Presence of processed foods decreases score

### Database Schema for AI Analysis

The AI analysis results are stored in the database with the following structure:

```
food_images:
  - id: string (primary key)
  - userId: string (foreign key to users)
  - imageUrl: string (URL to the stored image)
  - thumbnailUrl: string (URL to the thumbnail image)
  - analysisResult: FoodAnalysisResult (JSON object with analysis data)
  - createdAt: Date (timestamp)
  - foodEntryId: string (optional, links to a food entry)
  - hash: string (for image similarity matching)
```

### AI Provider Abstraction

The system is designed with provider abstraction in mind, making it easy to swap out Gemini for other AI models:

1. **Service Interface**: All AI interactions go through the `geminiService.ts` file
2. **Consistent Response Format**: Any AI provider must return data in the `FoodAnalysisResult` format
3. **Error Handling**: Fallback values are provided if the AI analysis fails

To switch to a different AI provider:

1. Create a new service file (e.g., `openaiService.ts`) implementing the same interface
2. Update the import in `foodImageService.ts` to use the new provider
3. Ensure the new provider returns data in the expected format

## Supabase Integration

The application uses Supabase as the primary backend service provider:

### Supabase Setup

1. **Authentication**: User registration, login, and profile management
2. **Database**: PostgreSQL database for storing food entries, user data, and connections
3. **Storage**: File storage for food images
4. **Row Level Security (RLS)**: Secure data access policies

### Database Tables

```
users:
  - id: string (primary key)
  - email: string (unique)
  - name: string
  - photoURL: string (optional)
  - userInfo: JSON (optional profile data)

connections:
  - id: string (primary key)
  - userId: string (foreign key to users)
  - connectedUserId: string (foreign key to users)
  - status: ConnectionStatus (pending, accepted, rejected)
  - createdAt: Date
  - updatedAt: Date

food_entries:
  - id: string (primary key)
  - userId: string (foreign key to users)
  - name: string
  - calories: number
  - date: Date
  - time: string
  - type: MealType
  - completed: boolean
  - description: string (optional)
  - waterIntake: number (optional)
  - items: string[] (optional)
  - imageId: string (optional, foreign key to food_images)

food_images:
  - id: string (primary key)
  - userId: string (foreign key to users)
  - imageUrl: string
  - thumbnailUrl: string (optional)
  - analysisResult: JSON
  - createdAt: Date
  - foodEntryId: string (optional)
  - hash: string

notifications:
  - id: string (primary key)
  - userId: string (foreign key to users)
  - type: NotificationType
  - message: string
  - read: boolean
  - data: JSON (optional)
  - createdAt: Date
```

### Provider-Agnostic Architecture

The application is built with a provider-agnostic approach, allowing easy switching between Supabase and Firebase:

1. **Service Abstraction**: All database operations go through `db-provider.ts`
2. **Environment Configuration**: Backend provider can be switched via environment variables
3. **Data Conversion**: Automatic conversion between camelCase (JavaScript) and snake_case (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js (version 16.8.0 or later)
- npm (comes with Node.js)
- Supabase account (optional if using Firebase)
- Gemini API key for AI food analysis

### Installation

#### Option 1: Using the provided scripts (Windows)

1. **Command Prompt**: Run the `install_and_run.cmd` file by double-clicking it.
2. **PowerShell**: Right-click on `run_as_admin.ps1` and select "Run as Administrator".

#### Option 2: Manual installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd food-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_DEFAULT_DB_PROVIDER=supabase # or firebase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
food-tracker/
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── connections/      # User connections pages
│   ├── dashboard/        # Dashboard pages
│   ├── profile/          # Profile pages
│   └── page.tsx          # Home page
├── components/           # Reusable React components
│   ├── FoodImageUploader.tsx  # AI photo analysis component
│   ├── MealDetailModal.tsx    # Detailed meal view component
│   └── ...               # Other components
├── public/               # Static assets
├── services/             # Service modules
│   ├── ai/               # AI service implementations
│   │   └── geminiService.ts # Gemini AI implementation
│   ├── db-provider.ts    # Provider-agnostic database interface
│   ├── firebase.ts       # Firebase implementation
│   ├── supabase.ts       # Supabase implementation
│   ├── foodImageService.ts # Food image analysis service
│   └── ...               # Other services
├── types/                # TypeScript type definitions
│   ├── ai.ts             # AI-related type definitions
│   └── ...               # Other type definitions
└── utils/                # Utility functions
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Next.js team for the amazing framework
- Supabase and Firebase for the backend services
- Google Gemini for the AI vision capabilities
- Tailwind CSS for the styling utilities 