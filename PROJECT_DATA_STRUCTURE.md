# Openroad DMS - Project Data & File Saving Structure

## 📊 Overview

Your Openroad_DMS is a comprehensive dealership management system with modular architecture for managing HR, Finance, Sales, Vehicles, and Administration.

## 🗂️ Project Structure

### 📁 Root Level Configuration

```
├── .env.local              # Environment variables (DB, API keys, secrets)
├── package.json           # Dependencies and scripts
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── components.json        # Shadcn/ui components configuration
├── .gitignore            # Git ignore rules
└── README.md             # Project documentation
```

### 📁 Source Code Structure (`/src/`)

```
src/
├── middleware.ts          # Route protection & authentication
├── app/                   # Next.js App Router pages
├── modules/              # ✨ NEW: Modular business logic
├── components/           # Remaining shared components
├── hooks/               # React hooks
├── context/             # React contexts
├── config/              # Configuration files
└── lib/                 # Legacy utilities (some moved to modules)
```

### 🏗️ Modular Architecture (`/src/modules/`)

```
modules/
├── auth/                # 🔐 Authentication & Authorization
│   ├── components/      # RBAC guards, auth UI
│   └── services/        # Auth actions, profile, RBAC utils
├── hr/                  # 👥 Human Resources
│   ├── components/      # Employee dialogs, HR UI
│   ├── forms/           # Employee forms, attendance
│   └── services/        # HR actions, payroll logic
├── finance/             # 💰 Financial Management
│   ├── components/      # Finance UI components
│   ├── forms/           # Finance forms
│   └── services/        # Finance actions & DB operations
├── admin/               # 🛡️ Administration
│   ├── components/      # Audit dashboard, performance monitor
│   └── services/        # Admin actions, audit, alerts
├── sales/               # 🚗 Sales Management
│   ├── components/      # Commission forms
│   ├── forms/           # Sale forms
│   └── services/        # Sales actions
├── vehicles/            # 🚙 Vehicle Management
│   ├── components/      # Vehicle UI
│   ├── forms/           # Purchase forms
│   └── services/        # Vehicle actions & DB
└── shared/              # 🔄 Shared Resources
    ├── components/      # Layout, headers, reports, UI
    ├── services/        # Shared services
    └── utils/           # Common utilities, security
```

## 💾 Data Storage Structure

### 📊 Database Layer (`/database/`)

```
database/
├── hr/                  # HR Data Storage
│   ├── employees/       # Individual employee JSON files
│   │   ├── IN-0001.json # Employee records by nationality code
│   │   └── TH-0001.json
│   ├── attendance_data/ # Monthly attendance files
│   ├── payroll_data/    # Payroll by month/employee
│   │   ├── 082025/      # August 2025
│   │   │   ├── IN-0001.json
│   │   │   └── TH-0001.json
│   │   └── 092025/      # September 2025
│   └── holidays/        # Annual holiday files
├── finance/
│   └── employee_adjustments.json
├── purchase/
│   └── vehicles.json
└── vehicles/            # Vehicle records by ID
    ├── HR30MT1254.json
    └── [vehicle-id].json
```

### 📁 File Upload Storage (`/public/uploads/`)

```
public/uploads/
├── hr/employees/        # Employee documents
│   ├── IN-0001/        # Employee ID folders
│   │   ├── photo/      # Profile photos
│   │   ├── id_proof/   # ID documents
│   │   ├── address_proof/
│   │   ├── education_cert/
│   │   └── professional_cert/
│   └── TH-0001/
├── logo/               # Company logos
├── profile_pictures/   # User profile images
└── vehicles/          # Vehicle documentation
    ├── HR16AC2860/    # Vehicle ID folders
    │   ├── vehicle_images/
    │   ├── insurance_tax/
    │   ├── maintenance_doc/
    │   ├── sales_doc/
    │   ├── buyer_ID/
    │   ├── seller_ID/
    │   ├── freelancer_ID/
    │   ├── income_doc/
    │   └── expense_doc/
    └── HR16AD2820/
```

## 🔧 Key Data Management Features

### 📝 Employee ID Generation

- **Format**: `{COUNTRY_CODE}-{NUMBER}` (e.g., `IN-0001`, `TH-0002`)
- **Auto-increment**: Based on nationality
- **File naming**: Uses sanitized employee ID

### 📄 File Organization

```javascript
// Employee data structure example
{
  "employee_id": "IN-0001",
  "personal_info": {
    "name": "John Doe",
    "nationality": "India"
  },
  "job_details": {
    "status": "Active"
  },
  "documents": {
    "photo": "/uploads/hr/employees/IN-0001/photo/[timestamp]-[filename].jpg",
    "id_proof": "/uploads/hr/employees/IN-0001/id_proof/[timestamp]-[filename].jpg"
  }
}
```

### 🔒 Security Features

- **Path validation**: Prevents directory traversal
- **File sanitization**: Sanitizes uploaded filenames
- **Employee ID validation**: Regex-based validation
- **Role-based access**: RBAC implementation

## 📊 Data Flow Architecture

### 📥 Data Input Flow

```
User Interface → Form Validation → Service Layer → Database/File Storage
```

### 📤 Data Output Flow

```
Database/File Storage → Service Layer → Component Layer → User Interface
```

### 🔄 Module Interactions

```
Auth Module ←→ All Modules (for authentication)
HR Module ←→ Finance Module (for employee finance data)
Vehicles Module ←→ Sales Module (for vehicle sales)
Shared Services ←→ All Modules (for common functionality)
```

## 🎯 Key Benefits of Current Structure

### ✅ **Scalability**

- Modular architecture allows easy expansion
- Each module can be developed independently
- Clear separation of concerns

### ✅ **Data Integrity**

- Consistent file naming conventions
- Proper validation at service layer
- Secure file handling

### ✅ **Maintainability**

- Organized by business domain
- Clear data flow patterns
- Consistent service interfaces

### ✅ **Security**

- Path traversal prevention
- File upload security
- Role-based access control

## 📋 File Naming Conventions

### Employee Files

- **Employee Records**: `{EMPLOYEE_ID}.json`
- **Uploaded Documents**: `{TIMESTAMP}-{SANITIZED_FILENAME}.{EXT}`
- **Payroll Data**: `{MMYYYY}/{EMPLOYEE_ID}.json`

### Vehicle Files

- **Vehicle Records**: `{VEHICLE_ID}.json`
- **Vehicle Documents**: `{TIMESTAMP}-{SANITIZED_FILENAME}.{EXT}`

### Attendance Data

- **Monthly Files**: `{MMYYYY}.json`

This structure provides a robust, scalable, and secure foundation for your dealership management system with clear data organization and proper file management practices.
