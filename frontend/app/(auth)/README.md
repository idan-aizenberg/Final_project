# Authentication Pages

This directory contains the authentication pages for WeatherSight, designed to match the application's modern, clean aesthetic.

## Pages

### Sign In (`/sign-in`)
- Email and password authentication
- Social login options (Google, GitHub)
- "Forgot password?" link
- Link to sign up page
- Form validation and error handling
- Loading states

### Sign Up (`/sign-up`)
- Full name, email, and password fields
- Password confirmation with visual feedback
- Password strength indicator (weak/medium/strong)
- Terms of Service agreement checkbox
- Social sign-up options (Google, GitHub)
- Free tier benefits display
- Form validation and error handling
- Loading states

### Forgot Password (`/forgot-password`)
- Email input for password reset
- Success state with instructions
- Link back to sign in
- Retry option if email not received

## Design Features

All authentication pages follow the WeatherSight design system:

- **Rounded UI**: Consistent use of rounded-full (buttons, inputs) and rounded-3xl (cards)
- **Color Scheme**: Uses CSS variables for light/dark theme support
- **Typography**: Inter font for body text, consistent sizing
- **Icons**: Lucide React icons throughout
- **Spacing**: Consistent padding and gaps
- **Shadows**: Elevation system for depth
- **Blur Effects**: Backdrop blur on header
- **Animations**: Smooth transitions and hover states

## Components Used

- `Button` - Primary actions with variants (default, outline, ghost)
- `Input` - Text inputs with icon support
- `Label` - Form labels
- `Card` - Container with header, content, footer
- `Separator` - Visual dividers
- `Checkbox` - Terms agreement

## Layout

The authentication pages use a dedicated `(auth)` layout that includes:
- Minimal header with WeatherSight logo
- Centered content area
- No footer (cleaner auth experience)
- Background blur effects from root layout

## Future Enhancements

- [ ] Implement actual API integration
- [ ] Add email verification flow
- [ ] Add two-factor authentication
- [ ] Add "Remember me" option
- [ ] Add rate limiting feedback
- [ ] Add CAPTCHA for bot protection
- [ ] Add OAuth provider integration
- [ ] Add password reset confirmation page

