import { IResolvers } from '@graphql-tools/utils';
import { LocalidadService } from '../../../aplicacion/servicios/LocalidadService';
import { Localidad } from '../../../dominio/entidades/Localidad';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

export class LocalidadResolver extends BaseResolver<Localidad> {
  constructor(private readonly localidadService: LocalidadService) {
    super(localidadService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listLocalidades: async () => {
          return await ErrorHandler.handleError(
            async () => await this.localidadService.listLocalidades(),
            'listLocalidades'
          );
        },
        getLocalidad: async (_: any, { id_localidad }: { id_localidad: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.localidadService.getLocalidad(id_localidad),
            'getLocalidad',
            { id_localidad }
          );
        },
        getLocalidadesByDistrito: async (_: any, { id_distrito }: { id_distrito: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.localidadService.getLocalidadesByDistrito(id_distrito),
            'getLocalidadesByDistrito',
            { id_distrito }
          );
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Localidad';
  }
}

