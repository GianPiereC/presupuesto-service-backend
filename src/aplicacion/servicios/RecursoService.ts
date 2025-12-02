import { Recurso, ListRecursoPaginationResponse, ListRecursoPaginationInput } from '../../dominio/entidades/Recurso';
import { IRecursoRepository } from '../../dominio/repositorios/IRecursoRepository';
import { BaseService } from './BaseService';
import { PaginationInput, PaginationResult } from '../../dominio/valueObjects/Pagination';

export class RecursoService extends BaseService<Recurso> {
  private readonly recursoRepository: IRecursoRepository;

  constructor(repository: IRecursoRepository) {
    super(repository);
    this.recursoRepository = repository;
  }

  /**
   * Lista recursos paginados usando el servicio de inaconsbackend
   */
  async listRecursosPaginated(input: ListRecursoPaginationInput): Promise<ListRecursoPaginationResponse> {
    return await this.recursoRepository.listRecursosPaginated(input);
  }

  /**
   * Lista recursos con paginación estándar (adapta el formato)
   */
  async listRecursosPaginatedStandard(pagination: PaginationInput): Promise<PaginationResult<Recurso>> {
    return await this.recursoRepository.listPaginated(pagination);
  }
}

