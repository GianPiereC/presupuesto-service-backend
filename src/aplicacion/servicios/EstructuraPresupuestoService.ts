import { Presupuesto } from '../../dominio/entidades/Presupuesto';
import { Titulo } from '../../dominio/entidades/Titulo';
import { Partida } from '../../dominio/entidades/Partida';
import { PresupuestoService } from './PresupuestoService';
import { TituloService } from './TituloService';
import { PartidaService } from './PartidaService';

export interface EstructuraPresupuesto {
  presupuesto: Presupuesto;
  titulos: Titulo[];
  partidas: Partida[];
}

export class EstructuraPresupuestoService {
  constructor(
    private readonly presupuestoService: PresupuestoService,
    private readonly tituloService: TituloService,
    private readonly partidaService: PartidaService
  ) {}

  /**
   * Obtiene la estructura completa del presupuesto con títulos y partidas como arrays planos
   */
  async obtenerEstructuraCompleta(id_presupuesto: string): Promise<EstructuraPresupuesto | null> {
    // Obtener presupuesto
    const presupuesto = await this.presupuestoService.obtenerPorId(id_presupuesto);
    if (!presupuesto) {
      return null;
    }

    // Obtener todos los títulos del presupuesto (ordenados)
    const titulos = await this.tituloService.obtenerPorPresupuesto(id_presupuesto);
    titulos.sort((a, b) => a.orden - b.orden);

    // Obtener todas las partidas del presupuesto (ordenadas)
    const partidas = await this.partidaService.obtenerPorPresupuesto(id_presupuesto);
    partidas.sort((a, b) => a.orden - b.orden);

    // Devolver arrays planos - el frontend construirá la jerarquía
    return {
      presupuesto,
      titulos,
      partidas
    };
  }
}

