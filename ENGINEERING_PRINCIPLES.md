# Engineering Principles & Problem-Solving Approach

**Project:** Mithran - Enterprise Manufacturing Cost Estimation SaaS
**Philosophy:** Long-term, scalable, production-grade solutions only
**Last Updated:** 2026-01-19

---

## Core Principle: Long-Term vs Temporary Solutions

### ❌ NEVER: Temporary Workarounds
```tsx
// WRONG - Silences warning but doesn't fix the problem
<DialogContent aria-describedby={undefined}>

// WRONG - Mock data in production code
const userId = 'temp-user';

// WRONG - Disabling security for convenience
@Public() // Temporarily public for testing
```

### ✅ ALWAYS: Production-Grade Solutions
```tsx
// CORRECT - Proper accessibility implementation
<DialogContent>
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogHeader>
</DialogContent>

// CORRECT - Real authentication
@UseGuards(SupabaseAuthGuard)
async findAll(@CurrentUser('id') userId: string)

// CORRECT - Proper configuration
timeout: process.env.NODE_ENV === 'development' ? 15000 : 30000
```

---

## Problem-Solving Framework

### Step 1: Understand the Root Cause
**DON'T:** Just fix the symptom
**DO:** Ask "Why is this happening?"

**Example:**
- ❌ Warning about missing description → Add `aria-describedby={undefined}`
- ✅ Warning about missing description → Add proper `DialogDescription` component

### Step 2: Evaluate Impact
**Questions to Ask:**
- Is this a temporary fix or permanent solution?
- Will this scale to production with 10,000+ users?
- Does this follow industry standards (2026)?
- Will this cause technical debt?
- Does this maintain security/accessibility/performance?

### Step 3: Choose the Right Approach
**Decision Matrix:**

| Solution Type | When to Use | When NOT to Use |
|--------------|-------------|-----------------|
| **Quick Fix** | Never in production code | - |
| **Temporary Workaround** | Never in committed code | - |
| **Production Solution** | Always | - |

### Step 4: Implement Properly
**Checklist:**
- [ ] Follows enterprise SaaS best practices
- [ ] No mock/test data
- [ ] Proper error handling
- [ ] Security considered
- [ ] Accessibility compliant (WCAG 2.1)
- [ ] Performance optimized
- [ ] Scalable architecture
- [ ] Clean, maintainable code

---

## Specific Examples from Our Codebase

### Example 1: Dialog Accessibility Warning

**Problem:** Console warning about missing description

**❌ Wrong Approach:**
```tsx
// Temporary workaround - just silences warning
<DialogContent aria-describedby={undefined}>
```

**✅ Right Approach:**
```tsx
// Long-term solution - proper accessibility
<DialogContent>
  <DialogHeader>
    <DialogTitle>Add Item</DialogTitle>
    <DialogDescription>
      Configure item details and costs
    </DialogDescription>
  </DialogHeader>
</DialogContent>
```

**Why?**
- WCAG 2.1 compliance required for enterprise SaaS
- Screen reader users need descriptions
- Legal requirement in many jurisdictions
- Shows professional engineering standards

---

### Example 2: API Authentication

**Problem:** 500 errors from backend due to RLS policies

**❌ Wrong Approach:**
```tsx
// Remove user_id filter to bypass RLS
let queryBuilder = supabase
  .from('table')
  .select('*');
// No user_id filter
```

**✅ Right Approach:**
```tsx
// Require proper authentication at controller level
@UseGuards(SupabaseAuthGuard)
async findAll(@CurrentUser('id') userId: string) {
  // Use real user_id with RLS
  return this.service.findAll(userId);
}
```

**Why?**
- Security: Multi-tenant data isolation
- Scalability: Proper user context for all operations
- Compliance: Audit trails and data privacy
- Production-ready: No shortcuts or workarounds

---

### Example 3: API Timeouts

**Problem:** Requests timing out after 5 seconds

**❌ Wrong Approach:**
```tsx
// Just disable timeout
timeout: 999999
```

**✅ Right Approach:**
```tsx
// Reasonable timeout that balances UX and performance
timeout: process.env.NODE_ENV === 'development' ? 15000 : 30000,

// Endpoint-specific overrides for known slow operations
endpointTimeouts: {
  '/calculators/bom-cost': 45000,
  '/reports': 60000,
  '/upload': 120000,
}
```

**Why?**
- User Experience: Fast fail in dev, reasonable wait in prod
- Performance: Identify slow queries that need optimization
- Scalability: Encourages efficient database queries
- Production-ready: Handles real-world scenarios

---

## Code Quality Standards

### No Test/Mock Data in Production
```tsx
// ❌ NEVER
const userId = 'temp-user';
const data = mockData;
@Public() // For testing

// ✅ ALWAYS
const userId = user.id; // Real authenticated user
const data = await fetchFromDatabase(); // Real data
@UseGuards(SupabaseAuthGuard) // Real auth
```

### No Over-Engineering
```tsx
// ❌ Don't add unnecessary abstraction
class UserFactory {
  createUser() { /* complex logic */ }
}

// ✅ Keep it simple
const user = { id, email, name };
```

### Clean, Maintainable Code
- Remove unused imports
- Remove commented-out code
- Remove TODO/FIXME without action items
- Use descriptive variable names
- Follow consistent naming conventions

---

## Security First

### Authentication & Authorization
```tsx
// ✅ ALWAYS require authentication for sensitive endpoints
@UseGuards(SupabaseAuthGuard)
@Controller('sensitive-data')

// ✅ Use Row Level Security (RLS) in database
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

### Input Validation
```tsx
// ✅ Validate all inputs
@IsString()
@IsNotEmpty()
@MaxLength(255)
partName: string;

// ✅ Sanitize database queries
.eq('user_id', userId) // Parameterized, not string concatenation
```

### Secrets Management
```tsx
// ❌ NEVER hardcode secrets
const apiKey = 'sk-1234567890';

// ✅ Use environment variables
const apiKey = process.env.API_KEY;
```

---

## Performance Considerations

### Database Queries
```tsx
// ❌ N+1 queries
for (const item of items) {
  const details = await db.getDetails(item.id);
}

// ✅ Batch queries
const details = await db.getDetailsBatch(items.map(i => i.id));
```

### API Response Times
- **Target:** < 200ms for simple reads
- **Maximum:** < 2s for complex calculations
- **Strategy:** Index optimization, query optimization, caching

### Frontend Performance
- Code splitting for large pages
- Lazy loading for components
- Debounce expensive operations
- Optimize bundle size

---

## Scalability Mindset

### Design for Growth
- **Think:** 10,000 concurrent users, not 10
- **Think:** 1M database rows, not 1K
- **Think:** Multi-region deployment, not single server

### Database Design
```sql
-- ✅ Proper indexes
CREATE INDEX idx_bom_items_user ON bom_items(user_id);
CREATE INDEX idx_bom_items_bom ON bom_items(bom_id);

-- ✅ Efficient queries
SELECT * FROM table WHERE indexed_column = value;
```

### API Design
- Pagination for all list endpoints
- Rate limiting to prevent abuse
- Circuit breakers for external services
- Proper error handling and retries

---

## Industry Standards (2026)

### TypeScript
- **Strict mode** enabled
- **No `any` types** without justification
- **Proper interfaces** for all data structures

### React/Next.js
- **Server Components** by default
- **Client Components** only when needed
- **Proper error boundaries**
- **Loading states** for all async operations

### Backend (NestJS)
- **DTOs** for all requests/responses
- **Proper validation** with class-validator
- **Swagger documentation** for all endpoints
- **Structured logging** with context

### Testing
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Accessibility tests** for all UI components

---

## Documentation Requirements

### Code Comments
```tsx
// ❌ Obvious comments
// Set user name
userName = 'John';

// ✅ Explain WHY, not WHAT
// Use exponential backoff to prevent cascade failures
await retry(fetchData, { maxAttempts: 3, backoff: 'exponential' });
```

### API Documentation
- OpenAPI/Swagger for all endpoints
- Request/response examples
- Error codes and meanings
- Rate limits and quotas

### Architecture Decisions
- Document major architectural choices
- Explain trade-offs considered
- Record alternatives rejected and why

---

## Review Checklist

### Before Every Commit
- [ ] No temporary fixes or workarounds
- [ ] No test/mock data
- [ ] Proper authentication/authorization
- [ ] Input validation implemented
- [ ] Error handling complete
- [ ] Accessibility compliant
- [ ] Performance considered
- [ ] Security reviewed
- [ ] Code is clean and maintainable
- [ ] Documentation updated

### Before Every PR
- [ ] All console warnings resolved
- [ ] All tests passing
- [ ] Lighthouse score > 90
- [ ] No security vulnerabilities
- [ ] Code reviewed by senior engineer
- [ ] Breaking changes documented

---

## When in Doubt

### Ask These Questions:
1. **Is this production-ready?**
   - Would I deploy this to 10,000 paying customers?

2. **Is this secure?**
   - Could an attacker exploit this?

3. **Is this scalable?**
   - Will this work with 1M database rows?

4. **Is this maintainable?**
   - Will another engineer understand this in 6 months?

5. **Is this accessible?**
   - Can all users, including those with disabilities, use this?

6. **Is this the industry standard?**
   - Would a principal engineer at Google/Meta/Amazon approve this?

If the answer to any question is "No" or "Maybe", **redesign the solution**.

---

## Remember

> **"We don't write code for today. We write code for production, for scale, for the next 5 years."**

**Every line of code should be:**
- Production-ready
- Secure by default
- Scalable from day one
- Accessible to all users
- Maintainable long-term
- Following 2026 industry best practices

**No shortcuts. No workarounds. No technical debt.**

---

**This is our standard. This is our commitment to excellence.**
