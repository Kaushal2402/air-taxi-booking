/**
 * Extracts a human-readable error message and 403 flag from an axios error.
 * Covers the backend's { detail: string } and { message: string } shapes.
 */
export function parseApiError(e: unknown): { message: string; isForbidden: boolean; permissionKey: string | null } {
  const err = e as { response?: { status?: number; data?: { detail?: string; message?: string } } }
  const status = err?.response?.status ?? 0
  const raw = err?.response?.data?.detail || err?.response?.data?.message || 'An unexpected error occurred.'
  const keyMatch = raw.match(/'([\w.]+)'\s+permission/)
  return {
    message: raw,
    isForbidden: status === 403,
    permissionKey: keyMatch ? keyMatch[1] : null,
  }
}
