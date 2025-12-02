/**
 * Interfaces para paginación y filtros en el sistema
 */

export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filtro con operadores soportados
 */
export type FilterOperator = 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in' | 'nin' | 'ne';

export interface FilterValue {
  operator: FilterOperator;
  value: string | number | boolean | Date | Array<string | number>;
}

/**
 * Input de filtros - puede ser un valor directo o un objeto con operador
 */
export type FilterValueInput = string | number | boolean | Date | FilterValue;

export interface FilterInput {
  [key: string]: FilterValueInput | undefined;
}

export interface SearchInput {
  query?: string;
  fields?: string[];
}

export interface PaginationFilterInput extends PaginationInput {
  filters?: FilterInput;
  search?: SearchInput;
}

