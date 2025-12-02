import { IResolvers } from '@graphql-tools/utils';
import { ProvinciaService } from '../../../aplicacion/servicios/ProvinciaService';
import { Provincia } from '../../../dominio/entidades/Provincia';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

export class ProvinciaResolver extends BaseResolver<Provincia> {
  constructor(private readonly provinciaService: ProvinciaService) {
    super(provinciaService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listProvincias: async () => {
          return await ErrorHandler.handleError(
            async () => await this.provinciaService.listProvincias(),
            'listProvincias'
          );
        },
        getProvincia: async (_: any, { id_provincia }: { id_provincia: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.provinciaService.getProvincia(id_provincia),
            'getProvincia',
            { id_provincia }
          );
        },
        getProvinciasByDepartamento: async (_: any, { id_departamento }: { id_departamento: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.provinciaService.getProvinciasByDepartamento(id_departamento),
            'getProvinciasByDepartamento',
            { id_departamento }
          );
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Provincia';
  }
}

