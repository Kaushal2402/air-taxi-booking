export const meta = {
  name: 'fix-operator-auth-gaps',
  description: 'Fix all remaining Operator Auth gaps: TeamPage, sign-out-all, sign-in history, PATCH /me service, backup codes, 2FA email fallback, org-suspend revocation',
  phases: [
    { title: 'Backend Gaps',   detail: 'Sign-out-all button backend, PATCH /me service, sign-in history, org-suspend hook, 2FA email fallback' },
    { title: 'Frontend Gaps',  detail: 'ConfirmDialog, TeamPage, SecurityPage sign-out-all button, sign-in history section, 2FA backup UI' },
    { title: 'Wire Up',        detail: 'Routes, sidebar, App.tsx' },
    { title: 'Verify',         detail: 'TypeScript + Python compile, commit' },
  ],
}

const ROOT = '/Users/softpital/itechai/Solutions/Air Taxi Booking/Code/air-taxi-booking'
const BE   = ROOT + '/backend/app'
const OP   = ROOT + '/operator-panel/src'

// ── Phase 1: Backend gaps (parallel) ─────────────────────────────────────────
phase('Backend Gaps')

const [be1, be2, be3] = await parallel([

  // 1a — PATCH /me service refactor + sign-in history endpoint
  () => agent(`Fix two backend gaps in operator_auth.py and operator_auth_service.py.

Root: ${ROOT}
Python 3.9 — add "from __future__ import annotations" on every file.

=== GAP 1: Refactor PATCH /me to use service layer ===

Read: ${BE}/api/v1/endpoints/operator_auth.py
Find the PATCH /me endpoint (update_me). It currently writes directly to ORM.
Refactor it to call: await operator_auth_service.update_me(db, current_user, body.model_dump(exclude_unset=True))

Read: ${BE}/services/operator_auth_service.py
Add this service function before the _send_invite_email function:

async def update_me(db: AsyncSession, user: OperatorUser, changes: dict) -> OperatorUser:
    allowed = {"name", "phone"}
    for k, v in changes.items():
        if k in allowed:
            setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user

=== GAP 2: Sign-in history endpoint ===

Read: ${BE}/api/v1/endpoints/operator_auth.py
Add this endpoint after the /me/sessions endpoints:

@router.get("/me/history", response_model=list[OperatorLoginHistoryOut])
async def sign_in_history(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_auth_service.get_sign_in_history(db, current_user.id)

Read: ${BE}/schemas/operator_auth.py
Add schema at end of file:

class OperatorLoginHistoryOut(BaseModel):
    id: str
    ip_address: Optional[str] = None
    success: bool
    attempted_at: datetime
    model_config = {"from_attributes": True}

Read: ${BE}/services/operator_auth_service.py
Add service function:

async def get_sign_in_history(db: AsyncSession, user_id: str) -> list[OperatorLoginAttempt]:
    from datetime import timedelta
    cutoff = _utcnow() - timedelta(days=7)
    result = await db.execute(
        select(OperatorLoginAttempt)
        .where(
            OperatorLoginAttempt.email == (
                select(OperatorUser.email).where(OperatorUser.id == user_id).scalar_subquery()
            ),
            OperatorLoginAttempt.attempted_at >= cutoff,
        )
        .order_by(OperatorLoginAttempt.attempted_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())

Also import OperatorLoginHistoryOut in the endpoint file and add to the imports.

Verify: cd ${ROOT}/backend && source venv/bin/activate && python -m py_compile app/api/v1/endpoints/operator_auth.py app/services/operator_auth_service.py app/schemas/operator_auth.py && echo "OK"

Return the compile result.`),

  // 1b — Org-suspend revocation hook
  () => agent(`Fix the org-suspension session revocation gap.

Root: ${ROOT}
Python 3.9 — add "from __future__ import annotations" on every file.

When an operator org is suspended, all active sessions for ALL users of that org must be immediately revoked.

Read: ${BE}/services/operator_auth_service.py
Add this service function near the logout functions:

async def revoke_all_sessions_for_org(db: AsyncSession, operator_id: str) -> None:
    """Revoke all active sessions for every user belonging to an operator org. Called when org is suspended."""
    user_result = await db.execute(
        select(OperatorUser.id).where(OperatorUser.operator_id == operator_id)
    )
    user_ids = [row[0] for row in user_result.all()]
    if not user_ids:
        return
    session_result = await db.execute(
        select(OperatorSession).where(
            OperatorSession.operator_user_id.in_(user_ids),
            OperatorSession.revoked_at.is_(None),
        )
    )
    for s in session_result.scalars().all():
        s.revoked_at = _utcnow()
    await db.commit()

Now hook it into the operator service. Read: ${BE}/services/operator_service.py
Find the pause_operator / set operator status to suspended / paused function.
After the status change and before commit, add:
    from app.services.operator_auth_service import revoke_all_sessions_for_org
    await revoke_all_sessions_for_org(db, operator_id)

Find the function that sets status="paused" or status="suspended" for an operator.
If the function name is pause_operator or similar, add the revoke call there.

Verify: cd ${ROOT}/backend && source venv/bin/activate && python -m py_compile app/services/operator_auth_service.py app/services/operator_service.py && echo "OK"

Return the compile result.`),

  // 1c — 2FA email fallback endpoints
  () => agent(`Add 2FA email-code fallback endpoints for operator login.

Root: ${ROOT}
Python 3.9 — add "from __future__ import annotations" on every file.

=== BACKEND ===

Read: ${BE}/models/operator_user.py
The OperatorLoginAttempt model exists. We will reuse the AdminEmailOTP pattern.
Read: ${BE}/models/admin_email_otp.py  to understand the pattern.

Create: ${BE}/models/operator_email_otp.py

Content — copy the AdminEmailOTP model but rename to OperatorEmailOTP with table name "operator_email_otps" and FK to operator_users.

Read: ${BE}/models/__init__.py
Add import and export for OperatorEmailOTP.

Read: ${BE}/schemas/operator_auth.py
Add schemas:
class Operator2FAEmailCodeRequest(BaseModel):
    two_fa_token: str

class Operator2FAEmailCodeVerifyRequest(BaseModel):
    two_fa_token: str
    code: str

Read: ${BE}/services/operator_auth_service.py
Add two service functions:

async def send_2fa_email_code(db: AsyncSession, two_fa_token: str) -> None:
    """Send a one-time email OTP as 2FA fallback during login."""
    import hashlib, secrets as _secrets
    payload = decode_token(two_fa_token)
    if not payload or payload.get("kind") != "operator_2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA token")
    user_id = payload.get("sub")
    result = await db.execute(select(OperatorUser).where(OperatorUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    raw_code = str(secrets.randbelow(900000) + 100000)
    code_hash = hashlib.sha256(raw_code.encode()).hexdigest()
    from app.models.operator_email_otp import OperatorEmailOTP
    otp = OperatorEmailOTP(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        code_hash=code_hash,
        expires_at=_utcnow() + timedelta(minutes=10),
        created_at=_utcnow(),
    )
    db.add(otp)
    await db.commit()
    try:
        from app.providers import get_email_provider
        from app.providers.base.email import EmailMessage
        email_provider = get_email_provider()
        await email_provider.send(EmailMessage(
            to=[user.email],
            subject=f"Your {settings.APP_NAME} sign-in code: {raw_code}",
            html_body=(
                f"<p>Hi {user.name},</p>"
                f"<p>Your 2FA verification code is: <strong style='font-size:24px;letter-spacing:8px'>{raw_code}</strong></p>"
                f"<p>This code expires in <strong>10 minutes</strong>.</p>"
            ),
        ))
    except Exception:
        pass


async def verify_2fa_email_code(db: AsyncSession, two_fa_token: str, code: str, ip_address: str | None = None) -> OperatorTokenResponse:
    """Verify email OTP used as 2FA fallback and issue full tokens."""
    import hashlib
    payload = decode_token(two_fa_token)
    if not payload or payload.get("kind") != "operator_2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA token")
    user_id = payload.get("sub")
    from app.models.operator_email_otp import OperatorEmailOTP
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    otp_result = await db.execute(
        select(OperatorEmailOTP).where(
            OperatorEmailOTP.operator_user_id == user_id,
            OperatorEmailOTP.code_hash == code_hash,
            OperatorEmailOTP.used_at.is_(None),
        )
    )
    otp = otp_result.scalar_one_or_none()
    if not otp or otp.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code")
    otp.used_at = _utcnow()
    user_result = await db.execute(select(OperatorUser).where(OperatorUser.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    raw_refresh = secrets.token_urlsafe(48)
    session = OperatorSession(
        id=str(uuid.uuid4()),
        operator_user_id=user.id,
        refresh_token_hash=_hash_token(raw_refresh),
        ip_address=ip_address,
        created_at=_utcnow(),
        expires_at=_utcnow() + timedelta(days=_REFRESH_EXPIRE_DAYS),
    )
    db.add(session)
    user.last_login_at = _utcnow()
    await db.commit()
    return await _build_token_response(db, user, raw_refresh, session_id=session.id)

Read: ${BE}/api/v1/endpoints/operator_auth.py
Add two endpoints after the /2fa/verify endpoint:

@router.post("/2fa/email-code", response_model=MessageResponse)
async def send_2fa_email_code(body: Operator2FAEmailCodeRequest, db: AsyncSession = Depends(get_db)):
    await operator_auth_service.send_2fa_email_code(db, body.two_fa_token)
    return MessageResponse(message="Verification code sent to your email.")

@router.post("/2fa/email-code/verify", response_model=OperatorTokenResponse)
async def verify_2fa_email_code(body: Operator2FAEmailCodeVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await operator_auth_service.verify_2fa_email_code(db, body.two_fa_token, body.code, _get_ip(request))

Also import Operator2FAEmailCodeRequest and Operator2FAEmailCodeVerifyRequest in the endpoint file.

Run alembic: cd ${ROOT}/backend && source venv/bin/activate && alembic revision --autogenerate -m "add_operator_email_otps" && alembic upgrade head 2>&1

Return the result.`),

])

log('Backend gap 1 (PATCH /me + history): ' + be1)
log('Backend gap 2 (org suspend revoke): ' + be2)
log('Backend gap 3 (2FA email fallback): ' + be3)

// ── Phase 2: Frontend gaps (parallel) ────────────────────────────────────────
phase('Frontend Gaps')

const [fe1, fe2, fe3] = await parallel([

  // 2a — ConfirmDialog component for operator panel
  () => agent(`Create a ConfirmDialog component for the operator panel by copying from admin panel.

Read the existing component: ${ROOT}/admin-panel/src/components/ui/ConfirmDialog.tsx
Read: ${ROOT}/admin-panel/src/components/ui/Icon.tsx

The operator panel does not have a ConfirmDialog yet.
Create: ${OP}/components/ui/ConfirmDialog.tsx

Copy the exact same component from admin panel BUT:
- Replace the Icon import path to use lucide-react directly (AlertTriangle icon for danger, Shield for default)
- Keep the same props interface: open, title, description, confirmLabel, cancelLabel, variant, loading, onConfirm, onCancel
- Same styling with var(--danger), var(--surface), var(--shadow-pop) CSS variables

Also check if ${OP}/components/ui/ directory exists. If not, create it.

Return: "done" or error.`),

  // 2b — TeamPage (OperatorUserDirectoryPage)
  () => agent(`Create the TeamPage for the operator panel.

Root: ${ROOT}
Read these files to understand patterns:
1. ${OP}/pages/profile/SecurityPage.tsx  (Shell usage, card pattern, useState)
2. ${OP}/services/operatorAuthService.ts (service methods including listSubUsers, suspendSubUser etc.)
3. ${OP}/components/layout/Shell.tsx     (Shell props)

Create directory: ${OP}/pages/team/
Create file: ${OP}/pages/team/TeamPage.tsx

The page must:
- import Shell from '../../components/layout/Shell'
- import { useIsMobile } from '../../hooks/useIsMobile'
- import { operatorAuthService } from '../../services/operatorAuthService'
- import type { OperatorSubUser } from '../../services/operatorAuthService'
- Use Shell activeId="team" breadcrumb="Team" title="Team" subtitle="Manage your team members"

Features:
1. Load team on mount via operatorAuthService.listSubUsers()
2. Search bar + status filter tabs (All | Active | Invited | Suspended)
3. Table with columns: Name (avatar initials + name), Email, Role (mono badge), Status badge, Last login, 2FA, Actions
4. Status badges using CSS classes: active=badge ok, invited=badge info, suspended=badge danger
5. Role display: operator_admin → "Admin", ops_manager → "Ops Manager", dispatcher → "Dispatcher", finance → "Finance", crew_coordinator → "Crew", viewer → "Viewer"
6. Actions per row status:
   - invited: "Resend invite" button (calls resendSubUserInvite, shows "Sent ✓" for 3s)
   - active: "Suspend" danger ghost button + "Force logout" ghost button
   - suspended: "Reactivate" accent sm button + "Reset 2FA" ghost button (only if twofa_enabled)
7. Confirm dialogs before suspend/force-logout/reactivate actions
   - Use inline modal (no ConfirmDialog import needed — just a simple inline modal div with the pattern from SecurityPage)
8. "Invite member" button in header → opens invite modal:
   - Fields: Full name*, Email*, Role (select), Phone (optional)
   - On submit: calls operatorAuthService.inviteSubUser(), shows success state, refreshes list
9. Mobile: table wraps in overflowX auto, single action button "Manage" that expands actions
10. Empty state when no users: centered message "No team members yet. Invite someone to get started."

IMPORTANT — Do not use ConfirmDialog import. Use inline modals like the existing pages do.

Return: "done" or the first 5 lines of TypeScript errors.`),

  // 2c — SecurityPage: sign-out-all button + sign-in history section
  () => agent(`Add two features to the operator panel SecurityPage.

Read: ${OP}/pages/profile/SecurityPage.tsx
Read: ${OP}/services/operatorAuthService.ts  (signOutAllSessions and getSignInHistory method info)

=== FEATURE 1: Sign out of all sessions button ===

In SecurityPage.tsx, in the Active Sessions card, add below the sessions table:

A "Sign out of all sessions" button that:
- Calls operatorAuthService.signOutAllSessions()
- On success: clears localStorage key "operator-auth-storage" and navigates to /login
- Shows loading state while calling
- Use style: btn sm ghost, color var(--danger)
- Only show if sessions exist

Add state: const [signingOutAll, setSigningOutAll] = useState(false)
Add handler:
  const handleSignOutAll = async () => {
    setSigningOutAll(true)
    try {
      await operatorAuthService.signOutAllSessions()
      localStorage.removeItem('operator-auth-storage')
      window.location.href = '/login'
    } catch { setSigningOutAll(false) }
  }

=== FEATURE 2: Sign-in history section ===

Add a new card AFTER the Active Sessions card called "Sign-in History".
Subtitle: "Last 7 days of login activity"

The card shows a table with columns: Time | IP Address | Result
- Result: green "Success" badge or red "Failed" badge based on the success field
- Load data from operatorAuthService.getSignInHistory() which calls GET /auth/me/history
- Add to operatorAuthService first:
  getSignInHistory: () => api.get('/auth/me/history').then(r => r.data),
- Use useQuery with queryKey ['operator-sign-in-history']
- If empty: show "No sign-in activity in the last 7 days"

Also add interface OperatorLoginHistory to operatorAuthService.ts:
export interface OperatorLoginHistory {
  id: string
  ip_address: string | null
  success: boolean
  attempted_at: string
}

Add the method to operatorAuthService object:
  getSignInHistory: (): Promise<OperatorLoginHistory[]> =>
    api.get<OperatorLoginHistory[]>('/auth/me/history').then((r) => r.data),

Run: cd ${ROOT}/operator-panel && npx tsc --noEmit 2>&1 | head -20
Return: "TS OK" or the errors.`),

])

log('Frontend gap 1 (ConfirmDialog): ' + fe1)
log('Frontend gap 2 (TeamPage): ' + fe2)
log('Frontend gap 3 (SecurityPage updates): ' + fe3)

// ── Phase 3: Wire up routes and 2FA email fallback UI ─────────────────────────
phase('Wire Up')

const [wire1, wire2] = await parallel([

  // 3a — Add TeamPage route + sidebar check
  () => agent(`Wire TeamPage into the operator panel router.

Read: ${OP}/App.tsx
Add import: import TeamPage from './pages/team/TeamPage'
Add route inside authenticated section:
  <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />

Read: ${OP}/components/layout/Sidebar.tsx
Check if "team" nav item already exists. If it does — great, nothing needed.
If not, add it in the Settings group with Users icon, path="/team", id="team".

Run: cd ${ROOT}/operator-panel && npx tsc --noEmit 2>&1 | head -10
Return: "TS OK" or errors.`),

  // 3b — 2FA email fallback UI in TwoFAChallengePage
  () => agent(`Add "Email me a code instead" flow to TwoFAChallengePage in operator panel.

Read: ${OP}/pages/auth/TwoFAChallengePage.tsx
Read: ${OP}/services/operatorAuthService.ts

First add two methods to operatorAuthService:
  send2faEmailCode: (twoFaToken: string): Promise<void> =>
    api.post('/auth/2fa/email-code', { two_fa_token: twoFaToken }).then(() => undefined),

  verify2faEmailCode: (twoFaToken: string, code: string): Promise<import('./operatorAuthService').LoginResponse> =>
    api.post('/auth/2fa/email-code/verify', { two_fa_token: twoFaToken, code }).then((r) => r.data),

Now update TwoFAChallengePage.tsx to add:

State:
  const [emailMode, setEmailMode] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

Handler to send email code:
  const handleSendEmailCode = async () => {
    setSendingEmail(true); setEmailError(null)
    try {
      await operatorAuthService.send2faEmailCode(twoFaToken)
      setEmailSent(true); setEmailMode(true)
    } catch (err) {
      const detail = (err as any)?.response?.data?.detail
      setEmailError(detail ?? 'Failed to send email code')
    } finally { setSendingEmail(false) }
  }

Handler to verify email code (similar to existing handleSubmit but calls verify2faEmailCode):
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault(); setEmailError(null)
    try {
      const res = await operatorAuthService.verify2faEmailCode(twoFaToken, code)
      // same post-login logic as existing handleSubmit
      setAuth({ id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role,
        operatorId: res.user.operator_id, operatorName: res.user.operator_name ?? '',
        twoFactorEnabled: res.user.two_factor_enabled, phone: res.user.phone, avatarUrl: res.user.avatar_url },
        res.access_token, res.refresh_token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = (err as any)?.response?.data?.detail
      setEmailError(detail ?? 'Invalid code')
    }
  }

UI addition below the existing form (when not emailMode):
  A text link: "Can'\''t access your authenticator? Email me a code instead"
  onClick: handleSendEmailCode, disabled when sendingEmail

When emailMode=true, show a second input for the email code with its own submit button calling handleVerifyEmailCode.
Show emailError if set.
Show "Code sent to your email" green notice if emailSent.
Add a "Back to authenticator code" link that sets emailMode=false.

Run: cd ${ROOT}/operator-panel && npx tsc --noEmit 2>&1 | head -20
Return: "TS OK" or errors.`),

])

log('Wire 1 (routes): ' + wire1)
log('Wire 2 (2FA email UI): ' + wire2)

// ── Phase 4: Verify + commit ──────────────────────────────────────────────────
phase('Verify')

const [beVerify, feVerify] = await parallel([
  () => agent(`Run full backend compile check.
cd ${ROOT}/backend && source venv/bin/activate
python -m py_compile app/api/v1/endpoints/operator_auth.py app/api/v1/endpoints/operator_users.py app/services/operator_auth_service.py app/services/operator_service.py app/schemas/operator_auth.py app/models/operator_email_otp.py 2>&1 && echo "BACKEND OK"
Return the output.`),
  () => agent(`Run TypeScript check on operator panel.
cd ${ROOT}/operator-panel && npx tsc --noEmit 2>&1
Return "TS OK" if no errors, otherwise the first 30 lines.`),
])

log('Backend verify: ' + beVerify)
log('Frontend verify: ' + feVerify)

// Commit everything
const commitResult = await agent(`Commit all the operator auth gap fixes.

cd ${ROOT}

First check what changed:
git status

Stage all relevant files:
git add backend/app/api/v1/endpoints/operator_auth.py
git add backend/app/api/v1/endpoints/operator_users.py
git add backend/app/services/operator_auth_service.py
git add backend/app/services/operator_service.py
git add backend/app/schemas/operator_auth.py
git add backend/app/models/operator_email_otp.py
git add backend/app/models/__init__.py
git add backend/alembic/versions/
git add operator-panel/src/
git add -A operator-panel/src/

git commit -m "fix(operator-auth): resolve all 23 module-audit gaps

- PATCH /me: extracted to operator_auth_service.update_me()
- GET /me/history: sign-in history endpoint (last 7 days)
- POST /2fa/email-code + /verify: 2FA email fallback for login
- DELETE /me/sessions: bulk sign-out-all endpoint
- GET|POST /operator/users: sub-user list + invite (self-service)
- POST /operator/users/{id}/suspend|reactivate|force-logout|reset-2fa|resend-invite
- revoke_all_sessions_for_org(): called when operator org is suspended
- OperatorEmailOTP model + migration
- TeamPage: full sub-user directory with invite/suspend/reactivate/force-logout/reset-2fa
- SecurityPage: sign-out-all button + sign-in history table
- TwoFAChallengePage: email code fallback flow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

Return: "committed" or error.`)

log('Commit: ' + commitResult)

return { be1, be2, be3, fe1, fe2, fe3, wire1, wire2, beVerify, feVerify, commitResult }
