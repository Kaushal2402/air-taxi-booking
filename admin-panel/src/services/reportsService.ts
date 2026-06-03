import api from '../lib/axios'

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json'
export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly'
export type ReportStatus = 'draft' | 'running' | 'done' | 'failed' | 'scheduled'

export interface ReportTemplate {
  id: string
  name: string
  description: string | null
  report_type: string
  tag: string | null
  icon: string | null
  default_frequency: ReportFrequency
  default_format: ReportFormat
  config: Record<string, unknown> | null
  is_standard: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReportTemplateListResponse {
  items: ReportTemplate[]
  total: number
}

export interface ReportSchedule {
  id: string
  template_id: string
  name: string
  frequency: ReportFrequency
  format: ReportFormat
  recipients: string
  is_active: boolean
  next_run_at: string | null
  last_run_at: string | null
  created_at: string
}

export interface ReportExport {
  id: string
  template_id: string | null
  name: string
  format: ReportFormat
  status: ReportStatus
  file_url: string | null
  file_size_kb: string | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface ReportExportListResponse {
  items: ReportExport[]
  total: number
  page: number
  page_size: number
}

export const reportsService = {
  listTemplates: (includeInactive = false) =>
    api.get<ReportTemplateListResponse>('/reports/templates', {
      params: { include_inactive: includeInactive },
    }).then(r => r.data),

  getTemplate: (id: string) =>
    api.get<ReportTemplate>(`/reports/templates/${id}`).then(r => r.data),

  createTemplate: (body: Partial<ReportTemplate>) =>
    api.post<ReportTemplate>('/reports/templates', body).then(r => r.data),

  updateTemplate: (id: string, body: Partial<ReportTemplate>) =>
    api.patch<ReportTemplate>(`/reports/templates/${id}`, body).then(r => r.data),

  deleteTemplate: (id: string) =>
    api.delete(`/reports/templates/${id}`).then(r => r.data),

  runTemplate: (id: string, params?: { name?: string; format?: ReportFormat }) =>
    api.post<ReportExport>(`/reports/templates/${id}/run`, {
      name: params?.name,
      format: params?.format ?? 'pdf',
    }).then(r => r.data),

  listSchedules: (templateId?: string) =>
    api.get<ReportSchedule[]>('/reports/schedules', {
      params: templateId ? { template_id: templateId } : undefined,
    }).then(r => r.data),

  createSchedule: (templateId: string, body: {
    name: string
    frequency: ReportFrequency
    format: ReportFormat
    recipients: string
    next_run_at?: string
  }) => api.post<ReportSchedule>(`/reports/templates/${templateId}/schedules`, body).then(r => r.data),

  updateSchedule: (id: string, body: { is_active?: boolean; name?: string; frequency?: ReportFrequency }) =>
    api.patch<ReportSchedule>(`/reports/schedules/${id}`, body).then(r => r.data),

  deleteSchedule: (id: string) =>
    api.delete(`/reports/schedules/${id}`).then(r => r.data),

  listExports: (params?: { page?: number; page_size?: number; template_id?: string }) =>
    api.get<ReportExportListResponse>('/reports/exports', { params }).then(r => r.data),

  getExport: (id: string) =>
    api.get<ReportExport>(`/reports/exports/${id}`).then(r => r.data),

  createExport: (body: { name: string; format: ReportFormat; config?: Record<string, unknown> }) =>
    api.post<ReportExport>('/reports/exports', body).then(r => r.data),
}
