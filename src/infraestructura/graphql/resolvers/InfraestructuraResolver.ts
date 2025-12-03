import { BaseResolver } from './BaseResolver';
import { InfraestructuraService } from '../../../aplicacion/servicios/InfraestructuraService';
import { ErrorHandler } from './ErrorHandler';
import { Infraestructura } from '../../../dominio/entidades/Infraestructura';

export class InfraestructuraResolver extends BaseResolver<Infraestructura> {
  private infraestructuraService: InfraestructuraService;

  constructor(infraestructuraService: InfraestructuraService) {
    super(infraestructuraService);
    this.infraestructuraService = infraestructuraService;
  }

  protected getEntityName(): string {
    return 'Infraestructura';
  }

  override getResolvers() {
    return {
      Query: {
        listInfraestructuras: async () => {
          return ErrorHandler.handleError(
            async () => await this.infraestructuraService.obtenerTodas(),
            'listInfraestructuras'
          );
        },

        getInfraestructuraById: async (_: any, { id }: { id: string }) => {
          return ErrorHandler.handleError(
            async () => await this.infraestructuraService.obtenerPorId(id),
            'getInfraestructuraById',
            { id }
          );
        },
      },
    };
  }
}

