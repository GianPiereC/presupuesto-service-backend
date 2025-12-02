import { IResolvers } from '@graphql-tools/utils';
import { DepartamentoService } from '../../../aplicacion/servicios/DepartamentoService';
import { Departamento } from '../../../dominio/entidades/Departamento';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

export class DepartamentoResolver extends BaseResolver<Departamento> {
  constructor(private readonly departamentoService: DepartamentoService) {
    super(departamentoService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listDepartamentos: async (_: any, { esNuevoFormato }: { esNuevoFormato?: boolean }) => {
          return await ErrorHandler.handleError(
            async () => await this.departamentoService.listDepartamentos(esNuevoFormato),
            'listDepartamentos'
          );
        },
        getDepartamento: async (_: any, { id_departamento }: { id_departamento: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.departamentoService.getDepartamento(id_departamento),
            'getDepartamento',
            { id_departamento }
          );
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Departamento';
  }
}

