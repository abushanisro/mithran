# MHR Database - User Guide

## Overview
The Machine Hour Rate (MHR) Database is a comprehensive cost calculation system for manufacturing equipment. It provides real-time cost analysis for OEMs and suppliers to make data-driven pricing decisions.

## Features

### 1. **Database List View** (`/mhr-database`)
- View all MHR records in a sortable table
- Search by machine name or description
- Summary cards showing:
  - Total records count
  - Average machine hour rate
  - Total annual cost across all machines
  - Number of unique locations
- Export entire database to CSV
- Create, edit, and delete records

### 2. **Detailed Report View** (`/mhr-database/[id]`)
- Complete cost breakdown matching industry standards
- Sections include:
  - Basic machine information
  - Operating hours analysis
  - Capital investment breakdown
  - Cost of ownership calculations
  - Operating costs (maintenance, electricity)
  - Total machine hour rate
  - Break-even analysis (fixed vs variable costs)
- Print-friendly layout
- Export individual report to CSV

## How to Use

### Step 1: Access the MHR Database
Navigate to the sidebar and click on **"MHR Database"** under the **Database** section.

### Step 2: Create a New MHR Record
1. Click **"New MHR Record"** button
2. Fill in the tabbed form:

#### **Basic Info Tab**
- Machine Name (required)
- Location (required)
- Commodity Code (required)
- Manufacturer, Model, Specification (optional)

#### **Operation Tab**
- Shifts per Day (default: 3)
- Hours per Shift (default: 8)
- Working Days per Year (default: 260)
- Planned Maintenance Hours per Year
- Capacity Utilization Rate (%)

#### **Costs Tab**
- Landed Machine Cost (₹)
- Accessories Cost Percentage (default: 6%)
- Installation Cost Percentage (default: 20%)
- Payback Period (default: 10 years)
- Interest Rate (default: 8%)
- Insurance Rate (default: 1%)
- Maintenance Cost Percentage (default: 6%)

#### **Utilities Tab**
- Machine Footprint (m²)
- Rent per m² per Month (₹)
- Power Consumption (KWH per Hour)
- Electricity Cost per KWH (₹)

#### **Margins Tab**
- Admin Overhead Percentage (default: 0%)
- Profit Margin Percentage (default: 0%)

3. Click **"Create MHR Record"**

### Step 3: View Detailed Report
- Click the Calculator icon (📊) next to any record in the list
- View the complete cost breakdown
- See real-time calculations for all cost components

### Step 4: Export Data
- **Export All**: Click "Export CSV" on the main list page
- **Export Single Report**: Click "Export CSV" on the detail page

## Calculations Performed

The system automatically calculates:

### Working Hours
- **Working Hours per Year** = Shifts × Hours per Shift × Working Days
- **Available Hours** = Working Hours - Maintenance Hours
- **Effective Hours** = Available Hours × (Utilization Rate / 100)

### Capital Investment
- **Accessories Cost** = Landed Cost × (Accessories % / 100)
- **Installation Cost** = Landed Cost × (Installation % / 100)
- **Total Investment** = Landed Cost + Accessories + Installation

### Per Hour Costs
- **Depreciation/hr** = Total Investment ÷ Payback Years ÷ Effective Hours
- **Interest/hr** = (Total Investment × Interest Rate) ÷ Effective Hours
- **Insurance/hr** = (Total Investment × Insurance Rate) ÷ Effective Hours
- **Rent/hr** = (Footprint × Rent/m² × 12) ÷ Effective Hours
- **Maintenance/hr** = (Landed Cost × Maintenance %) ÷ Effective Hours
- **Electricity/hr** = Power (KWH) × Cost per KWH

### Total Machine Hour Rate
1. **Cost of Ownership** = Depreciation + Interest + Insurance + Rent
2. **Operating Cost** = Cost of Ownership + Maintenance + Electricity
3. **With Overhead** = Operating Cost + (Operating Cost × Admin %)
4. **Total MHR** = With Overhead + (With Overhead × Profit %)

### Annual Costs
All per-hour costs are multiplied by effective hours to show annual breakdown.

## Database Migration

Before using the MHR Database, run the migration:

```sql
-- Run this in your Supabase SQL Editor
-- File: backend/src/database/migrations/003_create_mhr_table.sql
```

This creates:
- `mhr_records` table with all necessary fields
- Indexes for optimized queries
- Row Level Security (RLS) policies
- Automatic timestamp updates

## API Endpoints

The system provides RESTful API endpoints:

- `GET /api/v1/mhr` - List all MHR records (with pagination)
- `GET /api/v1/mhr/:id` - Get single MHR record
- `POST /api/v1/mhr` - Create new MHR record
- `PUT /api/v1/mhr/:id` - Update MHR record
- `DELETE /api/v1/mhr/:id` - Delete MHR record

## Best Practices

1. **Accurate Input Data**: The calculations are only as good as the input data. Ensure accurate machine costs, operating parameters, and utility rates.

2. **Regular Updates**: Update MHR records when:
   - Electricity rates change
   - Interest rates change
   - Rent changes
   - Machine utilization rates change

3. **Cross-Functional Use**: Share reports with:
   - Finance team for cost analysis
   - Sales team for pricing decisions
   - Operations team for capacity planning
   - Procurement team for vendor negotiations

4. **Export for Analysis**: Use CSV exports to:
   - Compare multiple machines
   - Analyze cost trends
   - Create custom reports in Excel
   - Share with stakeholders

## Troubleshooting

### Record Not Saving
- Check that all required fields are filled (Machine Name, Location, Commodity Code)
- Ensure numeric values are positive
- Verify Capacity Utilization Rate is between 0-100%

### Calculations Seem Incorrect
- Verify effective hours are calculated correctly
- Check that percentages are entered correctly (e.g., 6 for 6%, not 0.06)
- Ensure Landed Machine Cost is the base value

### Cannot Delete Record
- Ensure you own the record (RLS policies prevent deleting others' records)
- Check if there are any references to this record (future feature)

## Future Enhancements

Planned features:
- Compare multiple machines side-by-side
- Historical cost tracking and trends
- Excel export with formatted templates
- Bulk import from CSV/Excel
- Cost templates for common machine types
- Multi-currency support

## Support

For issues or questions:
- Check the application logs for detailed error messages
- Review the calculation formulas above
- Contact your system administrator
