import { ILocalidadRepository } from '../../../dominio/repositorios/ILocalidadRepository';
import { Localidad } from '../../../dominio/entidades/Localidad';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpLocalidadRepository extends BaseHttpRepository<Localidad> implements ILocalidadRepository {
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
    return ['nombre_localidad'];
  }

  async list(): Promise<Localidad[]> {
    return this.listLocalidades();
  }

  async findById(id: string): Promise<Localidad | null> {
    return this.getLocalidad(id);
  }

  async create(_data: Partial<Localidad>): Promise<Localidad> {
    throw new Error('Create operation not supported for Localidad. Use mutations in monolith.');
  }

  async update(_id: string, _data: Partial<Localidad>): Promise<Localidad | null> {
    throw new Error('Update operation not supported for Localidad. Use mutations in monolith.');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Delete operation not supported for Localidad. Use mutations in monolith.');
  }

  async listLocalidades(): Promise<Localidad[]> {
    const query = `
      query {
        listLocalidades {
          _id
          id_localidad
          id_distrito
          nombre_localidad
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.listLocalidades;
  }

  async getLocalidad(id_localidad: string): Promise<Localidad | null> {
    const query = `
      query GetLocalidad($id_localidad: String!) {
        getLocalidad(id_localidad: $id_localidad) {
          _id
          id_localidad
          id_distrito
          nombre_localidad
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_localidad });
    return result.getLocalidad;
  }

  async getLocalidadesByDistrito(id_distrito: string): Promise<Localidad[]> {
    const query = `
      query GetLocalidadesByDistrito($id_distrito: String!) {
        getLocalidadesByDistrito(id_distrito: $id_distrito) {
          _id
          id_localidad
          id_distrito
          nombre_localidad
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_distrito });
    return result.getLocalidadesByDistrito;
  }
}

