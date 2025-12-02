import { IDepartamentoRepository } from '../../../dominio/repositorios/IDepartamentoRepository';
import { Departamento } from '../../../dominio/entidades/Departamento';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpDepartamentoRepository extends BaseHttpRepository<Departamento> implements IDepartamentoRepository {
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
    return ['nombre_departamento', 'ubigeo'];
  }

  async list(): Promise<Departamento[]> {
    return this.listDepartamentos();
  }

  async findById(id: string): Promise<Departamento | null> {
    return this.getDepartamento(id);
  }

  async create(_data: Partial<Departamento>): Promise<Departamento> {
    throw new Error('Create operation not supported for Departamento. Use mutations in monolith.');
  }

  async update(_id: string, _data: Partial<Departamento>): Promise<Departamento | null> {
    throw new Error('Update operation not supported for Departamento. Use mutations in monolith.');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Delete operation not supported for Departamento. Use mutations in monolith.');
  }

  async listDepartamentos(esNuevoFormato?: boolean): Promise<Departamento[]> {
    const query = `
      query ListDepartamentos($esNuevoFormato: Boolean) {
        listDepartamentos(esNuevoFormato: $esNuevoFormato) {
          _id
          id_departamento
          nombre_departamento
          ubigeo
          esNuevoFormato
        }
      }
    `;

    const result = await this.graphqlRequest(query, { esNuevoFormato });
    return result.listDepartamentos;
  }

  async getDepartamento(id_departamento: string): Promise<Departamento | null> {
    const query = `
      query GetDepartamento($id_departamento: String!) {
        getDepartamento(id_departamento: $id_departamento) {
          _id
          id_departamento
          nombre_departamento
          ubigeo
          esNuevoFormato
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id_departamento });
    return result.getDepartamento;
  }
}

