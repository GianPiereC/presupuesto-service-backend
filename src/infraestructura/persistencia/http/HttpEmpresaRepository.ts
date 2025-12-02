import { IEmpresaRepository } from '../../../dominio/repositorios/IEmpresaRepository';
import { Empresa, EmpresaInput, DeleteResponse } from '../../../dominio/entidades/Empresa';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpEmpresaRepository extends BaseHttpRepository<Empresa> implements IEmpresaRepository {
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
    return ['nombre_comercial', 'razon_social', 'ruc'];
  }

  async list(): Promise<Empresa[]> {
    return this.listEmpresas();
  }

  async findById(id: string): Promise<Empresa | null> {
    return this.getEmpresaById(id);
  }

  async create(data: Partial<Empresa>): Promise<Empresa> {
    const empresaInput: EmpresaInput = {
      nombre_comercial: data.nombre_comercial!,
      razon_social: data.razon_social!,
      estado: data.estado!,
      ruc: data.ruc!,
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.regimen_fiscal !== undefined && { regimen_fiscal: data.regimen_fiscal }),
      ...(data.imagenes !== undefined && { imagenes: data.imagenes }),
      ...(data.color !== undefined && { color: data.color }),
    };
    return this.addEmpresa(empresaInput);
  }

  async update(id: string, data: Partial<Empresa>): Promise<Empresa | null> {
    const empresaInput: EmpresaInput = {
      nombre_comercial: data.nombre_comercial!,
      razon_social: data.razon_social!,
      estado: data.estado!,
      ruc: data.ruc!,
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.regimen_fiscal !== undefined && { regimen_fiscal: data.regimen_fiscal }),
      ...(data.imagenes !== undefined && { imagenes: data.imagenes }),
      ...(data.color !== undefined && { color: data.color }),
    };
    return this.updateEmpresa(id, empresaInput);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.deleteEmpresa(id);
    return result.success;
  }

  async listEmpresas(): Promise<Empresa[]> {
    const query = `
      query {
        listEmpresas {
          id
          nombre_comercial
          razon_social
          descripcion
          estado
          regimen_fiscal
          ruc
          imagenes
          color
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    // Normalizar las empresas: convertir null en [] para imagenes
    const empresas = result.listEmpresas || [];
    return this.normalizeEmpresas(Array.isArray(empresas) ? empresas : []);
  }

  async getEmpresaById(id: string): Promise<Empresa | null> {
    const query = `
      query GetEmpresaById($id: ID!) {
        getEmpresaById(id: $id) {
          id
          nombre_comercial
          razon_social
          descripcion
          estado
          regimen_fiscal
          ruc
          imagenes
          color
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getEmpresaById ? this.normalizeEmpresa(result.getEmpresaById) : null;
  }

  async listEmpresasPaginated(pagination: PaginationInput): Promise<PaginationResult<Empresa>> {
    const query = `
      query ListEmpresasPaginated($pagination: PaginationInput!) {
        listEmpresasPaginated(pagination: $pagination) {
          data {
            id
            nombre_comercial
            razon_social
            descripcion
            estado
            regimen_fiscal
            ruc
            imagenes
            color
          }
          pagination {
            page
            limit
            total
            totalPages
            hasNext
            hasPrev
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { pagination });
    if (result.listEmpresasPaginated) {
      return {
        ...result.listEmpresasPaginated,
        data: this.normalizeEmpresas(result.listEmpresasPaginated.data)
      };
    }
    return result.listEmpresasPaginated;
  }

  async listEmpresasWithFilters(
    filters: FilterInput[],
    pagination?: PaginationInput
  ): Promise<PaginationResult<Empresa>> {
    const query = `
      query ListEmpresasWithFilters($filters: [FilterInput!]!, $pagination: PaginationInput) {
        listEmpresasWithFilters(filters: $filters, pagination: $pagination) {
          data {
            id
            nombre_comercial
            razon_social
            descripcion
            estado
            regimen_fiscal
            ruc
            imagenes
            color
          }
          pagination {
            page
            limit
            total
            totalPages
            hasNext
            hasPrev
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { filters, pagination });
    if (result.listEmpresasWithFilters) {
      return {
        ...result.listEmpresasWithFilters,
        data: this.normalizeEmpresas(result.listEmpresasWithFilters.data)
      };
    }
    return result.listEmpresasWithFilters;
  }

  async searchEmpresas(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<Empresa>> {
    const query = `
      query SearchEmpresas($search: SearchInput!, $pagination: PaginationInput) {
        searchEmpresas(search: $search, pagination: $pagination) {
          data {
            id
            nombre_comercial
            razon_social
            descripcion
            estado
            regimen_fiscal
            ruc
            imagenes
            color
          }
          pagination {
            page
            limit
            total
            totalPages
            hasNext
            hasPrev
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { search, pagination });
    if (result.searchEmpresas) {
      return {
        ...result.searchEmpresas,
        data: this.normalizeEmpresas(result.searchEmpresas.data)
      };
    }
    return result.searchEmpresas;
  }

  async countEmpresas(filters?: FilterInput[]): Promise<number> {
    // Usar queries diferentes dependiendo de si hay filtros o no
    // El servicio externo puede no aceptar null para el parámetro filters
    if (filters && filters.length > 0) {
      const query = `
        query CountEmpresas($filters: [FilterInput!]!) {
          countEmpresas(filters: $filters)
        }
      `;
      const result = await this.graphqlRequest(query, { filters });
      return result.countEmpresas ?? 0;
    } else {
      // Sin filtros, usar una query que no requiere el parámetro
      const query = `
        query CountEmpresas {
          countEmpresas
        }
      `;
      const result = await this.graphqlRequest(query);
      return result.countEmpresas ?? 0;
    }
  }

  async addEmpresa(data: EmpresaInput): Promise<Empresa> {
    const mutation = `
      mutation AddEmpresa($data: EmpresaInput!) {
        addEmpresa(data: $data) {
          id
          nombre_comercial
          razon_social
          descripcion
          estado
          regimen_fiscal
          ruc
          imagenes
          color
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { data });
    return result.addEmpresa ? this.normalizeEmpresa(result.addEmpresa) : result.addEmpresa;
  }

  async updateEmpresa(id: string, data: EmpresaInput): Promise<Empresa> {
    const mutation = `
      mutation UpdateEmpresa($id: ID!, $data: EmpresaInput!) {
        updateEmpresa(id: $id, data: $data) {
          id
          nombre_comercial
          razon_social
          descripcion
          estado
          regimen_fiscal
          ruc
          imagenes
          color
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id, data });
    return result.updateEmpresa ? this.normalizeEmpresa(result.updateEmpresa) : result.updateEmpresa;
  }

  async deleteEmpresa(id: string): Promise<DeleteResponse> {
    const mutation = `
      mutation DeleteEmpresa($id: ID!) {
        deleteEmpresa(id: $id) {
          success
          message
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id });
    return result.deleteEmpresa;
  }

  /**
   * Normaliza una empresa individual: convierte null en [] para imagenes
   */
  private normalizeEmpresa(empresa: any): Empresa {
    if (!empresa) return empresa;
    // Asegurar que imagenes sea siempre un array, nunca null ni undefined
    const imagenesNormalizadas = 
      empresa.imagenes === null || 
      empresa.imagenes === undefined || 
      !Array.isArray(empresa.imagenes) 
        ? [] 
        : empresa.imagenes;
    
    return {
      ...empresa,
      imagenes: imagenesNormalizadas
    };
  }

  /**
   * Normaliza un array de empresas: convierte null en [] para imagenes en cada empresa
   */
  private normalizeEmpresas(empresas: any[]): Empresa[] {
    if (!empresas || !Array.isArray(empresas)) return empresas || [];
    return empresas.map(empresa => this.normalizeEmpresa(empresa));
  }
}

