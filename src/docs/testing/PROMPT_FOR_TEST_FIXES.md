# Prompt for Fixing All Test Failures

**Use this prompt in a new chat to fix all remaining test failures:**

---

## 🎯 **TASK: Fix All Failing Tests**

I need you to fix all failing tests in my ERP system. Here's the complete context:

### **Current Status:**
- **Total Tests:** 58
- **Passing:** 29 (50%)
- **Failing:** 29 (50%)

### **Test Failure Documentation:**
All test failures are documented in: `docs/TEST_FAILURES_DOCUMENTATION.md`

### **Key Information:**

1. **Database Connection:**
   - **Connection String:** `postgresql://postgres:admin@localhost:5432/buildflow_db`
   - **Database:** buildflow_db
   - **User:** postgres
   - **Password:** admin

2. **Test Infrastructure:**
   - Test helpers: `server/__tests__/helpers/testHelpers.js`
   - Mock auth: `server/__tests__/helpers/mockAuth.js`
   - Tests use dynamic database creation per test suite
   - Each test creates a unique agency database with full schema

3. **Recently Implemented Features:**
   - SSO (OAuth 2.0, SAML 2.0)
   - Password Policy Enforcement
   - Database Optimization Service
   - API Key Management
   - Advanced Session Management
   - All have database schemas that need to be included in test setup

### **Test Suites Status:**

#### ✅ **Fully Passing:**
- Encryption Service: 9/9 (100%)
- Cache Service: 7/7 (100%)

#### ⚠️ **Partially Passing:**
- Two-Factor Authentication: 2/5
- Inventory Management: 4/6
- Procurement Management: 2/4
- Webhooks: 1/3
- GraphQL: 1/2

#### ❌ **All Failing:**
- Financial Management: 0/5
- Project Enhancements: 0/5
- CRM Enhancements: 0/5

### **Common Issues Identified:**

1. **Missing Test Data:**
   - Tests expect data that doesn't exist
   - Need to seed test data in `beforeAll` hooks
   - Examples: Projects, leads, purchase orders, budgets, currencies

2. **Test Expectations Mismatch:**
   - Tests expect 200 when 400/404 is correct
   - Need to adjust expectations to match actual API behavior

3. **Schema Dependencies:**
   - New tables from recent implementations may not be created in test databases
   - Ensure all schemas are included in `createAgencySchema`

4. **Missing Foreign Key Data:**
   - Tests create records without required parent records
   - Need to create dependencies first (e.g., requisitions before POs)

### **What You Need to Do:**

1. **Read the Test Failure Documentation:**
   - `docs/TEST_FAILURES_DOCUMENTATION.md` - Complete breakdown of all failures

2. **Fix Each Test Suite:**
   - Start with the highest priority (Financial, Project, CRM)
   - Fix one suite at a time
   - Test after each fix
   - Ensure all tests pass before moving to next suite

3. **Common Fixes Needed:**
   - Add test data seeding in `beforeAll` hooks
   - Create parent records before child records
   - Adjust test expectations to match API behavior
   - Ensure all new schemas are included in test database creation

4. **Test Files Location:**
   - `server/__tests__/api/*.test.js` - All API integration tests

5. **Key Test Files to Fix:**
   - `server/__tests__/api/financial.test.js` - 0/5 passing
   - `server/__tests__/api/projectEnhancements.test.js` - 0/5 passing
   - `server/__tests__/api/crmEnhancements.test.js` - 0/5 passing
   - `server/__tests__/api/twoFactor.test.js` - 2/5 passing
   - `server/__tests__/api/inventory.test.js` - 4/6 passing
   - `server/__tests__/api/procurement.test.js` - 2/4 passing
   - `server/__tests__/api/webhooks.test.js` - 1/3 passing
   - `server/__tests__/api/graphql.test.js` - 1/2 passing

### **Testing Command:**
```bash
cd server && npm test
```

### **Important Notes:**

1. **Database Schema:**
   - All test databases use `createAgencySchema` from `server/utils/schemaCreator.js`
   - Ensure all new schemas (SSO, password policies, sessions, API keys) are included

2. **Authentication:**
   - Tests use mock authentication from `server/__tests__/helpers/mockAuth.js`
   - Mock auth uses `global.testUserId`, `global.testAgencyId`, `global.testAgencyDatabase`
   - These are set in `beforeAll` hooks

3. **Test Structure:**
   - Each test suite has `beforeAll` and `afterAll` hooks
   - `beforeAll`: Creates test agency, user, sets global context
   - `afterAll`: Cleans up test database

4. **Error Patterns:**
   - 500 errors usually mean missing data or schema issues
   - 400 errors might be correct API behavior (check expectations)
   - 404 errors mean resource doesn't exist (create test data)

### **Success Criteria:**
- ✅ All 58 tests passing
- ✅ No test failures
- ✅ All test suites green
- ✅ Test infrastructure working correctly

### **Files to Review:**
- `docs/TEST_FAILURES_DOCUMENTATION.md` - Complete failure breakdown
- `server/__tests__/helpers/testHelpers.js` - Test utilities
- `server/__tests__/helpers/mockAuth.js` - Mock authentication
- `server/utils/schemaCreator.js` - Schema creation (ensure all new schemas included)
- `server/__tests__/api/*.test.js` - All test files

### **Approach:**
1. Start with highest priority failing suites (Financial, Project, CRM)
2. Read each test file and understand what it's testing
3. Check the API route being tested
4. Identify missing data or incorrect expectations
5. Fix the test or the API (whichever is wrong)
6. Run tests to verify fix
7. Move to next test suite

### **Priority Order:**
1. Financial Management (0/5) - HIGH PRIORITY
2. Project Enhancements (0/5) - HIGH PRIORITY
3. CRM Enhancements (0/5) - HIGH PRIORITY
4. Procurement (2/4) - MEDIUM PRIORITY
5. Inventory (4/6) - MEDIUM PRIORITY
6. Webhooks (1/3) - MEDIUM PRIORITY
7. Two-Factor (2/5) - LOW PRIORITY
8. GraphQL (1/2) - LOW PRIORITY

---

**GOAL: Fix all 29 failing tests until all 58 tests pass.**

**Start by reading `docs/TEST_FAILURES_DOCUMENTATION.md` for detailed breakdown of each failure, then systematically fix each test suite one by one.**
