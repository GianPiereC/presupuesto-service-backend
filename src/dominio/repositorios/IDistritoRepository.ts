import { Distrito } from '../entidades/Distrito';
import { IBaseRepository } from './IBaseRepository';

export interface IDistritoRepository extends IBaseRepository<Distrito> {
  listDistritos(): Promise<Distrito[]>;
  getDistrito(id_distrito: string): Promise<Distrito | null>;
  getDistritosByProvincia(id_provincia: string): Promise<Distrito[]>;
}

