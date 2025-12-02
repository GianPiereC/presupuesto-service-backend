import { Infraestructura } from '../entidades/Infraestructura';
import { IBaseRepository } from './IBaseRepository';

export interface IInfraestructuraRepository extends IBaseRepository<Infraestructura> {
  listInfraestructuras(): Promise<Infraestructura[]>;
  getInfraestructuraById(id: string): Promise<Infraestructura | null>;
}

