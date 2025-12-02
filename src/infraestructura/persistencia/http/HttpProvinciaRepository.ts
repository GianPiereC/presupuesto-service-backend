import { IProvinciaRepository } from '../../../dominio/repositorios/IProvinciaRepository';
import { Provincia } from '../../../dominio/entidades/Provincia';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpProvinciaRepository extends BaseHttpRepository<Provincia> implements IProvinciaRepository {
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
    return ['nombre_provincia', 'ubigeo'];
  }

  async list(): Promise<Provincia[]> {
    return this.listProvincias();
  }

  async findById(id: string): Promise<Provincia | null> {
    return this.getProvincia(id);
  }

  async create(_data: Partial<Provincia>): Promise<Provincia> {
    throw new Error('Create operation not supported for Provincia. Use mutations in monolith.');
  }

  async update(_id: string, _data: Partial<Provincia>): Promise<Provincia | null> {
    throw new Error('Update operation not supported for Provincia. Use mutations in monolith.');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Delete operation not supported for Provincia. Use mutations in monolith.');
  }

  async listProvincias(): Promise<Provincia[]> {
    const query = `
      query {
        listProvincias {
          _id
          id_provincia
          id_departamento
          nombre_provincia
          ubigeo
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.listProvincias;
  }

  async getProvincia(id_provincia: string): Promise<Provincia | null> {
    const query = `
      query GetProvincia($id_provincia: String!) {
        getProvincia(id_provincia: $id_provincia) {
          _id
          id_provincia
          id_departamento
          nombre_provincia
          ubigeo
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_provincia });
    return result.getProvincia;
  }

  async getProvinciasByDepartamento(id_departamento: string): Promise<Provincia[]> {
    const query = `
      query GetProvinciasByDepartamento($id_departamento: String!) {
        getProvinciasByDepartamento(id_departamento: $id_departamento) {
          _id
          id_provincia
          id_departamento
          nombre_provincia
          ubigeo
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_departamento });
    return result.getProvinciasByDepartamento;
  }
}

