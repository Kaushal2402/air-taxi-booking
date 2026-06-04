# Module 18 — Notifications — API Contract

All endpoints under `/api/v1/notifications`.
Every endpoint requires `_: AdminUser = Depends(get_current_admin_user)`.

---

## Stats
GET /api/v1/notifications/stats → NotificationStatsResponse

## Delivery Log
GET /api/v1/notifications/delivery-log?page=1&page_size=50 → NotificationLogListResponse

## Broadcast
POST /api/v1/notifications/broadcast → BroadcastResponse (201)

## Templates (static before dynamic)
GET    /api/v1/notifications/templates                → NotificationTemplateListResponse
POST   /api/v1/notifications/templates                → NotificationTemplateResponse (201)
GET    /api/v1/notifications/templates/{id}           → NotificationTemplateResponse
PATCH  /api/v1/notifications/templates/{id}           → NotificationTemplateResponse
DELETE /api/v1/notifications/templates/{id}           → 204

---

## DB Tables
- notification_templates (id, name, template_code UNIQUE, event_trigger, channels JSON, status, category, push_title, push_body, sms_body, email_subject, email_body, wa_body, priority, quiet_hours_override, sms_fallback_seconds, dedup_window_seconds, sent_30d, open_rate)
- notification_logs (id, template_id FK NULL, template_name, channel, recipient, status, created_at)
- notification_broadcasts (id, audience_description, channel, message, status, scheduled_at, estimated_reach)
