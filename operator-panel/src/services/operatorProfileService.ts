import api from '../lib/axios'

export interface OperatorProfile {
  id: string
  name: string
  trade_name: string | null
  company_registration_no: string | null
  contact_email: string | null
  contact_phone: string | null
  hq_city: string | null
  cert_type: string | null
  status: string
  onboarding_status: string
  rejection_reason: string | null
  payout_account_ref: string | null
  insurance_expiry: string | null
  cert_expiry: string | null
}

export interface OnboardingSubmitRequest {
  name: string
  company_registration_no: string
  trade_name?: string
  contact_email: string
  contact_phone: string
  hq_city?: string
  cert_type?: string
}

export interface ProfileUpdate {
  trade_name?: string
  contact_email?: string
  contact_phone?: string
  hq_city?: string
}

export interface OnboardingStatus {
  status: string
  onboarding_status: string
  rejection_reason: string | null
}

export interface OperatorDocument {
  id: string
  doc_type: string
  file_url: string
  expires_at: string | null
  status: string
  review_notes: string | null
  created_at: string
}

export interface CertificationUpload {
  doc_type: string
  file_url: string
  expires_at?: string
}

export interface InsuranceUpload {
  file_url: string
  expires_at?: string
}

export const operatorProfileService = {
  getProfile: (): Promise<OperatorProfile> =>
    api.get<OperatorProfile>('/profile').then(r => r.data),

  updateProfile: (body: ProfileUpdate): Promise<OperatorProfile> =>
    api.patch<OperatorProfile>('/profile', body).then(r => r.data),

  submitOnboarding: (body: OnboardingSubmitRequest): Promise<OperatorProfile> =>
    api.post<OperatorProfile>('/onboarding/submit', body).then(r => r.data),

  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    api.get<OnboardingStatus>('/onboarding/status').then(r => r.data),

  uploadCertification: (body: CertificationUpload): Promise<OperatorDocument> =>
    api.post<OperatorDocument>('/profile/certifications', body).then(r => r.data),

  uploadInsurance: (body: InsuranceUpload): Promise<OperatorDocument> =>
    api.post<OperatorDocument>('/profile/insurance', body).then(r => r.data),

  updatePayoutDetails: (payout_account_ref: string): Promise<OperatorProfile> =>
    api.patch<OperatorProfile>('/payout-details', { payout_account_ref }).then(r => r.data),

  listDocuments: (): Promise<OperatorDocument[]> =>
    api.get<OperatorDocument[]>('/profile/documents').then(r => r.data),
}
