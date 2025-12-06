import { IBaseRepository } from './IBaseRepository';
import { Especialidad } from '../entidades/Especialidad';

export interface IEspecialidadRepository extends IBaseRepository<Especialidad> {
  obtenerPorIdEspecialidad(id_especialidad: string): Promise<Especialidad | null>;
}





