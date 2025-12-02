import { Model } from 'mongoose';
import { IBaseRepository } from '../../../dominio/repositorios/IBaseRepository';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';

/**
 * Repositorio base MongoDB que implementa operaciones CRUD comunes
 * Reduce la duplicación de código en repositorios simples
 */
export abstract class BaseMongoRepository<T> implements IBaseRepository<T> {
  constructor(protected model: Model<any>) {}

  /**
   * Lista todos los registros
   */
  async list(): Promise<T[]> {
    const docs = await this.model.find();
    return docs.map(doc => this.toDomain(doc));
  }

  /**
   * Busca un registro por ID
   */
  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Crea un nuevo registro
   */
  async create(data: Partial<T>): Promise<T> {
    const created = await this.model.create(data);
    return this.toDomain(created);
  }

  /**
   * Actualiza un registro existente
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const updated = await this.model.findByIdAndUpdate(
      id, 
      { $set: data }, 
      { new: true, runValidators: true }
    );
    return updated ? this.toDomain(updated) : null;
  }

  /**
   * Elimina un registro
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.model.findByIdAndDelete(id);
    return !!deleted;
  }

  /**
   * Lista registros con paginación
   */
  async listPaginated(pagination: PaginationInput): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [docs, total] = await Promise.all([
      this.model.find().sort(sort).skip(skip).limit(limit),
      this.model.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Lista registros con filtros y paginación
   */
  async listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination || {};
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Construir query de filtros
    const query = this.buildFilterQuery(filters);

    const [docs, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Busca registros con texto de búsqueda
   */
  async search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination || {};
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    if (!search.query) {
      return this.listPaginated(pagination || {});
    }

    // Construir query de búsqueda
    const searchQuery = this.buildSearchQuery(search);

    const [docs, total] = await Promise.all([
      this.model.find(searchQuery).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map(doc => this.toDomain(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Cuenta registros con filtros opcionales
   */
  async count(filters?: FilterInput): Promise<number> {
    if (!filters) {
      return this.model.countDocuments();
    }
    
    const query = this.buildFilterQuery(filters);
    return this.model.countDocuments(query);
  }

  /**
   * Construye query de filtros para MongoDB
   */
  protected buildFilterQuery(filters: FilterInput): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('*')) {
          // Búsqueda con wildcard
          query[key] = { $regex: value.replace(/\*/g, '.*'), $options: 'i' };
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date) && 'operator' in value && 'value' in value) {
          // Operadores especiales
          const filterValue = value as { operator: string; value: unknown };
          switch (filterValue.operator) {
            case 'gte':
              query[key] = { $gte: filterValue.value };
              break;
            case 'lte':
              query[key] = { $lte: filterValue.value };
              break;
            case 'gt':
              query[key] = { $gt: filterValue.value };
              break;
            case 'lt':
              query[key] = { $lt: filterValue.value };
              break;
            case 'in':
              query[key] = { $in: filterValue.value };
              break;
            case 'nin':
              query[key] = { $nin: filterValue.value };
              break;
            case 'ne':
              query[key] = { $ne: filterValue.value };
              break;
            default:
              query[key] = filterValue.value;
          }
        } else {
          // Búsqueda exacta
          query[key] = value;
        }
      }
    });

    return query;
  }

  /**
   * Construye query de búsqueda de texto
   */
  protected buildSearchQuery(search: SearchInput): Record<string, unknown> {
    const { query, fields = [] } = search;
    
    if (!query) return {};

    if (fields.length === 0) {
      // Si no se especifican campos, buscar en todos los campos de texto
      return {
        $or: [
          { $text: { $search: query } },
          // Fallback para colecciones sin índice de texto
          ...this.getDefaultSearchFields().map(field => ({
            [field]: { $regex: query, $options: 'i' }
          }))
        ]
      };
    }

    // Buscar en campos específicos
    return {
      $or: fields.map(field => ({
        [field]: { $regex: query, $options: 'i' }
      }))
    };
  }

  /**
   * Obtiene campos por defecto para búsqueda
   * Puede ser sobrescrito por repositorios específicos
   */
  protected getDefaultSearchFields(): string[] {
    return ['name', 'title', 'description', 'email'];
  }

  /**
   * Método auxiliar para convertir datos a plain object
   * Estandariza el uso de toPlainObject en repositorios MongoDB
   */
  protected toPlainObject(data: Partial<T>): Record<string, unknown> {
    return (data as { toPlainObject?: () => Record<string, unknown> }).toPlainObject?.() ?? (data as Record<string, unknown>);
  }

  /**
   * Método abstracto que debe ser implementado por cada repositorio
   * para convertir documentos de MongoDB a entidades de dominio
   * @param doc - Documento de MongoDB
   * @returns Entidad de dominio
   */
  protected abstract toDomain(doc: any): T;
}

