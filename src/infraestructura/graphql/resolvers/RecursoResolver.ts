import { IResolvers } from '@graphql-tools/utils';
import { RecursoService } from '../../../aplicacion/servicios/RecursoService';
import { Recurso, ListRecursoPaginationInput } from '../../../dominio/entidades/Recurso';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';
import { PaginationInput } from '../../../dominio/valueObjects/Pagination';

export class RecursoResolver extends BaseResolver<Recurso> {
  constructor(private readonly recursoService: RecursoService) {
    super(recursoService);
  }

  override getResolvers(): IResolvers {
    return {
      Query: {
        listRecursosPaginated: async (_: any, { input }: { input?: ListRecursoPaginationInput }) => {
          return await ErrorHandler.handleError(
            async () => {
              const response = await this.recursoService.listRecursosPaginated(input || {});
              // La respuesta ya viene normalizada del repositorio
              return response;
            },
            'listRecursosPaginated',
            { input }
          );
        },
        listRecursosPaginatedStandard: async (_: any, { pagination }: { pagination: PaginationInput }) => {
          return await ErrorHandler.handleError(
            async () => await this.recursoService.listRecursosPaginatedStandard(pagination),
            'listRecursosPaginatedStandard',
            { pagination }
          );
        },
        getRecursoById: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.recursoService.findById(id),
            'getRecursoById',
            { id }
          );
        },
      },
    };
  }

  protected getEntityName(): string {
    return 'Recurso';
  }
}

