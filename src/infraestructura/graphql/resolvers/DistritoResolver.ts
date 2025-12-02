import { IResolvers } from '@graphql-tools/utils';
import { DistritoService } from '../../../aplicacion/servicios/DistritoService';
import { Distrito } from '../../../dominio/entidades/Distrito';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

export class DistritoResolver extends BaseResolver<Distrito> {
  constructor(private readonly distritoService: DistritoService) {
    super(distritoService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listDistritos: async () => {
          return await ErrorHandler.handleError(
            async () => await this.distritoService.listDistritos(),
            'listDistritos'
          );
        },
        getDistrito: async (_: any, { id_distrito }: { id_distrito: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.distritoService.getDistrito(id_distrito),
            'getDistrito',
            { id_distrito }
          );
        },
        getDistritosByProvincia: async (_: any, { id_provincia }: { id_provincia: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.distritoService.getDistritosByProvincia(id_provincia),
            'getDistritosByProvincia',
            { id_provincia }
          );
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Distrito';
  }
}

