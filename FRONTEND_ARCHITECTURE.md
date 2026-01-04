# Frontend Architecture - Calculator System V2

## 🎯 Core Principles

### 1. **Single Source of Truth**
- Database is the ONLY source of truth
- React state is a LOCAL CACHE, not authoritative
- Always refetch after mutations

### 2. **Atomic State Management**
```typescript
// ❌ WRONG - Split state
const [calculator, setCalculator] = useState()
const [fields, setFields] = useState([])
const [formulas, setFormulas] = useState([])

// ✅ CORRECT - Unified state
const [calculatorData, setCalculatorData] = useState<CalculatorWithRelations>({
  id: '',
  name: '',
  fields: [],
  formulas: [],
  // ... all properties together
})
```

### 3. **No Partial Saves**
```typescript
// ❌ WRONG - Separate save calls
await saveCalculator(metadata)
await saveFields(fields)  // ← What if this fails?
await saveFormulas(formulas)

// ✅ CORRECT - Single atomic save
await saveCalculator({
  ...metadata,
  fields,
  formulas
})
```

### 4. **Defensive Rendering**
```typescript
// ❌ WRONG - Optional chaining hides bugs
{calculator?.fields?.map(...)}

// ✅ CORRECT - Explicit checks with fallbacks
{!calculator ? (
  <LoadingState />
) : calculator.fields.length === 0 ? (
  <EmptyState />
) : (
  calculator.fields.map(...)
)}
```

---

## 📦 State Ownership Model

### Component Hierarchy
```
CalculatorBuilderPage (Server Component)
  ↓
CalculatorBuilder (Client Component) ← STATE OWNER
  ├── BasicInfoSection (Presentational)
  ├── FieldsSection (Presentational)
  └── FormulasSection (Presentational)
```

### State Lives Where?

| Data | Owner | Why |
|------|-------|-----|
| `calculator` (full object) | `CalculatorBuilder` | Parent component, passed down |
| `editMode` | `CalculatorBuilder` | Controls entire form state |
| `isSaving` | `CalculatorBuilder` | Global loading state |
| Field form inputs | `FieldsSection` | Transient UI state, not persisted |
| Formula form inputs | `FormulasSection` | Transient UI state, not persisted |

---

## 🔄 Data Flow

### READ Flow
```
User opens page
  ↓
Server Component fetches from API
  ↓
Props passed to Client Component
  ↓
React Query caches response
  ↓
UI renders with data
```

### WRITE Flow (Atomic Save)
```
User edits form
  ↓
Local state updated (NOT saved yet)
  ↓
User clicks "Save" button
  ↓
Validate entire form
  ↓
Single API call with ALL data
  ↓
Backend transaction commits
  ↓
Optimistic UI update
  ↓
Refetch to confirm
  ↓
UI reflects database state
```

---

## 🚫 Anti-Patterns to NEVER Use

### 1. **Split Mutations**
```typescript
// ❌ NEVER DO THIS
const saveField = async (field) => {
  await api.createField(field)  // ← Creates orphan if calculator save fails
}

// ✅ ALWAYS DO THIS
const saveCalculator = async () => {
  await api.updateCalculator({
    ...calculator,
    fields: [...fields, newField]  // ← Atomic
  })
}
```

### 2. **Derived State**
```typescript
// ❌ WRONG - Stale state risk
const [fields, setFields] = useState([])
const fieldsCount = fields.length  // ← Can be out of sync

// ✅ CORRECT - Compute on demand
const fieldsCount = calculator.fields.length
```

### 3. **Prop Drilling Without Contracts**
```typescript
// ❌ WRONG - No type safety
<FieldManager fields={fields} />

// ✅ CORRECT - Strict contract
<FieldManager
  fields={calculator.fields}
  onFieldsChange={(newFields) => {
    setCalculator(prev => ({ ...prev, fields: newFields }))
  }}
/>
```

---

## 🎨 Component Patterns

### Pattern 1: Controlled Components
```typescript
// Field is controlled by parent
function FieldForm({ field, onChange }: FieldFormProps) {
  return (
    <Input
      value={field.displayLabel}
      onChange={(e) => onChange({ ...field, displayLabel: e.target.value })}
    />
  )
}
```

### Pattern 2: Optimistic Updates
```typescript
const saveCalculator = useMutation({
  mutationFn: api.updateCalculator,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['calculator', id])

    // Snapshot previous value
    const previous = queryClient.getQueryData(['calculator', id])

    // Optimistically update
    queryClient.setQueryData(['calculator', id], newData)

    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['calculator', id], context.previous)
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries(['calculator', id])
  }
})
```

### Pattern 3: Loading States
```typescript
function CalculatorBuilder({ calculatorId }: Props) {
  const { data: calculator, isLoading, error } = useCalculator(calculatorId)

  // Explicit state handling
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorBoundary error={error} />
  if (!calculator) return <NotFound />

  // Now TypeScript KNOWS calculator exists
  return <CalculatorForm calculator={calculator} />
}
```

---

## 🔐 Type Safety Rules

### Rule 1: No `any`
```typescript
// ❌ WRONG
const handleChange = (data: any) => { ... }

// ✅ CORRECT
const handleChange = (data: Calculator) => { ... }
```

### Rule 2: No Optional Chaining for Required Data
```typescript
// ❌ WRONG - Hides bugs
const name = calculator?.name ?? 'Unknown'

// ✅ CORRECT - Fail fast
if (!calculator) throw new Error('Calculator is required')
const name = calculator.name
```

### Rule 3: Strict Null Checks
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## 📋 Checklist Before Committing

- [ ] All state lives in one place
- [ ] No partial saves
- [ ] No `any` types
- [ ] No optional chaining on required data
- [ ] Loading states handled explicitly
- [ ] Error states handled explicitly
- [ ] Empty states handled explicitly
- [ ] Backend returns complete object
- [ ] Frontend refetches after mutation
- [ ] Optimistic updates have rollback

---

## 🎯 Rules We Will NEVER Break Again

1. **Database is source of truth** - React state is cache
2. **Atomic saves only** - No field/formula independent saves
3. **Type everything strictly** - No `any`, no optional chaining abuse
4. **Handle all states** - Loading, error, empty explicitly
5. **Single responsibility** - Components do ONE thing well
6. **Props are contracts** - Strict TypeScript interfaces
7. **Optimistic updates must rollback** - Always handle errors
8. **Refetch after mutation** - Never trust client state
9. **No prop drilling > 2 levels** - Use composition or context
10. **Test the sad path** - Error handling is not optional
