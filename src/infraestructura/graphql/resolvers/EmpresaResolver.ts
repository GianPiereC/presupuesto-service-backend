import { IResolvers } from '@graphql-tools/utils';
import { EmpresaService } from '../../../aplicacion/servicios/EmpresaService';
import { Empresa, EmpresaInput } from '../../../dominio/entidades/Empresa';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';
import { PaginationInput, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';

export class EmpresaResolver extends BaseResolver<Empresa> {
  constructor(private readonly empresaService: EmpresaService) {
    super(empresaService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listEmpresas: async () => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.listEmpresas(),
            'listEmpresas'
          );
        },
        getEmpresaById: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.getEmpresaById(id),
            'getEmpresaById',
            { id }
          );
        },
        listEmpresasPaginated: async (_: any, { pagination }: { pagination: PaginationInput }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.listEmpresasPaginated(pagination),
            'listEmpresasPaginated'
          );
        },
        listEmpresasWithFilters: async (
          _: any,
          { filters, pagination }: { filters: FilterInput[]; pagination?: PaginationInput }
        ) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.listEmpresasWithFilters(filters, pagination),
            'listEmpresasWithFilters'
          );
        },
        searchEmpresas: async (
          _: any,
          { search, pagination }: { search: SearchInput; pagination?: PaginationInput }
        ) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.searchEmpresas(search, pagination),
            'searchEmpresas'
          );
        },
        countEmpresas: async (_: any, { filters }: { filters?: FilterInput[] }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.countEmpresas(filters),
            'countEmpresas'
          );
        },
      },
      Mutation: {
        addEmpresa: async (_: any, { data }: { data: EmpresaInput }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.addEmpresa(data),
            'addEmpresa'
          );
        },
        updateEmpresa: async (_: any, { id, data }: { id: string; data: EmpresaInput }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.updateEmpresa(id, data),
            'updateEmpresa',
            { id }
          );
        },
        deleteEmpresa: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.empresaService.deleteEmpresa(id),
            'deleteEmpresa',
            { id }
          );
        },
      },
      Empresa: {
        imagenes: (parent: Empresa) => {
          // Asegurar que imagenes sea siempre un array, nunca null
          return parent.imagenes === null || parent.imagenes === undefined ? [] : parent.imagenes;
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Empresa';
  }
}

