import { BaseResolver } from './BaseResolver';
import { InfraestructuraService } from '../../../aplicacion/servicios/InfraestructuraService';
import { ErrorHandler } from './ErrorHandler';

export class InfraestructuraResolver extends BaseResolver {
  private infraestructuraService: InfraestructuraService;

  constructor(infraestructuraService: InfraestructuraService) {
    super();
    this.infraestructuraService = infraestructuraService;
  }

  getResolvers() {
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

