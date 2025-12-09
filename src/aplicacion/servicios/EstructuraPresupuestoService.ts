import { Presupuesto } from '../../dominio/entidades/Presupuesto';
import { Titulo } from '../../dominio/entidades/Titulo';
import { Partida } from '../../dominio/entidades/Partida';
import { Apu } from '../../dominio/entidades/Apu';
import { PresupuestoService } from './PresupuestoService';
import { TituloService } from './TituloService';
import { PartidaService } from './PartidaService';
import { ApuService } from './ApuService';

export interface EstructuraPresupuesto {
  presupuesto: Presupuesto;
  titulos: Titulo[];
  partidas: Partida[];
  apus?: Apu[]; // NUEVO: APUs completos para cálculos en frontend
}

export class EstructuraPresupuestoService {
  constructor(
    private readonly presupuestoService: PresupuestoService,
    private readonly tituloService: TituloService,
    private readonly partidaService: PartidaService,
    private readonly apuService?: ApuService
  ) {}

  /**
   * Obtiene la estructura completa del presupuesto con títulos, partidas y APUs como arrays planos
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

    // Obtener todos los APUs del presupuesto (si el servicio está disponible)
    let apus: Apu[] = [];
    if (this.apuService) {
      apus = await this.apuService.obtenerPorPresupuesto(id_presupuesto);
    }

    // Devolver arrays planos - el frontend construirá la jerarquía y calculará totales
    return {
      presupuesto,
      titulos,
      partidas,
      apus
    };
  }
}

