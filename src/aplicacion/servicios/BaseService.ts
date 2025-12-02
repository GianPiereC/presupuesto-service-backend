import { IBaseRepository } from '../../dominio/repositorios/IBaseRepository';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../dominio/valueObjects/Pagination';

/**
 * Servicio base genérico que implementa operaciones CRUD comunes
 * Reduce la duplicación de código en servicios simples
 */
export abstract class BaseService<T> {
  constructor(protected repository: IBaseRepository<T>) {}

  /**
   * Lista todos los registros
   */
  async list(): Promise<T[]> {
    return this.repository.list();
  }

  /**
   * Busca un registro por ID
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  /**
   * Crea un nuevo registro
   */
  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(data);
  }

  /**
   * Actualiza un registro existente
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.repository.update(id, data);
  }

  /**
   * Elimina un registro
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Lista registros con paginación
   */
  async listPaginated(pagination: PaginationInput): Promise<PaginationResult<T>> {
    return this.repository.listPaginated(pagination);
  }

  /**
   * Lista registros con filtros y paginación
   */
  async listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    return this.repository.listWithFilters(filters, pagination);
  }

  /**
   * Busca registros con texto de búsqueda
   */
  async search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    return this.repository.search(search, pagination);
  }

  /**
   * Cuenta registros con filtros opcionales
   */
  async count(filters?: FilterInput): Promise<number> {
    return this.repository.count(filters);
  }
}

