// Common API response shapes

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string | null;
}

// User / Auth
export type UserRole =
  | "super_admin"
  | "sub_admin"
  | "support_agent"
  | "finance_manager"
  | "dispatcher";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "pending";
  created_at: string;
}

// Booking
export type BookingStatus =
  | "requested"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_driver"
  | "cancelled_by_system"
  | "disputed";

export type ServiceType =
  | "cab"
  | "bike"
  | "rental"
  | "outstation"
  | "helicopter"
  | "charter"
  | "shuttle"
  | "vip";
