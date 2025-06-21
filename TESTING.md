# Testing Strategy for BillAI

This document outlines the comprehensive testing strategy implemented for the BillAI application to prevent errors and ensure reliability.

## Testing Stack

### Unit & Integration Testing
- **Jest** - JavaScript testing framework
- **React Testing Library** - Testing utilities for React components
- **@testing-library/jest-dom** - Custom Jest matchers for DOM elements

### End-to-End Testing
- **Playwright** - Cross-browser E2E testing
- **Multi-browser support** - Chrome, Firefox, Safari, Mobile viewports

## Test Categories

### 1. Unit Tests
Located in `src/**/__tests__/` directories

**Component Tests:**
- `src/components/ui/__tests__/button.test.tsx` - Button component variations and interactions
- `src/components/auth/__tests__/login-form.test.tsx` - Authentication form validation and submission

**Utility Tests:**
- `src/lib/__tests__/utils.test.ts` - Utility functions like `cn()` class merging

### 2. Integration Tests
Tests that verify multiple components/services working together:
- Database operations with Supabase
- API route handlers
- Authentication flows
- Bill management operations

### 3. End-to-End Tests
Located in `e2e/` directory

**Authentication Flow:**
- `e2e/auth.spec.ts` - Login, signup, validation, error handling

**Dashboard Flow:**
- `e2e/dashboard.spec.ts` - Protected routes, user menu, bill management

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests
```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Next.js integration with `next/jest`
- TypeScript support
- Module path mapping (`@/` aliases)
- Coverage reporting
- Test environment setup

### Jest Setup (`jest.setup.js`)
- Jest DOM matchers
- Next.js router mocking
- Supabase client mocking
- Global fetch mocking
- Console warnings suppression

### Playwright Configuration (`playwright.config.ts`)
- Multi-browser testing
- Mobile viewport testing
- Automatic server startup
- Screenshot/video on failure
- HTML, JSON, and JUnit reporting

## Mocking Strategy

### Supabase Mocking
```typescript
// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      // ... other database operations
    })),
  })),
}))
```

### Next.js Router Mocking
```typescript
// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
```

## Test Data & Fixtures

### Mock Data (`src/test-utils/index.tsx`)
Pre-defined mock objects for:
- Users and sessions
- Bill templates and instances
- Supabase responses
- Common test scenarios

```typescript
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  // ... other user properties
}

export const mockBillTemplate = {
  id: 'test-template-id',
  title: 'Test Bill',
  amount: 100.00,
  // ... other template properties
}
```

## Coverage Goals

### Current Coverage Targets
- **Unit Tests**: 80%+ line coverage
- **Component Tests**: All interactive components
- **Integration Tests**: Critical user flows
- **E2E Tests**: Primary user journeys

### Areas of Focus
1. **Authentication** - Login, signup, session management
2. **Bill Management** - CRUD operations, validation
3. **RRULE Processing** - Recurring bill logic
4. **AI Analytics** - Spending pattern analysis
5. **Database Operations** - Supabase integration
6. **Error Handling** - Graceful error states

## Continuous Integration

### GitHub Actions (Future)
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:coverage
  
- name: Run E2E Tests
  run: npm run test:e2e
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Best Practices

### Writing Tests
1. **Arrange, Act, Assert** pattern
2. **Descriptive test names** - "should validate email format"
3. **One assertion per test** when possible
4. **Mock external dependencies** - Supabase, APIs
5. **Test user interactions** - clicks, form submissions
6. **Test error states** - network failures, validation errors

### Component Testing
```typescript
// Good: Test user interactions
it('should show error message on invalid login', async () => {
  render(<LoginForm />)
  
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'invalid-email' }
  })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })
})
```

### E2E Testing
```typescript
// Good: Test complete user flows
test('should complete signup flow', async ({ page }) => {
  await page.goto('/auth')
  await page.getByText(/sign up/i).click()
  
  await page.getByLabel(/email/i).fill('test@example.com')
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /create account/i }).click()
  
  await expect(page.getByText(/check your email/i)).toBeVisible()
})
```

## Testing Checklist

### Before Each Release
- [ ] All unit tests pass
- [ ] E2E tests pass on all browsers
- [ ] Coverage meets minimum thresholds
- [ ] No test warnings or errors
- [ ] Mock data matches production data structures
- [ ] Performance tests within acceptable ranges

### When Adding New Features
- [ ] Write tests first (TDD approach)
- [ ] Test happy path and error cases
- [ ] Add E2E tests for new user flows
- [ ] Update mock data if needed
- [ ] Verify existing tests still pass

## Debugging Tests

### Common Issues
1. **Async/Await** - Use `waitFor()` for async operations
2. **Component Mounting** - Ensure proper setup/teardown
3. **Mock Data** - Verify mock responses match real API
4. **Browser Differences** - Test across different browsers
5. **Timing Issues** - Add appropriate waits in E2E tests

### Debugging Commands
```bash
# Debug single test
npm run test -- --verbose button.test.tsx

# Debug E2E test with browser
npm run test:e2e:ui -- --debug

# Run tests with more output
npm run test -- --verbose --no-cache
```

This comprehensive testing strategy ensures that the BillAI application maintains high quality and reliability while preventing regressions and errors in production. 