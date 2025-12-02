import { IDistritoRepository } from '../../../dominio/repositorios/IDistritoRepository';
import { Distrito } from '../../../dominio/entidades/Distrito';
import { BaseHttpRepository } from './BaseHttpRepository';
import { logger } from '../../logging';

export class HttpDistritoRepository extends BaseHttpRepository<Distrito> implements IDistritoRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   */
  protected override async getClient() {
    return super.getClient('inacons-backend', 'inacons-backend');
  }

  /**
   * Campos por defecto para búsqueda
   */
  protected getDefaultSearchFields(): string[] {
    return ['nombre_distrito', 'ubigeo'];
  }

  async list(): Promise<Distrito[]> {
    return this.listDistritos();
  }

  async findById(id: string): Promise<Distrito | null> {
    return this.getDistrito(id);
  }

  async create(_data: Partial<Distrito>): Promise<Distrito> {
    throw new Error('Create operation not supported for Distrito. Use mutations in monolith.');
  }

  async update(_id: string, _data: Partial<Distrito>): Promise<Distrito | null> {
    throw new Error('Update operation not supported for Distrito. Use mutations in monolith.');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Delete operation not supported for Distrito. Use mutations in monolith.');
  }

  async listDistritos(): Promise<Distrito[]> {
    const query = `
      query {
        listDistritos {
          _id
          id_distrito
          id_provincia
          nombre_distrito
          ubigeo
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.listDistritos;
  }

  async getDistrito(id_distrito: string): Promise<Distrito | null> {
    const query = `
      query GetDistrito($id_distrito: String!) {
        getDistrito(id_distrito: $id_distrito) {
          _id
          id_distrito
          id_provincia
          nombre_distrito
          ubigeo
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_distrito });
    return result.getDistrito;
  }

  async getDistritosByProvincia(id_provincia: string): Promise<Distrito[]> {
    const query = `
      query GetDistritosByProvincia($id_provincia: String!) {
        getDistritosByProvincia(id_provincia: $id_provincia) {
          _id
          id_distrito
          id_provincia
          nombre_distrito
          ubigeo
        }
      }
    `;

    try {
      const result = await this.graphqlRequest(query, { id_provincia });
      return result.getDistritosByProvincia || [];
    } catch (error: any) {
      // Si el servicio externo no tiene esta query o retorna error 400/404, usar fallback
      const errorMessage = error?.message || String(error);
      const isHttpError = errorMessage.includes('HTTP error! status: 400') || 
                         errorMessage.includes('HTTP error! status: 404') ||
                         errorMessage.includes('status: 400') ||
                         errorMessage.includes('status: 404') ||
                         errorMessage.includes('400') ||
                         errorMessage.includes('No se pudo ejecutar') ||
                         errorMessage.includes('GraphQL errors');
      
      if (isHttpError) {
        logger.warn(`getDistritosByProvincia no disponible en servicio externo, usando fallback con listDistritos`, {
          id_provincia,
          error: errorMessage
        });
        
        try {
          // Fallback: obtener todos los distritos y filtrar por provincia
          const allDistritos = await this.listDistritos();
          const filtered = allDistritos.filter((dist: Distrito) => dist.id_provincia === id_provincia);
          logger.info(`Fallback exitoso: ${filtered.length} distritos encontrados para provincia ${id_provincia}`);
          return filtered;
        } catch (fallbackError: any) {
          logger.error(`Error en fallback de getDistritosByProvincia`, {
            id_provincia,
            error: fallbackError?.message || String(fallbackError)
          });
          throw new Error(`No se pudo obtener distritos por provincia: ${fallbackError?.message || String(fallbackError)}`);
        }
      }
      
      // Si no es un error HTTP esperado, relanzar el error original
      logger.error(`Error inesperado en getDistritosByProvincia`, {
        id_provincia,
        error: errorMessage
      });
      throw error;
    }
  }
}

