# Food Tracker

A comprehensive web application for tracking your daily food intake, monitoring calories, and managing your nutrition goals.

## Features

- **User Authentication**: Secure login and registration system
- **Food Tracking**: Log your daily food intake
- **Calorie Monitoring**: Track your calorie consumption
- **Profile Management**: Set up and manage your personal profile
- **Dashboard**: View your nutrition statistics and progress

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