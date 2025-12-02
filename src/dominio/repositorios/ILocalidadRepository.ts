import { Localidad } from '../entidades/Localidad';
import { IBaseRepository } from './IBaseRepository';

export interface ILocalidadRepository extends IBaseRepository<Localidad> {
  listLocalidades(): Promise<Localidad[]>;
  getLocalidad(id_localidad: string): Promise<Localidad | null>;
  getLocalidadesByDistrito(id_distrito: string): Promise<Localidad[]>;
}

