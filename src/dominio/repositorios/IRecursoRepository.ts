import { Recurso, ListRecursoPaginationResponse, ListRecursoPaginationInput } from '../entidades/Recurso';
import { IBaseRepository } from './IBaseRepository';

export interface IRecursoRepository extends IBaseRepository<Recurso> {
  listRecursosPaginated(input: ListRecursoPaginationInput): Promise<ListRecursoPaginationResponse>;
}

