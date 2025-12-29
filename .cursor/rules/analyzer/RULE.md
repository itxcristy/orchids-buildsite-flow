---
alwaysApply: false
---
# Cursor AI Agent Rule: Comprehensive Page Testing & Improvement

## Trigger Command
When user says: **"TEST PAGE: [PROJECT-MANAGEMENT]"**

---

## Phase 1: Deep Analysis & Comprehensive Testing

### Step 1: Initial Page Understanding
- Analyze the entire page code structure (components, styles, logic)
- Identify the page's primary purpose and user journey
- Map all features, components, and interactions
- Review routing, state management, and data flow
- Check database schema and API integrations

### Step 2: Ruthless Functionality Testing
Test EVERY element comprehensively:

#### UI Components
- All buttons (enabled/disabled states, loading states, click handlers)
- All input fields (validation, error states, placeholder, max length, special characters)
- All dropdowns/selects (options loading, selection handling, default values)
- All checkboxes/radio buttons (selection logic, group behavior)
- All modals/dialogs (open/close, backdrop clicks, escape key)
- All tooltips/popovers (hover states, positioning, content)
- All tabs/accordions (switching, active states, content loading)
- All forms (submission, validation, error handling, success states)

#### Data Operations
- Create operations (validation, duplicate handling, success/error responses)
- Read operations (loading states, empty states, pagination, filtering, sorting)
- Update operations (optimistic updates, conflict resolution, rollback)
- Delete operations (confirmation, cascade effects, undo functionality)
- Search/filter functionality (query handling, debouncing, results display)

#### Edge Cases & Error Scenarios
- Empty states (no data, null values, undefined)
- Loading states (initial load, refetch, background updates)
- Error states (network errors, validation errors, server errors)
- Boundary values (min/max inputs, character limits, number ranges)
- Concurrent operations (race conditions, double clicks, rapid inputs)
- Invalid data formats (malformed JSON, incorrect types)
- Unauthorized access attempts
- Session expiration handling

#### Interactions & User Flow
- Navigation (all links, back/forward, breadcrumbs)
- Form wizards/multi-step processes (step validation, progress saving)
- Keyboard navigation (tab order, enter/escape keys, shortcuts)
- Focus management (focus trapping in modals, focus restoration)
- Scroll behavior (infinite scroll, scroll to top, scroll restoration)
- Drag and drop (if applicable)
- Copy/paste functionality
- File uploads (if applicable - size limits, file types, progress)

#### Performance Testing
- Initial page load time
- Time to interactive
- Component render performance
- Re-render optimization (unnecessary renders)
- Memory leaks (event listeners, subscriptions)
- Bundle size analysis
- API call optimization (caching, deduplication)
- Image optimization (lazy loading, format, compression)

#### Responsive Design Testing
- Mobile breakpoints (320px, 375px, 414px, 768px)
- Tablet breakpoints (768px, 1024px)
- Desktop breakpoints (1280px, 1440px, 1920px+)
- Touch interactions on mobile
- Hover states on desktop only
- Orientation changes (portrait/landscape)
- Text scaling and readability
- Viewport meta tag configuration

#### Accessibility Testing
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation completeness
- Screen reader compatibility
- Color contrast ratios (WCAG AA/AAA)
- Focus indicators visibility
- Alt text for images
- Form label associations
- Error message announcements
- Skip navigation links

#### Security Testing
- XSS vulnerability checks (input sanitization)
- CSRF protection
- SQL injection prevention (if database queries)
- Authentication checks on protected routes
- Authorization for actions (role-based access)
- Sensitive data exposure (console logs, error messages)
- Secure data transmission (HTTPS, encrypted storage)
- Input validation (client and server-side)
- Rate limiting on forms/API calls
- Content Security Policy compliance

#### Database Integration Testing
- Connection handling (pooling, timeouts)
- Query optimization (N+1 problems, indexing)
- Transaction handling (atomicity, rollback)
- Data consistency checks
- Migration compatibility
- Backup and recovery scenarios
- Constraint validation (foreign keys, unique constraints)
- Cascading operations correctness

#### Browser Compatibility
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest version)
- Mobile browsers (iOS Safari, Chrome Mobile)

#### Integration Testing
- Third-party service integrations
- API endpoint responses
- WebSocket connections (if applicable)
- Authentication flows (login, logout, token refresh)
- Payment processing (if applicable)
- Email/notification triggers
- External library usage

---

## Phase 2: Deep Feature Analysis

### Step 3: Missing Features Identification
Think deeply about the page purpose and identify gaps:

#### Functionality Gaps
- Critical features missing for user goals
- Expected industry-standard features
- Competitive feature analysis
- User workflow improvements
- Automation opportunities
- Bulk operations
- Export/import capabilities
- Advanced filtering/search
- Customization options
- Shortcuts and power-user features

#### UX/UI Improvements
- Unclear user flows
- Confusing navigation
- Missing feedback mechanisms (loading, success, error)
- Inconsistent design patterns
- Poor information hierarchy
- Missing empty states
- Lack of onboarding/help
- Insufficient visual feedback
- Missing micro-interactions
- Unclear call-to-actions

#### Performance Optimizations
- Code splitting opportunities
- Lazy loading implementation
- Caching strategies
- Database query optimization
- Asset optimization
- Server-side rendering opportunities
- Static generation possibilities
- CDN usage
- Service worker/PWA features

#### Security Enhancements
- Missing authentication mechanisms
- Insufficient authorization checks
- Unencrypted sensitive data
- Missing input sanitization
- Lack of rate limiting
- Missing CORS configuration
- Insecure dependencies
- Missing security headers

#### Usability Issues
- Confusing labels or terminology
- Too many steps for common tasks
- Hidden or hard-to-find features
- Lack of undo/redo
- Missing confirmation dialogs
- Poor error recovery
- Inconsistent behavior
- Overwhelming information density

#### Accessibility Gaps
- Missing ARIA attributes
- Poor keyboard navigation
- Insufficient color contrast
- Missing alt text
- Inaccessible custom components
- No skip links
- Missing focus management
- Screen reader incompatibility

#### Responsive Design Issues
- Broken layouts on certain breakpoints
- Unusable touch targets on mobile
- Horizontal scrolling issues
- Text too small on mobile
- Images not optimized for mobile
- Missing mobile-specific features (swipe gestures)

---

## Phase 3: Comprehensive Report Generation

### Step 4: Present Findings to User
Generate a detailed report with:

```markdown
# Page Testing Report: [PAGE_NAME]

## 1. PAGE OVERVIEW
- Purpose: [description]
- Current Features: [list]
- User Journey: [description]

## 2. TESTING RESULTS

### ✅ Working Correctly
- [List all passing tests with brief description]

### ⚠️ Issues Found
- [Critical Issues] - MUST FIX
- [Major Issues] - SHOULD FIX
- [Minor Issues] - NICE TO FIX

### 🔍 Detailed Test Results
[Comprehensive breakdown by category]

## 3. MISSING FEATURES & IMPROVEMENTS

### Critical Missing Features
- [Feature 1]: Why it's needed, impact on users
- [Feature 2]: ...

### Performance Improvements
- [Improvement 1]: Current state, proposed solution, expected impact
- [Improvement 2]: ...

### Security Enhancements
- [Enhancement 1]: Risk level, proposed solution
- [Enhancement 2]: ...

### UX/UI Improvements
- [Improvement 1]: User pain point, proposed solution
- [Improvement 2]: ...

### Accessibility Improvements
- [Improvement 1]: Current WCAG violation, proposed fix
- [Improvement 2]: ...

### Responsive Design Fixes
- [Fix 1]: Breakpoint, issue, solution
- [Fix 2]: ...

## 4. DATABASE OPTIMIZATION
- Schema improvements
- Query optimizations
- Indexing recommendations
- Data integrity checks

## 5. RECOMMENDED ACTION PLAN
Priority 1 (Critical): [items]
Priority 2 (High): [items]
Priority 3 (Medium): [items]
Priority 4 (Low): [items]

## 6. ESTIMATED IMPACT
- Performance: [improvement estimate]
- User Experience: [impact description]
- Security: [risk reduction]
- Maintainability: [code quality improvement]

Would you like me to proceed with implementing all fixes and improvements?
```

---

## Phase 4: Implementation

### Step 5: Apply All Fixes (After User Approval)
When user says **"PROCEED"** or **"FIX ALL"**:

1. **Create backup branch** (if using version control)
2. **Fix issues in priority order:**
   - Critical bugs first
   - Security issues
   - Performance bottlenecks
   - Missing features
   - UX improvements
   - Responsive design fixes
   - Accessibility enhancements
   - Minor polishes

3. **For each fix:**
   - Apply the code changes
   - Add inline comments explaining changes
   - Update related documentation
   - Ensure no breaking changes to existing functionality
   - Follow project's coding standards
   - Optimize while maintaining readability

4. **Database updates (if needed):**
   - Create migration files
   - Update models/schemas
   - Add necessary indexes
   - Update seed data if applicable

5. **Update tests:**
   - Add unit tests for new functionality
   - Add integration tests for user flows
   - Update existing tests if needed
   - Ensure all tests pass

---

## Phase 5: Post-Implementation Testing

### Step 6: Comprehensive Re-Testing
After all fixes applied:

1. **Run all tests again** (repeat Phase 1 testing)
2. **Compare before/after:**
   - Performance metrics
   - Functionality coverage
   - Issue resolution status
   - User flow improvements

3. **Generate comparison report:**
```markdown
# Implementation Results: [PAGE_NAME]

## Changes Applied: [count] fixes/improvements

### Before vs After Comparison

#### Performance
- Load time: [before] → [after]
- Bundle size: [before] → [after]
- Lighthouse score: [before] → [after]

#### Issues Resolved
- Critical: [X/Y resolved]
- Major: [X/Y resolved]
- Minor: [X/Y resolved]

#### New Features Added
- [List with descriptions]

#### Test Coverage
- Before: [X%]
- After: [Y%]

### Remaining Items (if any)
- [Items that couldn't be fixed with explanation]
```

---

## Phase 6: Production Preparation

### Step 7: Clean Up & Finalize
1. **Remove all test/debug code:**
   - Console.logs
   - Debug flags
   - Test data
   - Commented code
   - Unused imports

2. **Code quality checks:**
   - Run linter and fix all issues
   - Run formatter (Prettier, etc.)
   - Remove unused dependencies
   - Optimize imports
   - Check for code duplication

3. **Documentation:**
   - Update README if needed
   - Document new features
   - Update API documentation
   - Add inline comments for complex logic

4. **Security final check:**
   - Scan for exposed secrets/keys
   - Verify environment variables
   - Check dependencies for vulnerabilities
   - Ensure proper error handling (no stack traces in production)

5. **Performance final check:**
   - Run production build
   - Check bundle sizes
   - Verify lazy loading
   - Test production API endpoints

6. **Create deployment checklist:**
```markdown
## Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Production build successful
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Monitoring/logging configured
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Browser testing completed
- [ ] Mobile testing completed
- [ ] Accessibility audit passed
```

---

## Usage Example

**User:** TEST PAGE: UserDashboard

**Agent Response:** [Executes full testing suite, generates comprehensive report, waits for approval]

**User:** PROCEED

**Agent Response:** [Implements all fixes, re-tests, generates comparison report, cleans up for production]

---

## Configuration Options

The agent can also accept modifiers:

- **"TEST PAGE: [name] --quick"** - Skip minor issues, focus on critical/major only
- **"TEST PAGE: [name] --performance"** - Deep dive into performance only
- **"TEST PAGE: [name] --security"** - Focus on security audit
- **"TEST PAGE: [name] --a11y"** - Focus on accessibility
- **"TEST PAGE: [name] --mobile"** - Focus on mobile experience

---

## Notes
- This process is thorough and may take time for complex pages
- Always backs up before major changes
- Follows the project's existing patterns and conventions
- Maintains backward compatibility unless explicitly approved to break
- Documents all significant changes
- Prioritizes user experience and code quality equally