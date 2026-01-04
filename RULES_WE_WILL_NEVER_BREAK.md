# 🚨 RULES WE WILL NEVER BREAK AGAIN

## Enterprise Calculator System - Iron-Clad Rules

Last Updated: 2026-01-04
Version: 2.0.0
Author: Principal Software Engineer Team

---

## 📜 The 10 Commandments

### 1️⃣ DATABASE IS THE ONLY SOURCE OF TRUTH

**Rule**: React state is a cache, not authoritative.

```typescript
// ❌ FORBIDDEN
const [calculator, setCalculator] = useState(localStorageData) // WRONG!

// ✅ REQUIRED
const { data: calculator } = useQuery(['calculator', id], fetchFromDB)
```

**Why**: Local state can drift. Database is always consistent.

**Penalty**: If violated, data corruption guaranteed within 1 hour.

---

### 2️⃣ ATOMIC SAVES ONLY - NO PARTIAL UPDATES

**Rule**: One Save button saves everything or nothing.

```typescript
// ❌ FORBIDDEN
await saveField(field)     // Separate call
await saveFormula(formula) // Another call

// ✅ REQUIRED
await saveCalculator({
  ...calculator,
  fields: [...],
  formulas: [...]
}) // One atomic call
```

**Why**: Partial saves create orphaned data and race conditions.

**Penalty**: Data inconsistency, user confusion, debugging hell.

---

### 3️⃣ NO `any` TYPES - STRICT TYPESCRIPT

**Rule**: Every variable, parameter, return type must be explicitly typed.

```typescript
// ❌ FORBIDDEN
function saveData(data: any) { ... }
const result: any = await fetch(...)

// ✅ REQUIRED
function saveData(data: Calculator): Promise<Calculator> { ... }
const result: Calculator = await fetch(...)
```

**Why**: `any` defeats TypeScript's purpose. Runtime errors sneak in.

**Penalty**: Production bugs that could have been caught at compile time.

---

### 4️⃣ NO OPTIONAL CHAINING TO HIDE BUGS

**Rule**: Optional chaining (`?.`) only for truly optional data.

```typescript
// ❌ FORBIDDEN - Hides bugs
<div>{calculator?.name}</div>

// ✅ REQUIRED - Explicit handling
if (!calculator) return <LoadingState />
return <div>{calculator.name}</div>
```

**Why**: `?.` masks null/undefined bugs. Fail fast, fail loudly.

**Penalty**: Silent failures, white screens, confused users.

---

### 5️⃣ HANDLE ALL STATES EXPLICITLY

**Rule**: Every async operation must handle: loading, error, empty, success.

```typescript
// ❌ FORBIDDEN
return <div>{calculator.name}</div> // What if loading? Error?

// ✅ REQUIRED
if (isLoading) return <LoadingSkeleton />
if (error) return <ErrorMessage error={error} />
if (!calculator) return <NotFound />
if (calculator.fields.length === 0) return <EmptyState />
return <CalculatorView calculator={calculator} />
```

**Why**: Users deserve clear feedback, not blank screens.

**Penalty**: Poor UX, users think app is broken.

---

### 6️⃣ SINGLE RESPONSIBILITY - COMPONENTS DO ONE THING

**Rule**: Each component has one clear purpose.

```typescript
// ❌ FORBIDDEN
function CalculatorEverything() {
  // Handles: fetching, editing, saving, displaying, deleting
  return <div>1000 lines of spaghetti</div>
}

// ✅ REQUIRED
function CalculatorBuilder() {
  // Only orchestrates
  return (
    <>
      <BasicInfoSection />
      <FieldsSection />
      <FormulasSection />
    </>
  )
}
```

**Why**: Maintainability, testability, clarity.

**Penalty**: Unmaintainable codebase, fear of changing anything.

---

### 7️⃣ PROPS ARE CONTRACTS - STRICT INTERFACES

**Rule**: Every prop must have a TypeScript interface.

```typescript
// ❌ FORBIDDEN
function Field({ data }) { ... } // What is data?

// ✅ REQUIRED
interface FieldProps {
  field: CalculatorField;
  onChange: (field: CalculatorField) => void;
  onDelete: (id: string) => void;
}

function Field({ field, onChange, onDelete }: FieldProps) { ... }
```

**Why**: Self-documenting code, compiler-enforced contracts.

**Penalty**: Runtime errors, confusion about what props mean.

---

### 8️⃣ OPTIMISTIC UPDATES MUST ROLLBACK ON ERROR

**Rule**: If optimistic update fails, restore previous state.

```typescript
// ❌ FORBIDDEN
onMutate: () => {
  queryClient.setQueryData(newData) // No rollback!
}

// ✅ REQUIRED
onMutate: () => {
  const previous = queryClient.getQueryData(...)
  queryClient.setQueryData(newData)
  return { previous }
},
onError: (err, vars, context) => {
  queryClient.setQueryData(context.previous) // Rollback
}
```

**Why**: Failed mutations shouldn't leave UI in invalid state.

**Penalty**: UI shows saved data that doesn't exist in DB.

---

### 9️⃣ REFETCH AFTER MUTATION - NEVER TRUST CLIENT STATE

**Rule**: After save, invalidate cache and refetch from DB.

```typescript
// ❌ FORBIDDEN
onSuccess: (newData) => {
  setCalculator(newData) // Trust response only
}

// ✅ REQUIRED
onSuccess: () => {
  queryClient.invalidateQueries(['calculator', id]) // Refetch
}
```

**Why**: Server may transform data (timestamps, IDs, computed fields).

**Penalty**: Stale UI state that doesn't match DB.

---

### 🔟 NO PROP DRILLING > 2 LEVELS - USE COMPOSITION

**Rule**: If passing props > 2 levels deep, refactor.

```typescript
// ❌ FORBIDDEN
<Parent>
  <Child1 calculator={calculator}>
    <Child2 calculator={calculator}>
      <Child3 calculator={calculator}>
        <Child4 calculator={calculator}> // 4 levels!
```

// ✅ REQUIRED
<Parent>
  <CalculatorProvider value={calculator}>
    <Child1 />  // Gets from context
    <Child2 />  // Gets from context
  </CalculatorProvider>
</Parent>
```

**Why**: Prop drilling creates brittle, hard-to-refactor code.

**Penalty**: Fear of changing component tree, coupling nightmare.

---

## 🎯 Quick Reference Cheat Sheet

| Situation | ❌ WRONG | ✅ RIGHT |
|-----------|---------|---------|
| **Saving** | Multiple API calls | One atomic call |
| **State** | Split across files | Single source |
| **Types** | `any` | Explicit types |
| **Null checks** | `calculator?.name` | `if (!calculator) return` |
| **Async** | No loading state | Handle all states |
| **Components** | Do everything | Single responsibility |
| **Props** | Untyped | Strict interfaces |
| **Mutations** | No rollback | Rollback on error |
| **After save** | Trust client | Refetch from DB |
| **Passing data** | Prop drill 4+ levels | Context/composition |

---

## 🚦 Code Review Checklist

Before merging ANY calculator-related code, verify:

- [ ] Database is source of truth (no local state as authority)
- [ ] Saves are atomic (no partial updates)
- [ ] No `any` types
- [ ] No optional chaining on required data
- [ ] All async states handled (loading, error, empty, success)
- [ ] Components have single responsibility
- [ ] Props have TypeScript interfaces
- [ ] Mutations have rollback on error
- [ ] Cache invalidated after mutation
- [ ] No prop drilling > 2 levels

**If ANY checkbox is unchecked, DO NOT MERGE.**

---

## 📚 Study These Examples

### Example 1: Atomic Save
```typescript
// ✅ CORRECT
const handleSave = async () => {
  await updateCalculator({
    id,
    data: {
      name,
      fields: allFields,      // ALL fields
      formulas: allFormulas   // ALL formulas
    }
  })
  // Single transaction, all or nothing
}
```

### Example 2: Explicit State Handling
```typescript
// ✅ CORRECT
function Calculator({ id }: Props) {
  const { data, isLoading, error } = useCalculator(id)

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorAlert error={error} />
  if (!data) return <NotFound />
  if (data.fields.length === 0) return <EmptyState />

  // TypeScript KNOWS data exists here
  return <CalculatorForm data={data} />
}
```

### Example 3: Strict Types
```typescript
// ✅ CORRECT
interface Calculator {
  id: string;
  name: string;
  fields: CalculatorField[];  // Not optional
  formulas: CalculatorFormula[];
}

function save(calc: Calculator): Promise<Calculator> {
  // Not Promise<any>, not Promise<void>
  return api.put(`/calculators/${calc.id}`, calc)
}
```

---

## 🎓 Learning Path

For new developers joining the project:

1. Read `FRONTEND_ARCHITECTURE.md`
2. Read `SAVE_FLOW_DIAGRAM.md`
3. Read this document
4. Review `CalculatorBuilderV2.tsx` (reference implementation)
5. Review `calculators-v2.service.ts` (backend reference)
6. Write a calculator feature following these rules
7. Have it reviewed by senior engineer

---

## 🏆 Success Criteria

We know we're following these rules when:

- ✅ Zero "undefined is not an object" errors in production
- ✅ Zero data inconsistency bugs
- ✅ Zero complaints about "changes not saving"
- ✅ Zero debates about "where does this state live?"
- ✅ New features take hours, not days
- ✅ Confident in refactoring (types catch breaks)
- ✅ Code reviews focus on business logic, not architecture
- ✅ Onboarding new devs takes 1 day, not 1 week

---

## 📞 Questions?

If you're unsure about ANY of these rules, ask:

1. Check this document first
2. Check `FRONTEND_ARCHITECTURE.md`
3. Ask in #engineering-best-practices Slack
4. Tag @principal-engineer for clarification

**DO NOT**:
- Assume the rule doesn't apply to your case
- Think "this one time it's okay to break it"
- Skip the rule because you're in a hurry

**These rules exist because we learned the hard way.**

---

## 🔄 This Document is Law

- Version controlled in Git
- Reviewed quarterly
- Updated only with team consensus
- Violations are PR review blockers

**Last Review Date**: 2026-01-04
**Next Review Date**: 2026-04-04
