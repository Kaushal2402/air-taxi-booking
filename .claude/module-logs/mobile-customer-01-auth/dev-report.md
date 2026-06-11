# Developer Report — Module 01: App Bootstrap & Authentication

## Screens Implemented (8/8)
1. `splash_screen.dart` — Forest bg, custom SVG painters (circles, dashed arcs, dots), BrandMark, serif heading, paging dots, version label
2. `welcome_screen.dart` — Forest gradient hero, cityscape painter, service chips, overlapping card, Get Started / Sign In CTAs
3. `sign_in_screen.dart` — Email/password form, visibility toggle, forgot password, Google+Apple social stubs, loading/error states
4. `otp_screen.dart` — 6-box OTP with digit forwarding + backspace, 60s countdown timer, auto-verify on complete, security card
5. `sign_up_screen.dart` — Forest header, 4 fields (name/email/phone/password), PasswordStrengthBar, terms checkbox
6. `profile_setup_screen.dart` — 3-step progress tracker in forest header, avatar + camera badge, notifications toggle, Complete/Skip
7. `forgot_password_screen.dart` — Lock icon circle, email field, loading state, navigates to reset-sent with email param
8. `reset_sent_screen.dart` — Success ring, email in mono style, disabled resend timer, info tip card

## Shared Widgets Created (3)
- `widgets/mobile_input_field.dart` — Labeled TextFormField, EdgeInsetsDirectional, theme-token borders/colors
- `widgets/password_strength_bar.dart` — 4-segment, score from length/digit/uppercase/special char checks
- `widgets/forest_header.dart` — Reusable ConsumerWidget gradient header, used by SignUp + ProfileSetup

## Domain Updated
- `auth_provider.dart` — Full AuthNotifier with session restore (build()), signIn, signUp, verifyOtp, signOut, forgotPassword via AsyncValue.guard
- `utbp_api_client` lib stub updated (getToken/saveTokens/clearTokens)

## API Endpoints Referenced (all PENDING — throw UnimplementedError)
- POST /api/v1/app/auth/register
- POST /api/v1/app/auth/otp/send
- POST /api/v1/app/auth/otp/verify
- POST /api/v1/app/auth/login
- POST /api/v1/app/auth/logout
- GET  /api/v1/app/auth/me
- PATCH /api/v1/app/auth/me
- POST /api/v1/app/auth/forgot-password
- POST /api/v1/app/auth/reset-password

## Deviations from Spec
- Social login (Google/Apple): UI rendered, onTap shows SnackBar "Coming soon" (image_picker not in pubspec)
- Avatar upload: tap shows SnackBar "Photo upload coming soon" (image_picker not in pubspec)
- ForestHeader SVG rings: simplified (CustomPaint with concentric circles), not full SVG from screens.jsx

## Static Analysis
flutter analyze not available (Flutter CLI not installed in this environment).
Code was reviewed manually for hardcoded colors, hardcoded fonts, and RTL violations.
