# Openroad DMS - Vehicle Dealership Management System

A comprehensive dealership management system built with Next.js, TypeScript, and Supabase.

## 🚗 Features

- **Vehicle Management**: Complete inventory tracking and management
- **Sales Management**: Handle vehicle sales, commissions, and customer records
- **Purchase Management**: Track vehicle purchases and vendor relationships
- **HR Management**: Employee records, attendance, payroll, and document management
- **Finance Management**: Financial tracking, reports, and employee adjustments
- **Maintenance Tracking**: Vehicle maintenance schedules and records
- **Reporting System**: Comprehensive reports across all modules
- **Alert System**: Automated alerts for important events and deadlines
- **Role-Based Access Control**: Secure access control with user roles and permissions
- **Multi-language Support**: Support for multiple languages including Thai and English

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Hooks
- **File Upload**: Custom file handling
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/openroad-dms.git
cd openroad-dms
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Set up the database:
```bash
# Run the database setup scripts in your Supabase SQL editor
# Files are located in /database/ folder
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions and actions
│   ├── hooks/               # Custom React hooks
│   └── context/             # React context providers
├── database/                # Database schemas and migrations
├── public/                  # Static assets
└── docs/                    # Documentation
```

## 🔑 Key Modules

### Dashboard
- Overview of all system metrics
- Quick access to important functions
- Real-time alerts and notifications

### Vehicle Management
- Add/edit vehicle information
- Track vehicle status and history
- Document management

### HR Management
- Employee records and profiles
- Attendance tracking
- Payroll management
- Document uploads

### Finance
- Financial reporting
- Employee adjustments
- Commission tracking

### Reports
- Comprehensive reporting system
- Export capabilities
- Custom report generation

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, email support@openroad-thailand.com or create an issue in this repository.

## 🏢 About Openroad Thailand

Openroad Thailand is a premier vehicle dealership management company providing comprehensive solutions for automotive businesses across Thailand.
