import { Empresa, EmpresaInput, DeleteResponse } from '../../dominio/entidades/Empresa';
import { IEmpresaRepository } from '../../dominio/repositorios/IEmpresaRepository';
import { BaseService } from './BaseService';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../dominio/valueObjects/Pagination';

export class EmpresaService extends BaseService<Empresa> {
  private readonly empresaRepository: IEmpresaRepository;

  constructor(repository: IEmpresaRepository) {
    super(repository);
    this.empresaRepository = repository;
  }

  async listEmpresas(): Promise<Empresa[]> {
    const empresas = await this.empresaRepository.listEmpresas();
    // Asegurar que imagenes sea siempre un array, nunca null
    return empresas.map(empresa => ({
      ...empresa,
      imagenes: empresa.imagenes === null || empresa.imagenes === undefined ? [] : empresa.imagenes
    }));
  }

  async getEmpresaById(id: string): Promise<Empresa | null> {
    const empresa = await this.empresaRepository.getEmpresaById(id);
    if (!empresa) return null;
    // Asegurar que imagenes sea siempre un array, nunca null
    return {
      ...empresa,
      imagenes: empresa.imagenes === null || empresa.imagenes === undefined ? [] : empresa.imagenes
    };
  }

  async listEmpresasPaginated(pagination: PaginationInput): Promise<PaginationResult<Empresa>> {
    return await this.empresaRepository.listEmpresasPaginated(pagination);
  }

  async listEmpresasWithFilters(
    filters: FilterInput[],
    pagination?: PaginationInput
  ): Promise<PaginationResult<Empresa>> {
    return await this.empresaRepository.listEmpresasWithFilters(filters, pagination);
  }

  async searchEmpresas(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<Empresa>> {
    return await this.empresaRepository.searchEmpresas(search, pagination);
  }

  async countEmpresas(filters?: FilterInput[]): Promise<number> {
    return await this.empresaRepository.countEmpresas(filters);
  }

  async addEmpresa(data: EmpresaInput): Promise<Empresa> {
    return await this.empresaRepository.addEmpresa(data);
  }

  async updateEmpresa(id: string, data: EmpresaInput): Promise<Empresa> {
    return await this.empresaRepository.updateEmpresa(id, data);
  }

  async deleteEmpresa(id: string): Promise<DeleteResponse> {
    return await this.empresaRepository.deleteEmpresa(id);
  }
}

