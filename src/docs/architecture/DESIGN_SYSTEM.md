# BuildFlow ERP Design System

## Overview

This document defines the professional design system for BuildFlow ERP. All design decisions follow enterprise-grade standards and ensure consistency, accessibility, and professionalism across the entire application.

## Design Principles

1. **Professional & Enterprise-Grade**: Clean, minimal design suitable for business use
2. **Consistency**: Unified design language across all components and pages
3. **Accessibility**: WCAG 2.1 AA compliance minimum
4. **Responsive**: Mobile-first approach with perfect responsiveness
5. **Performance**: No excessive animations or decorative elements

## Color System

### Base Colors

All colors use HSL format and are defined in `src/index.css`.

#### Light Mode
- **Background**: `hsl(0 0% 100%)` - Pure white
- **Foreground**: `hsl(222.2 84% 4.9%)` - Near black
- **Card**: `hsl(0 0% 100%)` - White
- **Border**: `hsl(214.3 31.8% 91.4%)` - Light gray
- **Input**: `hsl(214.3 31.8% 91.4%)` - Light gray

#### Dark Mode
- **Background**: `hsl(222.2 84% 4.9%)` - Dark blue-gray
- **Foreground**: `hsl(210 40% 98%)` - Near white
- **Card**: `hsl(222.2 84% 4.9%)` - Dark blue-gray
- **Border**: `hsl(217.2 32.6% 17.5%)` - Medium gray
- **Input**: `hsl(217.2 32.6% 17.5%)` - Medium gray

### Semantic Colors

#### Success (Green)
- **Light Mode**: `hsl(142 76% 36%)`
- **Dark Mode**: `hsl(142 76% 40%)`
- **Usage**: Success states, positive actions, completed tasks

#### Warning (Amber/Orange)
- **Light Mode**: `hsl(38 92% 50%)`
- **Dark Mode**: `hsl(38 92% 55%)`
- **Usage**: Warnings, pending states, attention needed

#### Error (Red)
- **Light Mode**: `hsl(0 84.2% 60.2%)`
- **Dark Mode**: `hsl(0 72% 55%)`
- **Usage**: Errors, destructive actions, critical alerts

#### Info (Blue)
- **Light Mode**: `hsl(217 91% 60%)`
- **Dark Mode**: `hsl(217 91% 65%)`
- **Usage**: Informational messages, neutral actions

### Primary Colors
- **Primary**: Used for primary actions, links, active states
- **Secondary**: Used for secondary actions, less important elements
- **Muted**: Used for disabled states, placeholder text

### Color Usage Rules

1. **No Excessive Gradients**: Avoid gradient backgrounds and gradient text
2. **High Contrast**: All text must meet WCAG AA contrast ratios (4.5:1 minimum)
3. **Semantic Usage**: Use semantic colors consistently (success=green, error=red, etc.)
4. **Professional Palette**: Avoid bright, unprofessional color combinations

## Typography

### Font Stack

**Primary (Sans-serif)**:
```css
'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

**Monospace**:
```css
'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace
```

### Type Scale

| Size | Value | Usage |
|------|-------|-------|
| Display (3xl) | 1.875rem / 30px | Page titles, hero sections |
| H1 (2xl) | 1.5rem / 24px | Main page headings |
| H2 (xl) | 1.25rem / 20px | Section headings |
| H3 (lg) | 1.125rem / 18px | Subsection headings |
| H4 (base) | 1rem / 16px | Card titles, form labels |
| Body (base) | 1rem / 16px | Default text |
| Small (sm) | 0.875rem / 14px | Secondary text, captions |
| Tiny (xs) | 0.75rem / 12px | Metadata, timestamps |

### Font Weights

- **Regular (400)**: Body text
- **Medium (500)**: Emphasis, labels
- **Semibold (600)**: Headings, important text
- **Bold (700)**: Strong emphasis (use sparingly)

### Line Heights

- **Tight (1.2)**: Headings
- **Normal (1.5)**: Body text
- **Relaxed (1.75)**: Long-form content

### Letter Spacing

- **Normal (0)**: Body text
- **Wide (0.025em)**: Uppercase labels, badges
- **Tighter (-0.025em)**: Large headings

## Spacing System (8px Grid)

Base unit: **4px** (all spacing multiples of 4px)

| Scale | Value | Usage |
|-------|-------|-------|
| 0.5 | 2px | Tight spacing |
| 1 | 4px | Very tight |
| 2 | 8px | Tight |
| 3 | 12px | Compact |
| 4 | 16px | Base spacing |
| 6 | 24px | Comfortable |
| 8 | 32px | Spacious |
| 12 | 48px | Very spacious |
| 16 | 64px | Section spacing |
| 24 | 96px | Page spacing |

### Spacing Application

- **Card padding**: 16px (p-4) or 24px (p-6) for larger cards
- **Section spacing**: 32px (space-y-8) or 48px (space-y-12)
- **Page padding**: 24px (p-6) on desktop, 16px (p-4) on mobile
- **Form field spacing**: 16px (gap-4) between fields
- **Button spacing**: 8px (gap-2) between buttons

## Layout System

### Container Widths

- **Mobile**: Full width (no max-width)
- **Tablet**: Max-width 768px, centered
- **Desktop**: Max-width 1280px (xl), centered
- **Large Desktop**: Max-width 1536px (2xl), centered

### Grid System

- Use CSS Grid for complex layouts
- Use Flexbox for component-level layouts
- Consistent gap: 16px (gap-4) or 24px (gap-6)

### Page Structure

- **Header**: Fixed or sticky, height 64px (h-16)
- **Sidebar**: Collapsible, width 256px (w-64) when open, 64px (w-16) when collapsed
- **Main Content**: Flexible, with proper padding
- **Footer**: If needed, height 48px (h-12)

## Component Standards

### Cards

```tsx
<Card className="p-4 border rounded-lg shadow-sm">
  {/* Card content */}
</Card>
```

- **Padding**: 16px (p-4) standard, 24px (p-6) for important cards
- **Border**: 1px solid border (border)
- **Border Radius**: 8px (rounded-lg)
- **Shadow**: Subtle shadow (shadow-sm) for elevation
- **Background**: Card background color (bg-card)
- **Hover States**: Subtle elevation increase (shadow-md on hover)

### Buttons

#### Sizes
- **Small**: h-9, px-3, text-sm
- **Default**: h-10, px-4, text-sm
- **Large**: h-11, px-8, text-base

#### Variants
- **Primary**: Solid background, high contrast
- **Secondary**: Outlined or subtle background
- **Ghost**: Transparent, hover state only
- **Destructive**: Red variant for delete actions

#### Spacing
- 8px gap between icon and text

### Forms

#### Input Fields
- **Height**: 40px (h-10)
- **Padding**: 12px horizontal (px-3)
- **Border**: 1px solid (border)
- **Border Radius**: 6px (rounded-md)
- **Focus**: 2px ring (ring-2 ring-ring)

#### Labels
- **Font size**: 14px (text-sm)
- **Font weight**: 500 (font-medium)
- **Spacing**: 8px below label (mb-2)

#### Error States
- Red border (border-destructive)
- Error message below field (text-sm text-destructive)

#### Help Text
- Gray color (text-muted-foreground)
- Font size: 12px (text-xs)

### Tables

#### Header
- Background: Subtle gray (bg-muted)
- Font weight: 600 (font-semibold)
- Font size: 12px (text-xs)
- Text transform: Uppercase (uppercase)
- Letter spacing: Wide (tracking-wide)

#### Rows
- Alternating row colors (even:bg-muted/50)
- Hover state: Subtle background change
- Padding: 12px vertical, 16px horizontal

#### Borders
- Horizontal borders only (border-b)
- No vertical borders (cleaner look)

### Dialogs/Modals

#### Width
- **Small**: 400px (max-w-md)
- **Medium**: 600px (max-w-lg)
- **Large**: 800px (max-w-2xl)
- **Full**: 90vw max-width 1200px

#### Styling
- **Padding**: 24px (p-6)
- **Backdrop**: Dark overlay (backdrop-blur-sm)
- **Animation**: Subtle fade-in (no excessive animations)

## Responsive Design

### Breakpoints (Tailwind Defaults)

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: 1024px+ (xl, 2xl)

### Mobile-First Approach

All pages must:
- Work perfectly on mobile (320px minimum width)
- Stack elements vertically on mobile
- Hide non-essential elements on mobile
- Use touch-friendly targets (minimum 44x44px)
- Proper spacing for thumb navigation

### Navigation
- Collapsible sidebar on mobile
- Bottom navigation for key actions (if appropriate)
- Hamburger menu with proper animation

### Tables
- Horizontal scroll on mobile (with indicator)
- Or card-based layout on mobile
- Sticky first column (if needed)

## Accessibility (WCAG 2.1 AA)

### Color & Contrast

- **Text Contrast**: Minimum 4.5:1 ratio (normal text), 3:1 (large text 18px+)
- **Interactive Elements**: Minimum 3:1 contrast
- **Focus Indicators**: Clear, visible (2px ring)

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order: Logical flow
- Focus indicators: Visible on all elements
- Skip links: For main content

### Screen Reader Support

- All icons must have `aria-label` or `aria-hidden="true"`
- Form fields must have proper labels
- Buttons must have descriptive text or `aria-label`
- Use semantic HTML (nav, main, section, article)
- Proper heading hierarchy (h1, h2, h3)

### Visual Accessibility

- Minimum font size: 14px for body text
- Line height: Minimum 1.5
- Clear focus indicators (2px ring, high contrast)
- Respect `prefers-reduced-motion`
- No auto-playing animations

## Design Patterns to Avoid

### ❌ Don't Use

- Excessive gradients (especially gradient text)
- Bright, unprofessional colors
- Too many colors on one page
- Inconsistent color usage
- Unnecessary decorative elements
- Excessive borders and shadows
- Cluttered layouts
- Generic placeholder content
- Excessive animations
- Unprofessional hover effects

### ✅ Do Use

- Subtle, professional color palette
- Consistent semantic colors
- Proper use of neutral grays
- High contrast for readability
- Clean, minimal interfaces
- Focus on content and functionality
- Subtle, purposeful design elements
- Professional, understated aesthetics

## Implementation Guidelines

### Using the Design System

1. **Use CSS Variables**: Always use CSS variables from the design system
2. **Tailwind Classes**: Use Tailwind utility classes consistently
3. **Component Library**: Use Shadcn/ui components as base
4. **Spacing Scale**: Always use the 8px grid spacing scale
5. **Typography Scale**: Use defined type scale, don't create custom sizes
6. **Color Tokens**: Use semantic color tokens, not hardcoded colors

### Code Examples

#### Professional Card
```tsx
<Card className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Card Title</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Card description
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Professional Button
```tsx
<Button className="h-10 px-4 text-sm font-medium">
  <Icon className="mr-2 h-4 w-4" />
  Button Text
</Button>
```

#### Professional Form Field
```tsx
<div className="space-y-2">
  <Label htmlFor="field" className="text-sm font-medium">
    Field Label
  </Label>
  <Input
    id="field"
    className="h-10"
    placeholder="Enter value"
  />
  {error && (
    <p className="text-sm text-destructive">{error}</p>
  )}
</div>
```

## Migration Checklist

When updating pages to use the design system:

- [ ] Remove all gradient backgrounds and gradient text
- [ ] Use semantic colors (success, warning, error, info)
- [ ] Apply consistent spacing (8px grid)
- [ ] Use typography scale consistently
- [ ] Ensure proper contrast ratios
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test in both light and dark modes
- [ ] Verify keyboard navigation
- [ ] Check screen reader compatibility
- [ ] Remove excessive animations
- [ ] Use professional, minimal design

## Resources

- **Design Tokens**: `src/index.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Component Library**: `src/components/ui/`
- **Layout Components**: `src/components/layout/`

---

**Last Updated**: 2024
**Version**: 1.0.0

