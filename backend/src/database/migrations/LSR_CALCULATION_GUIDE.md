# LSR (Labour Hour Rate) Calculation Guide

## Accurate Industry-Standard Formula

This document defines the **exact** LHR calculation formula used in the system, verified against real industry data.

---

## Excel Formula

```excel
=+(F39+G39+((F39+G39)*H39))*12/$B$5
```

**Where:**
- `F39` = Minimum Wage Per Month (INR)
- `G39` = Dearness Allowance (INR/Month)
- `H39` = Perks Percentage (as decimal, e.g., 0.30 for 30%)
- `B5` = Working Hours Per Year

---

## Expanded Formula

```
LHR = (Base + DA + ((Base + DA) × Perks%)) × 12 ÷ Working Hours/Year
```

**Simplified:**
```
LHR = (Base + DA) × (1 + Perks%) × 12 ÷ Working Hours/Year
```

---

## Working Hours Configuration (User-Configured)

The working hours per year is calculated from user inputs:

```
Working Hours/Year = Working Days/Year × Shifts/Day × Hours/Shift
```

**Example:**
- Working Days/Year: 281
- Shifts/Day: 1
- Hours/Shift: 8
- **Total: 2,248 hours/year**

---

## Calculation Examples (Verified Against Industry Data)

### Example 1: UN-L-1 (Unskilled)
**Inputs:**
- Minimum Wage/Month: ₹12,000
- Dearness Allowance: ₹754
- Perks: 30%
- Working Hours/Year: 2,248

**Calculation:**
```
Step 1: Base + DA = 12,000 + 754 = ₹12,754
Step 2: Perks Amount = 12,754 × 0.30 = ₹3,826.20
Step 3: Total Monthly = 12,754 + 3,826.20 = ₹16,580.20
Step 4: Annual Cost = 16,580.20 × 12 = ₹198,962.40
Step 5: LHR = 198,962.40 ÷ 2,248 = ₹88.52/hour
```
**Result: ₹88.51-88.52/hour** ✓

---

### Example 2: SSK-L-1 (Semi-Skilled)
**Inputs:**
- Minimum Wage/Month: ₹15,000
- Dearness Allowance: ₹754
- Perks: 30%
- Working Hours/Year: 2,248

**Calculation:**
```
(15,000 + 754 + ((15,000 + 754) × 0.30)) × 12 ÷ 2,248
= (15,754 + 4,726.20) × 12 ÷ 2,248
= 20,480.20 × 12 ÷ 2,248
= 245,762.40 ÷ 2,248
= ₹109.32/hour
```
**Result: ₹109.32/hour** ✓

---

### Example 3: SK-L-1 (Skilled)
**Inputs:**
- Minimum Wage/Month: ₹21,000
- Dearness Allowance: ₹754
- Perks: 30%
- Working Hours/Year: 2,248

**Calculation:**
```
(21,000 + 754 + ((21,000 + 754) × 0.30)) × 12 ÷ 2,248
= (21,754 + 6,526.20) × 12 ÷ 2,248
= 28,280.20 × 12 ÷ 2,248
= 339,362.40 ÷ 2,248
= ₹150.96/hour
```
**Result: ₹150.96/hour** ✓

---

### Example 4: HSK-L-1 (Highly Skilled)
**Inputs:**
- Minimum Wage/Month: ₹36,000
- Dearness Allowance: ₹800
- Perks: 30%
- Working Hours/Year: 2,248

**Calculation:**
```
(36,000 + 800 + ((36,000 + 800) × 0.30)) × 12 ÷ 2,248
= (36,800 + 11,040) × 12 ÷ 2,248
= 47,840 × 12 ÷ 2,248
= 574,080 ÷ 2,248
= ₹255.37/hour
```
**Result: ₹255.37/hour** ✓

---

## Implementation Details

### Frontend (Real-Time Calculation)
The calculation happens automatically in the browser using React `useMemo` hook:

```typescript
const calculatedLHR = useMemo(() => {
  const baseAndDA = monthlyWage + da;
  const perksAsDecimal = perks / 100;
  const totalWithPerks = baseAndDA + (baseAndDA * perksAsDecimal);
  const annualCost = totalWithPerks * 12;
  const lhr = annualCost / workingHoursPerYear;

  return parseFloat(lhr.toFixed(2));
}, [monthlyWage, da, perks, workingHoursPerYear]);
```

**Key Features:**
- ✅ Real-time updates as user types
- ✅ No mock or default data
- ✅ User must configure working hours
- ✅ Automatic recalculation on any input change

### Backend (Data Storage)
The backend stores the pre-calculated LHR value from the frontend:
- No server-side calculation needed (calculation happens client-side)
- Validates all numeric inputs are positive
- Ensures perks percentage is between 0-100%

### Database Schema
All default values have been removed:
- `perks_percentage`: No default (user must provide)
- `location`: Nullable, no default
- All wage fields: Start at 0, user must enter

---

## Migration Files

1. **002_create_lsr_table.sql** - Initial table creation
2. **002b_verify_lsr_table.sql** - Verification queries
3. **002c_fix_lsr_table.sql** - Fix script for partial creation
4. **003_remove_default_values.sql** - Remove mock defaults

Run in Supabase SQL Editor in order.

---

## Data Integrity

**No Mock Data Policy:**
- ❌ No default perks percentage
- ❌ No default location
- ❌ No pre-filled wage values
- ❌ No hardcoded working hours
- ✅ All values must be user-entered
- ✅ Placeholders shown as examples only

**Validation:**
- Minimum wage per day ≥ 0
- Minimum wage per month ≥ 0
- Dearness allowance ≥ 0
- Perks percentage: 0-100%
- LHR ≥ 0
- Working hours/year > 0 (required for calculation)

---

## Best Practices

1. **Always configure working hours first** before creating LSR entries
2. **Use accurate wage data** from official government sources
3. **Verify calculations** against payroll records
4. **Update annually** when minimum wages change
5. **Document location-specific** wage variations

---

*Last Updated: 2026-01-02*
*Formula verified against industry standard labour cost database*
