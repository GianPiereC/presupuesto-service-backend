import { IInfraestructuraRepository } from '../../../dominio/repositorios/IInfraestructuraRepository';
import { Infraestructura } from '../../../dominio/entidades/Infraestructura';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpInfraestructuraRepository extends BaseHttpRepository<Infraestructura> implements IInfraestructuraRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   */
  protected override async getClient() {
    return super.getClient('inacons-backend');
  }

  /**
   * Campos por defecto para búsqueda
   */
  protected getDefaultSearchFields(): string[] {
    return ['nombre_infraestructura', 'tipo_infraestructura'];
  }

  async list(): Promise<Infraestructura[]> {
    return this.listInfraestructuras();
  }

  async findById(id: string): Promise<Infraestructura | null> {
    return this.getInfraestructuraById(id);
  }

  async create(_data: Partial<Infraestructura>): Promise<Infraestructura> {
    throw new Error('Create not implemented for Infraestructura - read-only from monolith');
  }

  async update(_id: string, _data: Partial<Infraestructura>): Promise<Infraestructura | null> {
    throw new Error('Update not implemented for Infraestructura - read-only from monolith');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Delete not implemented for Infraestructura - read-only from monolith');
  }

  async listInfraestructuras(): Promise<Infraestructura[]> {
    const query = `
      query {
        listInfraestructuras {
          _id
          id_infraestructura
          nombre_infraestructura
          tipo_infraestructura
          descripcion
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.listInfraestructuras || [];
  }

  async getInfraestructuraById(id: string): Promise<Infraestructura | null> {
    const query = `
      query GetInfraestructuraById($id: ID!) {
        getInfraestructuraById(id: $id) {
          _id
          id_infraestructura
          nombre_infraestructura
          tipo_infraestructura
          descripcion
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getInfraestructuraById || null;
  }
}

