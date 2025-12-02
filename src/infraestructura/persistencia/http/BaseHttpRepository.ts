import { GraphQLClient } from '../../http/GraphQLClient';
import { SimpleServiceRegistry } from '../../discovery/ServiceRegistry';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';
import { logger } from '../../logging';

/**
 * Repositorio base HTTP que implementa la lógica común de inicialización del cliente GraphQL
 * Reduce la duplicación de código en repositorios HTTP
 */
export abstract class BaseHttpRepository<T> {
  protected client: GraphQLClient | null = null;
  protected baseUrl?: string;
  protected serviceRegistry = SimpleServiceRegistry.getInstance();

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      this.client = new GraphQLClient(baseUrl);
    }
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   * @param serviceName - Nombre del servicio en el ServiceRegistry
   * @param fallbackServiceName - Nombre del servicio fallback en el ServiceRegistry
   */
  protected async getClient(serviceName: string, fallbackServiceName: string = 'inacons-backend'): Promise<GraphQLClient> {
    if (this.client) {
      return this.client;
    }

    if (this.baseUrl) {
      this.client = new GraphQLClient(this.baseUrl);
      return this.client;
    }

    try {
      const url = await this.serviceRegistry.getServiceUrl(serviceName);
      this.client = new GraphQLClient(url);
      return this.client;
    } catch {
      const url = await this.serviceRegistry.getServiceUrl(fallbackServiceName);
      this.client = new GraphQLClient(url);
      return this.client;
    }
  }

  /**
   * Método auxiliar para hacer peticiones GraphQL
   * Estandariza el manejo de peticiones GraphQL en todos los repositorios HTTP
   * @param serviceName - Nombre del servicio para obtener el cliente
   * @param fallbackServiceName - Nombre del servicio fallback
   */
  protected async graphqlRequest(
    query: string,
    variables: any = {},
    serviceName: string = '',
    fallbackServiceName: string = 'inacons-backend'
  ): Promise<any> {
    const client = await this.getClient(serviceName, fallbackServiceName);
    // Solo incluir variables si están definidas y no están vacías
    const request: any = { query };
    if (variables && Object.keys(variables).length > 0) {
      request.variables = variables;
    }
    return client.request(request);
  }

  /**
   * Crea un resultado de paginación estándar
   */
  protected createPaginationResult<TItem>(
    data: TItem[],
    pagination: PaginationInput,
    total: number
  ): PaginationResult<TItem> {
    const { page = 1, limit = 10 } = pagination;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
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
   * Aplica paginación a una lista de items
   */
  protected applyPagination<TItem>(items: TItem[], pagination: PaginationInput): TItem[] {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    return items.slice(skip, skip + limit);
  }

  /**
   * Aplica filtros a una lista de items
   */
  protected applyFilters<TItem>(items: TItem[], filters: FilterInput): TItem[] {
    let filtered = [...items];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        filtered = filtered.filter(item => {
          const itemValue = (item as any)[key];
          if (typeof value === 'string' && value.includes('*')) {
            // Búsqueda con wildcard
            const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
            return regex.test(String(itemValue));
          }
          return itemValue === value;
        });
      }
    });

    return filtered;
  }

  /**
   * Aplica búsqueda de texto a una lista de items
   */
  protected applySearch<TItem>(
    items: TItem[],
    search: SearchInput,
    defaultFields: string[]
  ): TItem[] {
    if (!search.query) {
      return items;
    }

    const query = search.query.toLowerCase();
    const searchFields = search.fields && search.fields.length > 0 
      ? search.fields 
      : defaultFields;

    return items.filter(item => {
      return searchFields.some(field => {
        const value = (item as any)[field];
        return value && String(value).toLowerCase().includes(query);
      });
    });
  }

  /**
   * Lista registros con paginación (implementación estándar)
   */
  async listPaginated(pagination: PaginationInput): Promise<PaginationResult<T>> {
    const allItems = await this.list();
    const paginatedData = this.applyPagination(allItems, pagination);
    const total = allItems.length;
    return this.createPaginationResult(paginatedData, pagination, total);
  }

  /**
   * Lista registros con filtros y paginación (implementación estándar)
   */
  async listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    const allItems = await this.list();
    const filtered = this.applyFilters(allItems, filters);

    if (pagination) {
      const paginatedData = this.applyPagination(filtered, pagination);
      return this.createPaginationResult(paginatedData, pagination, filtered.length);
    }

    return this.createPaginationResult(filtered, { page: 1, limit: filtered.length }, filtered.length);
  }

  /**
   * Busca registros con texto de búsqueda (implementación estándar)
   */
  async search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<T>> {
    if (!search.query) {
      return this.listPaginated(pagination || {});
    }

    const allItems = await this.list();
    const defaultFields = this.getDefaultSearchFields();
    const filtered = this.applySearch(allItems, search, defaultFields);

    if (pagination) {
      const paginatedData = this.applyPagination(filtered, pagination);
      return this.createPaginationResult(paginatedData, pagination, filtered.length);
    }

    return this.createPaginationResult(filtered, { page: 1, limit: filtered.length }, filtered.length);
  }

  /**
   * Cuenta registros con filtros opcionales (implementación estándar)
   */
  async count(filters?: FilterInput): Promise<number> {
    if (!filters) {
      const all = await this.list();
      return all.length;
    }

    const result = await this.listWithFilters(filters);
    return result.pagination.total;
  }

  /**
   * Busca un registro por ID con manejo de errores estándar
   */
  protected async findByIdWithErrorHandling(
    id: string,
    queryFn: () => Promise<T | null>,
    entityName: string
  ): Promise<T | null> {
    try {
      return await queryFn();
    } catch (error) {
      logger.error(`Error finding ${entityName} by id`, {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      return null;
    }
  }

  /**
   * Método abstracto que debe ser implementado por cada repositorio
   * para obtener la lista completa de items
   */
  abstract list(): Promise<T[]>;

  /**
   * Método abstracto que debe ser implementado por cada repositorio
   * para obtener los campos por defecto para búsqueda
   */
  protected abstract getDefaultSearchFields(): string[];
}

