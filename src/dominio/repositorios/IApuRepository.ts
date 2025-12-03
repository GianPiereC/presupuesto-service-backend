import { IBaseRepository } from './IBaseRepository';
import { Apu } from '../entidades/Apu';
import { RecursoApu } from '../entidades/RecursoApu';

export interface IApuRepository extends IBaseRepository<Apu> {
  obtenerPorPartida(id_partida: string): Promise<Apu | null>;
  obtenerPorPresupuesto(id_presupuesto: string): Promise<Apu[]>;
  obtenerPorProyecto(id_proyecto: string): Promise<Apu[]>;
  obtenerPorIdApu(id_apu: string): Promise<Apu | null>;
  
  // Métodos para gestionar recursos embebidos
  agregarRecurso(id_apu: string, recurso: RecursoApu): Promise<Apu | null>;
  actualizarRecurso(
    id_apu: string,
    id_recurso_apu: string,
    recurso: Partial<RecursoApu>
  ): Promise<Apu | null>;
  eliminarRecurso(id_apu: string, id_recurso_apu: string): Promise<Apu | null>;
}







