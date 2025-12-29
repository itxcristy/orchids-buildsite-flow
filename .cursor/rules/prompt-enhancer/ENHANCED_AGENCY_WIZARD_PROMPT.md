# TASK: Overhaul Agency Onboarding Wizard Design - Professional Enterprise-Grade UI/UX

## CONTEXT ANALYSIS REQUIRED

Before implementing any changes, you must:

1. **Examine the following files and understand their current implementation:**
   - `src/components/AgencyOnboardingWizard.tsx` - Main wizard component (1832 lines)
   - `src/pages/AgencySetup.tsx` - Related setup page for comparison
   - `src/pages/AgencySetupProgress.tsx` - Post-creation flow
   - `src/App.tsx` - Routing configuration for the wizard
   - `src/components/ui/*` - All shadcn/ui components used (Button, Card, Input, Label, Progress, Badge, RadioGroup)
   - `tailwind.config.ts` - Current Tailwind configuration and theme
   - `src/index.css` - Global styles and CSS variables
   - `package.json` - Available dependencies (React 18, Tailwind, Radix UI, Lucide icons)

2. **Understand the current architecture:**
   - Framework: React 18.3.1 with TypeScript
   - Styling: Tailwind CSS with shadcn/ui components
   - UI Library: Radix UI primitives with custom styling
   - Icons: Lucide React
   - State Management: React hooks (useState, useEffect, useCallback, useMemo)
   - Routing: React Router DOM v6
   - Form Handling: Custom validation with error states
   - API Integration: Fetch API with `/api/agencies/create` endpoint

3. **Analyze current design issues:**
   - Review the existing component structure and identify design weaknesses
   - Check responsive breakpoints and mobile experience
   - Evaluate information architecture and missing content
   - Assess visual hierarchy and professional appearance
   - Review accessibility and user experience patterns

## DETAILED REQUIREMENTS

### Primary Objective
Transform the Agency Onboarding Wizard from a basic, immature design into a professional, enterprise-grade onboarding experience that instills confidence in companies creating their agency workspace. The functionality is complete and working, but the design needs a complete overhaul to meet professional standards.

### Specific Implementation Details

#### 1. Visual Design Overhaul
**Acceptance Criteria:**
- Replace current gradient backgrounds with a more sophisticated, subtle design system
- Implement a cohesive color palette that conveys professionalism and trust
- Use proper spacing, typography hierarchy, and visual rhythm throughout
- Add subtle animations and micro-interactions that enhance rather than distract
- Ensure all visual elements follow a consistent design language
- Remove any "gimmicky" elements (fake urgency timers, inflated social proof numbers)
- Use professional iconography and ensure icons are contextually appropriate

**Technical Requirements:**
- Maintain dark theme but with refined color choices
- Use CSS custom properties for theming consistency
- Implement smooth transitions (200-300ms) for state changes
- Ensure all gradients are subtle and professional
- Use proper shadows and depth to create hierarchy

#### 2. Information Architecture Enhancement
**Acceptance Criteria:**
- Add comprehensive help text and tooltips for each field
- Include contextual information explaining why each field is needed
- Add examples and placeholder text that guide users
- Display clear benefits and value propositions for each step
- Show estimated time to complete each step
- Include security and privacy information where relevant
- Add links to documentation or support resources
- Display what happens after each step is completed

**Missing Information to Add:**
- **Step 1 (Agency Essentials):**
  - Explanation of what a domain identifier is and its purpose
  - Information about domain availability and uniqueness
  - Preview of how the domain will be used in the system
  - Security information about data isolation

- **Step 2 (Profile & Focus):**
  - How industry selection affects system defaults
  - Examples of positioning statements
  - How this information customizes the experience
  - Industry-specific feature recommendations

- **Step 3 (Contact Details):**
  - Why contact information is important
  - How this information appears in documents
  - Privacy and data usage policies
  - Options for updating information later

- **Step 4 (Administrative Access):**
  - Security best practices for passwords
  - Information about account recovery
  - Role and permission explanations
  - Multi-factor authentication availability (if applicable)

- **Step 5 (Workflows & Modules):**
  - Detailed descriptions of each module's capabilities
  - How modules can be enabled/disabled later
  - Impact of module selection on onboarding
  - Feature comparison between modules

- **Step 6 (Service Tier Selection):**
  - Detailed feature comparison table
  - Pricing transparency and billing information
  - Upgrade/downgrade policies
  - Support level differences
  - Trial period information (if applicable)

- **Step 7 (Final Review):**
  - What happens during activation
  - Expected setup time
  - Next steps after activation
  - Support resources available

#### 3. Responsive Design Excellence
**Acceptance Criteria:**
- Mobile-first approach with breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- All content must be readable and usable on mobile devices (320px+)
- Touch targets must be at least 44x44px on mobile
- Forms must stack appropriately on small screens
- Navigation must work seamlessly on all devices
- Sidebar content must adapt or collapse on mobile
- Images and icons must scale appropriately
- Text must remain readable without zooming

**Technical Requirements:**
- Use Tailwind responsive utilities (sm:, md:, lg:, xl:, 2xl:)
- Test on actual device viewports, not just browser resize
- Ensure horizontal scrolling never occurs
- Implement proper mobile navigation patterns
- Use appropriate font sizes for each breakpoint
- Optimize images and assets for different screen densities

#### 4. Professional Layout & Spacing
**Acceptance Criteria:**
- Implement consistent spacing system (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- Use proper grid systems for form layouts
- Ensure adequate whitespace for visual breathing room
- Create clear visual hierarchy with typography scale
- Align elements consistently using a baseline grid
- Use proper card padding and margins
- Ensure content doesn't feel cramped or overwhelming

**Technical Requirements:**
- Use Tailwind spacing utilities consistently
- Implement CSS Grid and Flexbox appropriately
- Maintain consistent padding/margin ratios
- Use max-width constraints for readability
- Ensure proper line-height and letter-spacing

#### 5. Enhanced User Experience
**Acceptance Criteria:**
- Add progress indicators that show actual progress, not just step numbers
- Implement save/draft functionality (localStorage) so users don't lose progress
- Add keyboard navigation support (Tab, Enter, Arrow keys)
- Include skip options for optional steps where appropriate
- Add "Save and continue later" option
- Implement proper loading states with meaningful messages
- Show success states after each step completion
- Add confirmation dialogs for critical actions
- Implement proper error recovery mechanisms

**Technical Requirements:**
- Use React hooks for state persistence (localStorage)
- Implement proper focus management
- Add ARIA labels and roles for accessibility
- Use proper semantic HTML
- Implement proper error boundaries
- Add analytics tracking points (if applicable)

#### 6. Content & Copy Improvements
**Acceptance Criteria:**
- Rewrite all copy to be professional, clear, and concise
- Remove marketing jargon and replace with clear value propositions
- Use active voice and imperative mood for instructions
- Add proper headings hierarchy (h1, h2, h3)
- Include proper alt text for all images/icons
- Ensure all error messages are helpful and actionable
- Add success messages that confirm actions
- Include proper legal disclaimers where needed

**Technical Requirements:**
- All text must be accessible (proper contrast ratios)
- Use proper semantic HTML for text hierarchy
- Implement proper internationalization structure (i18n-ready)
- Ensure copy is scannable with proper formatting

#### 7. Accessibility (WCAG 2.1 AA Compliance)
**Acceptance Criteria:**
- All interactive elements must be keyboard accessible
- Proper focus indicators on all focusable elements
- Color contrast ratios meet WCAG AA standards (4.5:1 for text, 3:1 for UI)
- Screen reader support with proper ARIA labels
- Form labels properly associated with inputs
- Error messages properly announced to screen readers
- Loading states properly communicated
- Skip links for main content

**Technical Requirements:**
- Use Radix UI components which have built-in accessibility
- Add proper ARIA attributes where needed
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Ensure keyboard navigation works throughout
- Use proper semantic HTML elements

#### 8. Performance Optimization
**Acceptance Criteria:**
- Component should render smoothly without jank
- Images and assets should be optimized
- Lazy load non-critical content
- Debounce input validations appropriately
- Minimize re-renders with proper React optimization
- Code splitting if component becomes too large

**Technical Requirements:**
- Use React.memo for expensive components
- Implement proper useMemo and useCallback hooks
- Lazy load heavy components
- Optimize bundle size
- Use proper image formats and sizes

### Technical Constraints

- **Must maintain existing functionality:** All current features must continue to work exactly as they do now
- **Must use existing dependencies:** Cannot add new major dependencies without justification
- **Must follow existing patterns:** Follow the code structure and patterns already established in the codebase
- **Must maintain TypeScript types:** All new code must be properly typed
- **Must use Tailwind CSS:** All styling must use Tailwind utility classes
- **Must use shadcn/ui components:** Cannot replace the UI component library
- **Must maintain API compatibility:** Cannot change the API request/response structure
- **Must preserve state management:** Current state management approach must be maintained
- **Must work with existing routing:** Cannot change the route structure

### Browser/Device Compatibility

- **Desktop:** Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
- **Mobile:** iOS Safari (latest 2 versions), Chrome Mobile (latest 2 versions)
- **Tablet:** iPad (Safari), Android tablets (Chrome)
- **Screen Sizes:** 320px (mobile) to 2560px (large desktop)
- **Touch Support:** Full touch support for mobile devices
- **Keyboard Support:** Full keyboard navigation support

### Error Handling Requirements

- **Form Validation Errors:**
  - Display inline error messages below each field
  - Use consistent error styling (red with proper contrast)
  - Show errors immediately on blur or after first submit attempt
  - Clear errors when user starts correcting the field
  - Provide actionable error messages (not just "Invalid input")

- **API Errors:**
  - Display user-friendly error messages for API failures
  - Show retry options for transient errors
  - Handle network errors gracefully
  - Display appropriate messages for validation errors from backend
  - Log technical errors to console for debugging

- **Loading States:**
  - Show loading indicators during API calls
  - Disable form submission during loading
  - Display progress for long-running operations
  - Provide cancel options where appropriate

- **Edge Cases:**
  - Handle browser back/forward navigation
  - Handle page refresh (save state to localStorage)
  - Handle network disconnection
  - Handle session expiration
  - Handle concurrent modifications

### Data Validation

- **Client-Side Validation:**
  - Validate all required fields before allowing step progression
  - Validate email format with proper regex
  - Validate password strength (min 8 chars, uppercase, lowercase, number)
  - Validate domain format (alphanumeric and hyphens only)
  - Validate phone number format (flexible international format)
  - Show validation errors in real-time where appropriate

- **Server-Side Validation:**
  - All client-side validations must also be enforced server-side
  - Handle server validation errors gracefully
  - Display server error messages appropriately

- **Boundary Conditions:**
  - Handle empty strings
  - Handle very long input strings
  - Handle special characters appropriately
  - Handle unicode characters
  - Handle copy-paste scenarios

## INTEGRATION REQUIREMENTS

### Files to Modify

1. **`src/components/AgencyOnboardingWizard.tsx`**
   - Complete design overhaul while maintaining all functionality
   - Add missing information and help text
   - Improve responsive design
   - Enhance accessibility
   - Add proper TypeScript types
   - Optimize performance

2. **`src/index.css`** (if needed)
   - Add custom CSS variables for new design system
   - Add custom animations if needed
   - Ensure proper global styles

3. **`tailwind.config.ts`** (if needed)
   - Add custom colors if new palette is needed
   - Add custom animations
   - Extend theme as needed

### Files to Create (if any)

1. **`src/components/AgencyOnboardingWizard/types.ts`** (optional)
   - Extract TypeScript interfaces if component becomes too large
   - Shared types for wizard data structures

2. **`src/components/AgencyOnboardingWizard/constants.ts`** (optional)
   - Extract constants if component becomes too large
   - Step definitions, validation rules, etc.

3. **`src/components/AgencyOnboardingWizard/utils.ts`** (optional)
   - Extract utility functions if needed
   - Validation helpers, formatters, etc.

### Dependencies/Imports

- **Existing dependencies to use:**
  - `react` - Core React functionality
  - `react-router-dom` - Navigation
  - `@/components/ui/*` - shadcn/ui components
  - `lucide-react` - Icons
  - `@/hooks/use-toast` - Toast notifications
  - `@/hooks/useAuth` - Authentication

- **No new dependencies should be added** unless absolutely necessary and justified

### State Management

- **Current State Structure:**
  - `currentStep` - Current step number (1-7)
  - `isLoading` - Loading state for API calls
  - `errors` - Validation errors object
  - `completedSteps` - Array of completed step IDs
  - `domainAvailable` - Domain availability status
  - `formData` - Complete form data object

- **New State to Add (if needed):**
  - `savedProgress` - For localStorage persistence
  - `isDraft` - To indicate if form is saved as draft
  - `focusedField` - For accessibility focus management

- **State Updates:**
  - Maintain all existing state update patterns
  - Add localStorage persistence for draft saving
  - Ensure state updates are properly typed

### Props/Context

- Component currently receives no props (self-contained)
- Uses React Router's `useNavigate` hook
- Uses custom hooks: `useToast`, `useAuth`
- No context changes needed

## CODE QUALITY REQUIREMENTS

### Type Safety

- **All functions must have explicit type definitions:**
  ```typescript
  const handleNext = useCallback((): void => {
    // implementation
  }, [dependencies]);
  ```

- **All component props must be typed:**
  - Use TypeScript interfaces for complex objects
  - Use union types for limited value sets
  - Avoid `any` types - use `unknown` if type is truly unknown

- **Form data must be properly typed:**
  - Maintain existing `AgencyFormData` interface
  - Extend if needed with proper types
  - Ensure all form fields are typed

- **API responses must be typed:**
  - Create interfaces for API request/response types
  - Handle error responses with proper types

### Code Style

- **Follow existing code formatting:**
  - Use 2-space indentation
  - Use semicolons
  - Use single quotes for strings (or match existing style)
  - Use trailing commas in objects/arrays

- **Follow existing naming conventions:**
  - PascalCase for components
  - camelCase for functions and variables
  - UPPER_CASE for constants
  - kebab-case for file names

- **Maintain consistent structure:**
  - Imports at top
  - Type definitions
  - Constants
  - Component definition
  - Hooks
  - Handlers
  - Render/return

### Best Practices

- **DRY Principle:**
  - Extract repeated code into reusable functions
  - Create reusable components for repeated UI patterns
  - Use constants for repeated values

- **Component Composition:**
  - Break down large component into smaller sub-components if it exceeds 500 lines
  - Create reusable form field components
  - Extract step components if needed

- **Performance:**
  - Use `React.memo` for expensive components
  - Use `useMemo` for expensive calculations
  - Use `useCallback` for event handlers passed to children
  - Debounce input validations
  - Lazy load non-critical content

- **Accessibility:**
  - Use semantic HTML elements
  - Add proper ARIA labels
  - Ensure keyboard navigation
  - Maintain proper focus management
  - Use proper heading hierarchy

### Documentation

- **Add JSDoc comments for complex functions:**
  ```typescript
  /**
   * Validates the current step's form data
   * @param step - The step number to validate (1-7)
   * @returns true if validation passes, false otherwise
   */
  const validateStep = useCallback((step: number): boolean => {
    // implementation
  }, [dependencies]);
  ```

- **Add inline comments for complex logic:**
  - Explain "why" not "what"
  - Document business rules
  - Explain non-obvious code

- **Component-level documentation:**
  - Add file-level comment explaining component purpose
  - Document props if component accepts them
  - Document usage examples if needed

### Testing Requirements

- **Manual Testing Checklist:**
  - Test all 7 steps of the wizard
  - Test form validation on each step
  - Test navigation (next, back, step clicking)
  - Test error states
  - Test loading states
  - Test successful submission
  - Test responsive design on multiple devices
  - Test keyboard navigation
  - Test with screen reader
  - Test browser back/forward buttons
  - Test page refresh (draft saving)

- **Edge Case Testing:**
  - Very long input strings
  - Special characters in inputs
  - Network failure scenarios
  - Concurrent tab scenarios
  - Browser compatibility

## VERIFICATION CHECKLIST

Before submitting the code, verify:

- [ ] All existing functionality still works (no breaking changes)
- [ ] All 7 steps render correctly and function properly
- [ ] Form validation works on all steps
- [ ] Navigation (next, back, step clicking) works correctly
- [ ] API integration works (agency creation succeeds)
- [ ] Error states are properly handled and displayed
- [ ] Loading states are implemented and work correctly
- [ ] Responsive design works on mobile (320px+), tablet, and desktop
- [ ] All text is readable and properly contrasted
- [ ] Keyboard navigation works throughout the wizard
- [ ] Screen reader can navigate and understand the wizard
- [ ] Code follows project conventions (formatting, naming, structure)
- [ ] TypeScript types are properly defined (no `any` types)
- [ ] No console errors or warnings
- [ ] Code is properly formatted
- [ ] Comments explain complex logic
- [ ] All edge cases are handled
- [ ] Performance is acceptable (no jank, smooth animations)
- [ ] Accessibility requirements are met (WCAG 2.1 AA)
- [ ] All missing information has been added
- [ ] Design is professional and enterprise-grade
- [ ] Copy is clear, professional, and helpful
- [ ] Icons and imagery are appropriate and professional
- [ ] Visual hierarchy is clear and consistent
- [ ] Spacing and layout are consistent throughout

## COMMON PITFALLS TO AVOID

- **Don't break existing functionality:** The wizard currently works - don't introduce bugs
- **Don't change API structure:** The backend expects specific data format - maintain it
- **Don't remove features:** Even if redesigning, keep all current features
- **Don't use inline styles:** Use Tailwind classes exclusively
- **Don't create new UI components:** Use existing shadcn/ui components
- **Don't add unnecessary dependencies:** Keep bundle size small
- **Don't over-animate:** Subtle animations are professional, excessive ones are not
- **Don't use fake urgency:** Remove fake timers and inflated social proof
- **Don't ignore mobile:** Mobile experience is critical
- **Don't skip accessibility:** It's not optional
- **Don't use poor color contrast:** Test all color combinations
- **Don't create long forms:** Break information into digestible chunks
- **Don't use technical jargon:** Write for business users
- **Don't forget error states:** Users will make mistakes
- **Don't ignore loading states:** Users need feedback

## EXPECTED OUTPUT

Provide:

1. **Complete, working code for `src/components/AgencyOnboardingWizard.tsx`**
   - Fully redesigned component with all improvements
   - All functionality preserved
   - All missing information added
   - Professional, enterprise-grade design
   - Fully responsive
   - Accessible

2. **Updated files (if any):**
   - `src/index.css` - If new CSS variables or styles are needed
   - `tailwind.config.ts` - If theme extensions are needed

3. **Clear explanation of changes made:**
   - List of design improvements
   - List of information additions
   - List of UX enhancements
   - List of accessibility improvements
   - List of responsive design improvements

4. **Migration notes (if any):**
   - Any breaking changes (there should be none)
   - Any new dependencies (there should be none)
   - Any configuration changes needed

5. **Testing instructions:**
   - How to test the new design
   - What to look for in testing
   - Known issues or limitations (if any)

## SUCCESS CRITERIA

The implementation is successful when:

1. **Visual Quality:**
   - The wizard looks professional and enterprise-grade
   - A company would feel confident using it to create their agency
   - Design is cohesive and consistent throughout
   - No immature or unprofessional elements remain

2. **Information Completeness:**
   - All steps have comprehensive help text and explanations
   - Users understand why each field is needed
   - Examples and guidance are provided where helpful
   - Missing information has been added throughout

3. **Responsive Design:**
   - Works perfectly on mobile devices (320px+)
   - Works perfectly on tablets
   - Works perfectly on desktop
   - No horizontal scrolling on any device
   - Touch targets are appropriate size on mobile

4. **Functionality:**
   - All existing features work exactly as before
   - No regressions introduced
   - All form validations work
   - API integration works
   - Navigation works correctly

5. **User Experience:**
   - Users can complete the wizard easily
   - Error messages are helpful
   - Loading states provide feedback
   - Progress is clear
   - Users feel guided and supported

6. **Accessibility:**
   - Keyboard navigation works throughout
   - Screen readers can navigate and understand
   - Color contrast meets WCAG AA standards
   - Focus indicators are clear
   - Semantic HTML is used

7. **Performance:**
   - Component renders smoothly
   - No jank or lag
   - Animations are smooth
   - Page load is fast
   - No unnecessary re-renders

---

## ADDITIONAL NOTES

- **Preserve all existing functionality:** This is a design overhaul, not a feature rewrite
- **Maintain code structure:** Follow the existing patterns and structure
- **Test thoroughly:** This is a critical user-facing component
- **Think like a user:** What would make a company feel confident using this?
- **Professional doesn't mean boring:** The design should be modern and engaging, just professional
- **Information is key:** Users need to understand what they're doing and why
- **Mobile is critical:** Many users will access this on mobile devices
- **Accessibility is not optional:** It's a requirement for professional software
