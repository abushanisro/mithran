# LSR Database Guide

## ⚠️ IMPORTANT: Database Setup Required

Before using the LSR module, you **MUST** create the database table in Supabase:

### Quick Setup (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project → **SQL Editor** → **New Query**

2. **Run the Migration**
   - Open file: `backend/src/database/migrations/002_create_lsr_table.sql`
   - Copy **all contents** (including comments)
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for success message

3. **Restart Backend**
   ```bash
   cd backend
   npm run start:dev
   ```

4. **Done!** The LSR module is now ready to use.

**For detailed instructions, see:** `backend/src/database/migrations/README.md`

---

## Overview

The LSR (Labour Skill Rate) Database is a comprehensive system for managing labour costs across different skill levels. It follows the same architecture pattern as the MHR database with clean code practices and industry standards.

## Database Structure

### Entity: LSR
- **id**: Primary key (auto-generated)
- **labourCode**: Unique identifier (e.g., UN-L-1, SSK-L-1)
- **labourType**: Skill classification (Unskilled, Semi-Skilled, Skilled, Highly Skilled)
- **description**: Detailed job responsibilities and tasks
- **minimumWagePerDay**: Daily wage in INR
- **minimumWagePerMonth**: Monthly wage in INR
- **dearnessAllowance**: D.A allowance in INR per month
- **perksPercentage**: Additional perks as percentage (default 30%)
- **lhr**: Labour Hour Rate in INR (calculated)
- **reference**: Source URL for wage data
- **location**: Geographic location (default: India - Bangalore)
- **createdAt**: Timestamp of creation
- **updatedAt**: Timestamp of last update

## Working Hours Configuration

```
Working Days/Year: 281
Shifts/Day: 1
Hours/Shift: 8
Working Hours/Year: 2248
```

## LHR Calculation Formula

```
Total Monthly Wage = Minimum Wage/Month + D.A
Total with Perks = Total Monthly Wage × (1 + Perks% / 100)
LHR = (Total with Perks × 12) / Working Hours per Year
```

## Default Labour Categories

### 1. Unskilled (UN-L-1)
- **Minimum Wage**: ₹400/day (₹12,000/month)
- **D.A**: ₹750/month
- **Perks**: 30%
- **LHR**: ₹88.48/hour
- **Tasks**: Sand mixing, material handling, cleaning, packing, general maintenance

### 2. Semi-Skilled (SSK-L-1)
- **Minimum Wage**: ₹500/day (₹15,000/month)
- **D.A**: ₹754/month
- **Perks**: 30%
- **LHR**: ₹109.32/hour
- **Tasks**: Material inspection, machine operation, quality control, assembly

### 3. Skilled (SK-L-1)
- **Minimum Wage**: ₹700/day (₹21,000/month)
- **D.A**: ₹754/month
- **Perks**: 30%
- **LHR**: ₹150.96/hour
- **Tasks**: CNC programming, pattern making, laser cutting, specialized machining

### 4. Highly Skilled (HSK-L-1)
- **Minimum Wage**: ₹1,200/day (₹36,000/month)
- **D.A**: ₹800/month
- **Perks**: 30%
- **LHR**: ₹255.37/hour
- **Tasks**: Supervisory, production management, engineering

## API Endpoints

### GET /lsr
Get all labour entries (with optional search)
```
Query Parameters:
  - search: string (optional) - Search by code, type, or description
```

### GET /lsr/:id
Get specific labour entry by ID

### GET /lsr/code/:labourCode
Get labour entry by labour code

### POST /lsr
Create new labour entry

### PUT /lsr/:id
Update existing labour entry

### DELETE /lsr/:id
Delete labour entry

### GET /lsr/statistics
Get database statistics

### POST /lsr/bulk
Create multiple labour entries at once

## Frontend Features

### 1. Dashboard View
- Working hours configuration display
- Statistics cards (total entries, average LHR, skill categories)
- Search functionality
- CRUD operations

### 2. Create/Edit Form
- All fields with validation
- Auto-calculate LHR button
- Multi-line description textarea
- Location and reference fields

### 3. Data Table
- Sortable columns
- Truncated descriptions with full text on hover
- Edit and delete actions
- Responsive design

### 4. Sample Data Loader
- One-click sample data import
- 4 pre-configured labour categories
- Based on Indian minimum wage standards

## Usage Examples

### Creating a New Labour Entry
```typescript
const newEntry = {
  labourCode: 'SK-L-2',
  labourType: 'Skilled',
  description: 'Welding specialist with TIG/MIG certification',
  minimumWagePerDay: 750,
  minimumWagePerMonth: 22500,
  dearnessAllowance: 800,
  perksPercentage: 30,
  lhr: 160.50, // Can be auto-calculated
  reference: 'https://www.simpliance.in/minimum-wages',
  location: 'India - Bangalore'
};
```

### Auto-Calculate LHR
The system can automatically calculate LHR based on:
1. Monthly wage
2. Dearness allowance
3. Perks percentage
4. Working hours per year

## Integration with Other Modules

The LSR database can be integrated with:
- **MHR Database**: For complete cost calculations
- **Process Planning**: Labour cost estimation
- **Project Costing**: Total labour requirements
- **Vendor Management**: Labour cost comparisons

## Best Practices

1. **Unique Labour Codes**: Always use unique, descriptive codes (e.g., UN-L-1, SSK-L-1)
2. **Detailed Descriptions**: Include all relevant tasks and responsibilities
3. **Regular Updates**: Update wages according to government notifications
4. **Location Specific**: Maintain separate entries for different locations
5. **Reference Links**: Always include source for wage data

## Data Validation

- Labour code: Required, unique, max 50 characters
- Labour type: Required, max 100 characters
- Description: Required, text field
- Wages: Required, must be >= 0
- Perks: Required, 0-100%
- LHR: Required, must be >= 0

## Security

- All endpoints protected with Supabase authentication
- Input validation using class-validator
- SQL injection prevention via TypeORM
- Unique constraints on labour codes

## Technology Stack

### Backend
- NestJS framework
- **Supabase SDK** for database (not TypeORM)
- PostgreSQL via Supabase
- Class-validator for validation
- Row Level Security (RLS) for data isolation

### Frontend
- Next.js 14 with App Router
- React Query for data fetching
- Shadcn/ui components
- TypeScript for type safety

## Reference

Minimum wage data sourced from: https://www.simpliance.in/minimum-wages
Location: Karnataka, India (Bangalore)
Last Updated: 2024
