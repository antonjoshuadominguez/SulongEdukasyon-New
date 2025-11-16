# Filipino Educational Gaming Platform

A dynamic, gamified educational platform designed to revolutionize learning for Filipino students through interactive, culturally-relevant multiplayer experiences.

## Features

- Multiple interactive game types:
  - Picture Puzzle
  - Picture Matching
  - Guess Drawing
  - True or False
  - Fill in the Blanks
  - Explain Image
  - Arrange Timeline
  - Tama ang Ayos (Correct Order)
- Teacher dashboard for creating and managing game lobbies
- Student interface for joining and participating in games
- Real-time multiplayer interactions using WebSockets
- Leaderboards and score tracking
- Filipino cultural and historical content
- Full localization support (English/Filipino)

## Tech Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS with Shadcn UI components
- **Backend**: Express.js with WebSockets
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Real-time**: WebSockets for multiplayer games
- **Deployment**: Supports local development and Supabase integration

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and update with your Supabase credentials
3. Install dependencies: `npm install`
4. Push database schema: `npm run db:push`
5. Start the development server: `npm run dev`
6. Open http://localhost:5000 in your browser

## Project Structure

```
project-root/
├── client/              # Frontend React code
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   └── App.tsx      # Main application component
├── server/              # Backend Express code
│   ├── auth.ts          # Authentication setup
│   ├── db.ts            # Database connection
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
│   └── vite.ts          # Vite server integration
├── shared/              # Shared code between client and server
│   └── schema.ts        # Database schema and types
└── scripts/             # Utility scripts
    ├── db-push.ts       # Database migration script
    └── load-env.ts      # Environment variable loader
```

## License

MIT