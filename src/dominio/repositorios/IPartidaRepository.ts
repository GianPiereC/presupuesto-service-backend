import { IBaseRepository } from './IBaseRepository';
import { Partida } from '../entidades/Partida';

export interface IPartidaRepository extends IBaseRepository<Partida> {
  obtenerPorPresupuesto(id_presupuesto: string): Promise<Partida[]>;
  obtenerPorProyecto(id_proyecto: string): Promise<Partida[]>;
  obtenerPorIdPartida(id_partida: string): Promise<Partida | null>;
  obtenerPorTitulo(id_titulo: string): Promise<Partida[]>;
  obtenerPrincipalesPorTitulo(id_titulo: string): Promise<Partida[]>;
  obtenerSubpartidas(id_partida_padre: string): Promise<Partida[]>;
  obtenerPorCodigoYProyecto(codigo_partida: string, id_proyecto: string, excludeId?: string): Promise<Partida | null>;
}

