import { IRecursoRepository } from '../../../dominio/repositorios/IRecursoRepository';
import { Recurso, ListRecursoPaginationResponse, ListRecursoPaginationInput } from '../../../dominio/entidades/Recurso';
import { PaginationInput, PaginationResult } from '../../../dominio/valueObjects/Pagination';
import { BaseHttpRepository } from './BaseHttpRepository';
import { GraphQLClient } from '../../http/GraphQLClient';
import { logger } from '../../logging';

export class HttpRecursoRepository extends BaseHttpRepository<Recurso> implements IRecursoRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL sin límite de timeout para pruebas
   * Usa el valor máximo de setTimeout (24 días) que es efectivamente sin límite
   */
  protected override async getClient() {
    if (this.client) {
      return this.client;
    }

    // Valor máximo seguro de setTimeout: 2147483647 ms (≈ 24 días) - efectivamente sin límite
    const UNLIMITED_TIMEOUT = 2147483647;

    if (this.baseUrl) {
      this.client = new GraphQLClient(this.baseUrl, {
        timeout: UNLIMITED_TIMEOUT, // Sin límite para pruebas
        maxConcurrent: 10
      });
      return this.client;
    }

    try {
      const url = await this.serviceRegistry.getServiceUrl('inacons-backend');
      this.client = new GraphQLClient(url, {
        timeout: UNLIMITED_TIMEOUT, // Sin límite para pruebas
        maxConcurrent: 10
      });
      return this.client;
    } catch {
      const url = await this.serviceRegistry.getServiceUrl('inacons-backend');
      this.client = new GraphQLClient(url, {
        timeout: UNLIMITED_TIMEOUT, // Sin límite para pruebas
        maxConcurrent: 10
      });
      return this.client;
    }
  }

  /**
   * Campos por defecto para búsqueda
   */
  protected getDefaultSearchFields(): string[] {
    return ['nombre', 'codigo', 'descripcion'];
  }

  /**
   * Lista todos los recursos (método base - implementación básica)
   */
  async list(): Promise<Recurso[]> {
    try {
      const response = await this.listRecursosPaginated({ page: 1, itemsPage: 1000 });
      return response.recursos || [];
    } catch (error) {
      logger.error('Error al listar recursos', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Busca un recurso por ID (no implementado en el servicio externo actualmente)
   */
  async findById(id: string): Promise<Recurso | null> {
    try {
      // Intentar buscar en la primera página con un límite grande
      const response = await this.listRecursosPaginated({ page: 1, itemsPage: 1000 });
      const recurso = response.recursos?.find(r => r.id === id);
      return recurso || null;
    } catch (error) {
      logger.error('Error al buscar recurso por ID', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      return null;
    }
  }

  /**
   * Método principal para listar recursos paginados desde inaconsbackend
   * Query completa igual a la del frontend con todos los campos disponibles
   */
  async listRecursosPaginated(input: ListRecursoPaginationInput): Promise<ListRecursoPaginationResponse> {
    // Query completa igual a la del frontend de inacons
    const query = `
      query ListRecursoPagination(
        $page: Int = 1
        $itemsPage: Int = 20
        $searchTerm: String
        $estado_activo_fijo: String
        $filterRangeDate: FilterRangeDateInput
      ) {
        listRecursoPagination(
          page: $page
          itemsPage: $itemsPage
          searchTerm: $searchTerm
          estado_activo_fijo: $estado_activo_fijo
          filterRangeDate: $filterRangeDate
        ) {
          info {
            page
            total
            itemsPage
            pages
          }
          status
          message
          recursos {
            id
            recurso_id
            codigo
            nombre
            descripcion
            cantidad
            unidad_id
            unidad {
              nombre
            }
            precio_actual
            tipo_recurso_id
            tipo_recurso {
              nombre
            }
            tipo_costo_recurso_id
            tipo_costo_recurso {
              nombre
              codigo
            }
            clasificacion_recurso_id
            clasificacion_recurso {
              nombre
            }
            fecha
            vigente
            usado
            imagenes {
              id
              file
            }
            activo_fijo
            combustible_ids
            estado_activo_fijo
            fecha_checked_activo_fijo
          }
        }
      }
    `;

    // Construir variables para la query - incluir todos los parámetros disponibles
    const variables: any = {};
    if (input.page !== undefined) variables.page = input.page;
    if (input.itemsPage !== undefined) variables.itemsPage = input.itemsPage;
    if (input.searchTerm !== undefined && input.searchTerm !== null && input.searchTerm !== '') {
      variables.searchTerm = input.searchTerm;
    }
    if (input.estado_activo_fijo !== undefined && input.estado_activo_fijo !== null && input.estado_activo_fijo !== '') {
      variables.estado_activo_fijo = input.estado_activo_fijo;
    }
    if (input.filterRangeDate !== undefined && input.filterRangeDate !== null) {
      variables.filterRangeDate = input.filterRangeDate;
    }

    try {
      const result = await this.graphqlRequest(query, variables);
      
      if (result && result.listRecursoPagination) {
        // El servicio devuelve la estructura completa con info, status, message y recursos
        const response = result.listRecursoPagination;
        
        // Validar y asegurar que el campo info existe y es válido
        if (!response.info || response.info === null || 
            typeof response.info.page !== 'number' || 
            typeof response.info.total !== 'number' ||
            typeof response.info.itemsPage !== 'number' ||
            typeof response.info.pages !== 'number') {
          logger.warn('Respuesta sin campo info válido, creando valores por defecto', { input, result, info: response.info });
          // Crear objeto info por defecto basado en los recursos recibidos
          const recursos = response.recursos || [];
          const page = input.page || 1;
          const itemsPage = input.itemsPage || 20;
          response.info = {
            page: page,
            total: recursos.length,
            itemsPage: itemsPage,
            pages: Math.max(1, Math.ceil(recursos.length / itemsPage))
          };
        } else {
          // Validar que los valores numéricos no sean NaN o Infinity
          const info = response.info;
          if (isNaN(info.page) || isNaN(info.total) || isNaN(info.itemsPage) || isNaN(info.pages) ||
              !isFinite(info.page) || !isFinite(info.total) || !isFinite(info.itemsPage) || !isFinite(info.pages)) {
            logger.warn('Campo info contiene valores inválidos (NaN/Infinity), corrigiendo', { input, info });
            const recursos = response.recursos || [];
            const page = input.page || 1;
            const itemsPage = input.itemsPage || 20;
            response.info = {
              page: isNaN(info.page) || !isFinite(info.page) ? page : Math.max(1, Math.floor(info.page)),
              total: isNaN(info.total) || !isFinite(info.total) ? recursos.length : Math.max(0, Math.floor(info.total)),
              itemsPage: isNaN(info.itemsPage) || !isFinite(info.itemsPage) ? itemsPage : Math.max(1, Math.floor(info.itemsPage)),
              pages: isNaN(info.pages) || !isFinite(info.pages) ? Math.max(1, Math.ceil((isNaN(info.total) ? recursos.length : info.total) / itemsPage)) : Math.max(1, Math.floor(info.pages))
            };
          }
        }
        
        // Asegurar que status existe
        if (!response.status) {
          response.status = 'success';
        }
        
        // Asegurar que recursos es un array
        if (!Array.isArray(response.recursos)) {
          response.recursos = [];
        }
        
        // Limpiar campos id problemáticos de objetos anidados si existen y son null
        if (response.recursos && Array.isArray(response.recursos)) {
          response.recursos = response.recursos.map((recurso: any) => {
            // Eliminar campos id si existen en objetos anidados (pueden causar errores si son null)
            if (recurso.unidad && recurso.unidad.id === null) {
              delete recurso.unidad.id;
            }
            if (recurso.tipo_recurso && recurso.tipo_recurso.id === null) {
              delete recurso.tipo_recurso.id;
            }
            if (recurso.tipo_costo_recurso && recurso.tipo_costo_recurso.id === null) {
              delete recurso.tipo_costo_recurso.id;
            }
            if (recurso.clasificacion_recurso && recurso.clasificacion_recurso.id === null) {
              delete recurso.clasificacion_recurso.id;
            }
            return recurso;
          });
        }
        
        return response;
      }
      
      // Si no hay respuesta válida, devolver una estructura por defecto en lugar de lanzar error
      logger.error('Respuesta inválida del servicio listRecursoPagination', { result, input });
      const page = input.page || 1;
      const itemsPage = input.itemsPage || 20;
      return {
        info: {
          page: page,
          total: 0,
          itemsPage: itemsPage,
          pages: 0
        },
        status: 'error',
        message: 'Error al obtener recursos del servicio externo',
        recursos: []
      };
    } catch (error) {
      logger.error('Error al obtener recursos paginados', {
        error: error instanceof Error ? error.message : String(error),
        input,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // En lugar de lanzar el error, devolver una estructura válida para evitar que GraphQL falle
      // El ErrorHandler en el resolver ya manejará el error si es necesario
      const page = input?.page || 1;
      const itemsPage = input?.itemsPage || 20;
      return {
        info: {
          page: page,
          total: 0,
          itemsPage: itemsPage,
          pages: 0
        },
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido al obtener recursos',
        recursos: []
      };
    }
  }

  // Métodos base que deben implementarse pero no son críticos para recursos

  async create(_data: Partial<Recurso>): Promise<Recurso> {
    throw new Error('Crear recurso no está implementado en este repositorio');
  }

  async update(_id: string, _data: Partial<Recurso>): Promise<Recurso | null> {
    throw new Error('Actualizar recurso no está implementado en este repositorio');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Eliminar recurso no está implementado en este repositorio');
  }

  /**
   * Implementación de listPaginated que adapta el formato de respuesta
   */
  override async listPaginated(pagination: PaginationInput): Promise<PaginationResult<Recurso>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    
    const response = await this.listRecursosPaginated({
      page,
      itemsPage: limit
    });

    // Adaptar la respuesta del servicio externo al formato estándar de paginación
    return {
      data: response.recursos || [],
      pagination: {
        page: response.info.page,
        limit: response.info.itemsPage,
        total: response.info.total,
        totalPages: response.info.pages,
        hasNext: response.info.page < response.info.pages,
        hasPrev: response.info.page > 1
      }
    };
  }
}

