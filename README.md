# OpenRoad DMS - Dealership Management System

A comprehensive dealership management system built with Next.js 15, Supabase, and TypeScript.

## Features

- **Vehicle Management**: Purchase tracking, maintenance records, sales management
- **HR Management**: Employee profiles, payroll processing, attendance tracking
- **Financial Management**: Expense tracking, financial reporting, budget management
- **User Management**: Role-based access control, authentication, activity logging
- **Reporting**: Comprehensive reports across all modules
- **Data Migration**: Complete JSON-to-Supabase migration system

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI + Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context + Server Components
- **File Storage**: Supabase Storage
- **AI Integration**: Google Gemini AI

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account and project

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Kashyap7116/Openroad_DMS.git
   cd Openroad_DMS
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GOOGLE_API_KEY=your_google_ai_api_key
   ```

4. Set up the database:
   ```bash
   npm run migrate
   ```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## API Endpoints

- `POST /api/migrate` - Run complete data migration
- `GET /api/health` - System health check
- `POST /api/database/test-connection` - Test database connectivity
- `GET /api/database/stats` - Database statistics

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Reusable components
├── hooks/                  # Custom React hooks
├── lib/                    # Core utilities and configurations
├── modules/                # Feature modules (HR, Finance, etc.)
└── types/                  # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.
