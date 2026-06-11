# Senior Kickoff — Module 01: App Bootstrap & Authentication

## Screens (8 total)
1. SplashScreen (1.1) — brand splash + loading indicator while branding/auth state loads
2. WelcomeScreen (1.2) — forest hero, city+routes SVG, onboarding slide dots, Get Started / Sign In CTAs
3. SignInScreen (1.3) — email+password form, forgot password, social login (Google/Apple stubs)
4. OtpScreen (1.4) — 6-box OTP entry, 60s countdown timer, resend, phone display
5. SignUpScreen (1.5) — forest header, full name/email/phone/password form, password strength bar, T&C checkbox
6. ProfileSetupScreen (1.6) — step tracker (3 steps), avatar picker stub, display name, home city, notifications toggle
7. ForgotPasswordScreen (1.7) — email input, "Send reset link" CTA
8. ResetSentScreen (1.8) — success state, check inbox message, back to sign in

## API Endpoints (10 needed, all PENDING)
- POST /api/v1/app/auth/register
- POST /api/v1/app/auth/otp/send
- POST /api/v1/app/auth/otp/verify
- POST /api/v1/app/auth/login
- POST /api/v1/app/auth/logout
- POST /api/v1/app/auth/refresh
- GET /api/v1/app/auth/me
- PATCH /api/v1/app/auth/me
- POST /api/v1/app/auth/forgot-password
- POST /api/v1/app/auth/reset-password

## Special Concerns
- GoRouter + Riverpod bridge: AuthStateNotifier (ValueNotifier) passed to GoRouter.refreshListenable — avoids double-ProviderContainer bug
- OTP timer: Timer.periodic in StatefulWidget — must call timer.cancel() in dispose()
- Social auth: Google/Apple buttons render but tap → SnackBar "Coming soon" (package not in pubspec)
- Avatar upload: ProfileSetupScreen shows camera button → SnackBar "Photo upload coming soon" (image_picker not in pubspec yet)
- Password strength: 4-level bar (Weak/Fair/Good/Strong) based on length + character class checks — pure local logic, no API call
- RTL: all screens use EdgeInsetsDirectional — verify with RTL test wrapper

## Files Scaffolded
- lib/features/auth/domain/auth_models.dart
- lib/features/auth/domain/auth_provider.dart
- lib/features/auth/data/services/auth_service.dart
- lib/features/auth/presentation/screens/{splash,welcome,sign_in,otp,sign_up,profile_setup,forgot_password,reset_sent}_screen.dart
