export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface RouteParams {
  params: Promise<{ id: string }>;
}
