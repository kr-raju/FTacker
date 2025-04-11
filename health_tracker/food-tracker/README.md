# Food Tracker App

A comprehensive solution for tracking your meals, calories, and health data with AI-powered image analysis.

## Features

- 📱 User-friendly interface for tracking meals
- 📊 Dashboard with daily, weekly, and monthly views
- 📷 Photo-based meal tracking with AI analysis
- 🔄 Support for both Firebase and Supabase as database providers
- 🌐 Cross-platform (Web, Mobile)

## Database Configuration

The app supports two database providers:

1. **Firebase** - The default provider for authentication, database, and storage
2. **Supabase** - Alternative provider with PostgreSQL database

### Switching Database Providers

To change the database provider, edit the `DB_PROVIDER` value in `services/dbConfig.ts`:

```typescript
// Set to 'firebase' or 'supabase'
export const DB_PROVIDER: DbProvider = 'firebase';
```

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication, Firestore, and Storage
3. Copy your Firebase configuration to `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema.sql script in the SQL editor to create tables, indexes, and policies
3. Create a storage bucket named 'food-images'
4. Copy your Supabase configuration to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Gemini API Setup

For the AI-powered image analysis feature:

1. Get a Gemini API key from [ai.google.dev](https://ai.google.dev)
2. Add it to `.env.local`:

```
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Structure

### Collections/Tables

- **users** - User profiles and settings
- **food_entries** - All food/meal entries
- **food_images** - Uploaded food images and AI analysis results
- **food_database** - Common food items database
- **settings** - User application settings

## Architecture

The app uses a unified database service layer that abstracts away the differences between Firebase and Supabase:

- **dbConfig.ts** - Configuration for database providers
- **dbService.ts** - Unified interface for database operations
- **foodService.ts** - Food entry management
- **foodImageService.ts** - Food image upload and analysis
- **geminiService.ts** - AI analysis with Google's Gemini model

This abstraction allows easy switching between providers without changing application code.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (version 16.8.0 or later)
- npm (comes with Node.js)

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

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Development Notes

- The application uses a mock Firebase implementation in development mode
- For production, you'll need to set up a real Firebase project and update the configuration

## Project Structure

```
food-tracker/
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard pages
│   ├── profile/          # Profile pages
│   └── page.tsx          # Home page
├── components/           # Reusable React components
├── public/               # Static assets
├── services/             # Service modules (Firebase, etc.)
├── styles/               # Global styles
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Next.js team for the amazing framework
- Firebase for the backend services
- Tailwind CSS for the styling utilities 