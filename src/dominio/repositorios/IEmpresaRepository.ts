import { Empresa, EmpresaInput, DeleteResponse } from '../entidades/Empresa';
import { IBaseRepository } from './IBaseRepository';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../valueObjects/Pagination';

export interface IEmpresaRepository extends IBaseRepository<Empresa> {
  listEmpresas(): Promise<Empresa[]>;
  getEmpresaById(id: string): Promise<Empresa | null>;
  listEmpresasPaginated(pagination: PaginationInput): Promise<PaginationResult<Empresa>>;
  listEmpresasWithFilters(filters: FilterInput[], pagination?: PaginationInput): Promise<PaginationResult<Empresa>>;
  searchEmpresas(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<Empresa>>;
  countEmpresas(filters?: FilterInput[]): Promise<number>;
  addEmpresa(data: EmpresaInput): Promise<Empresa>;
  updateEmpresa(id: string, data: EmpresaInput): Promise<Empresa>;
  deleteEmpresa(id: string): Promise<DeleteResponse>;
}

