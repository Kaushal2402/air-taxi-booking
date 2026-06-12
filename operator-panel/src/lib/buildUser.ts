import type { OperatorUserOut } from '../services/operatorAuthService'

/** Convert the API OperatorUserOut into the auth store shape. */
export function buildUserFromApi(u: OperatorUserOut) {
  return {
    id:               u.id,
    name:             u.name,
    email:            u.email,
    role:             u.role,
    operatorId:       u.operator_id,
    operatorName:     u.operator_name ?? '',
    twoFactorEnabled: u.two_factor_enabled,
    phone:            u.phone,
    avatarUrl:        u.avatar_url,
    timezone:         u.timezone   ?? 'Asia/Kolkata',
    language:         u.language   ?? 'en',
    dateFormat:       u.date_format ?? 'DD/MM/YYYY',
    timeFormat:       u.time_format ?? '24h',
  }
}
