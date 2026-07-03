export type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
