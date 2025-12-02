import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../valueObjects/Pagination';

/**
 * Interfaz base para repositorios con operaciones CRUD comunes
 */
export interface IBaseRepository<T> {
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  
  // Métodos de paginación y filtros
  listPaginated(pagination: PaginationInput): Promise<PaginationResult<T>>;
  listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<T>>;
  search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<T>>;
  count(filters?: FilterInput): Promise<number>;
}

