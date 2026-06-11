# QA Audit Report — Module 01: App Bootstrap & Authentication
**Date:** 2026-06-11  
**Verdict: PARTIAL**

---

## P1 Checks (all pass ✓)

| Check | Result | Notes |
|---|---|---|
| Hardcoded brand colors in screens | ✓ PASS | Only `Colors.white` (on dark bg) + semantic `Color(0xFFC97B0C)` warn (allowed) |
| Hardcoded font family strings in screens | ✓ PASS | All text via `theme.textTheme.*` |
| Static/hardcoded user data displayed | ✓ PASS | All content from state/providers |
| JWT in SharedPreferences | ✓ PASS | Tokens stored in `flutter_secure_storage` via `UtbpApiClient` |
| RTL violations (directional EdgeInsets) | ✓ PASS | All `EdgeInsets.only(top:)` — vertical only, no horizontal direction |
| print() statements | ✓ PASS | None found |
| Loading states on interactive screens | ✓ PASS | All 5 interactive screens have `isLoading` guards |
| Error states | ✓ PASS | errorMsg displayed on SignIn, OTP, SignUp, ForgotPassword |
| Auth state clears on logout | ✓ PASS | `signOut()` calls `clearTokens()` + sets `AuthState.guest` |

## P2 Issues (code quality, non-blocking)

| # | File | Issue | Recommendation |
|---|---|---|---|
| P2-1 | `profile_setup_screen.dart` | 424 lines — exceeds 200-line limit | Extract `_StepTracker`, `_AvatarPicker`, `_NotificationsToggle` widgets |
| P2-2 | `welcome_screen.dart` | 417 lines | Extract `_ServiceChipsRow`, `_HeroContent`, `_ContentCard` |
| P2-3 | `otp_screen.dart` | 411 lines | Extract `_OtpBoxRow`, `_SecurityCard`, `_ResendSection` |
| P2-4 | `sign_up_screen.dart` | 364 lines | Extract `_TermsCheckbox`, `_SignUpForm` |
| P2-5 | `sign_in_screen.dart` | 359 lines | Extract `_SocialButtons`, `_SignInForm` |
| P2-6 | `splash_screen.dart` | 325 lines | Extract `_SplashDecorPainter` to separate file |
| P2-7 | `utbp_theme/utbp_theme.dart:408` | `fontFamily: 'IBMPlexMono'` hardcoded in labelSmall | Acceptable — backend config has no monoFont field. Document as known limitation. |

## API Contract Check

All 9 auth endpoints are correctly referenced as `UnimplementedError` stubs.
Backend change request filed: `.claude/module-logs/mobile-customer-01-auth/BACKEND_CHANGE_REQUEST.md`

## Screen Coverage vs Spec

| Screen | Spec | Implemented | Complete |
|---|---|---|---|
| 1.1 Splash | Forest bg, SVG, BrandMark, dots, version | ✓ Custom painter + all elements | ✓ |
| 1.2 Welcome | Hero, cityscape, chips, card, CTAs | ✓ CustomPaint cityscape, all CTAs | ✓ |
| 1.3 Sign In | Email/pw, social, footer | ✓ Full form + stubs | ✓ |
| 1.4 OTP | 6 boxes, timer, resend | ✓ Digit forwarding + auto-verify | ✓ |
| 1.5 Sign Up | 4 fields, strength bar, T&C | ✓ PasswordStrengthBar widget | ✓ |
| 1.6 Profile Setup | Step tracker, avatar, toggle | ✓ 3-step tracker, animated toggle | ✓ |
| 1.7 Forgot Password | Lock icon, email, CTA | ✓ Complete | ✓ |
| 1.8 Reset Sent | Success ring, email, resend | ✓ Complete | ✓ |

## Conclusion

**PARTIAL** — All P1 checks pass. 7 P2 widget-size issues are code quality concerns.
Screen coverage is 8/8. Branding rules respected. Auth state management correct.

Recommend proceeding to commit. P2 refactors can be addressed in a follow-up PR.
