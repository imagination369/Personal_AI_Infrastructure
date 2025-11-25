/**
 * Shared TypeScript type definitions for the PAI Dashboard
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "admin" | "user" | "viewer";

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Status types
export type Status = "active" | "inactive" | "pending" | "completed" | "failed" | "cancelled";

export type Priority = "low" | "medium" | "high" | "urgent";

// Contact types (for GoHighLevel integration)
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease";
  icon?: string;
  trend?: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Dashboard types
export interface DashboardStats {
  totalContacts: number;
  activeContacts: number;
  newContactsToday: number;
  conversionRate: number;
  revenue: number;
  revenueChange: number;
}

// Notification types
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionLabel?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketEvent<T = any> {
  event: string;
  data: T;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "tel" | "textarea" | "select" | "checkbox" | "radio" | "date";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: FormValidation;
}

export interface FormValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationParams;
  onSort?: (key: string, order: "asc" | "desc") => void;
  onPageChange?: (page: number) => void;
}

// Theme types
export type Theme = "light" | "dark" | "system";

// Export utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
