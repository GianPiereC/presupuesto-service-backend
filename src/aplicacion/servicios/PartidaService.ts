import { Partida } from '../../dominio/entidades/Partida';
import { IPartidaRepository } from '../../dominio/repositorios/IPartidaRepository';
import { BaseService } from './BaseService';
import { PartidaModel } from '../../infraestructura/persistencia/mongo/schemas/PartidaSchema';
import { RecalculoTotalesService } from './RecalculoTotalesService';
import { ApuService } from './ApuService';
import { logger } from '../../infraestructura/logging';

export class PartidaService extends BaseService<Partida> {
  private readonly partidaRepository: IPartidaRepository;
  private readonly recalculoTotalesService: RecalculoTotalesService | undefined;
  private readonly apuService: ApuService | undefined;

  constructor(
    partidaRepository: IPartidaRepository,
    recalculoTotalesService?: RecalculoTotalesService,
    apuService?: ApuService
  ) {
    super(partidaRepository);
    this.partidaRepository = partidaRepository;
    this.recalculoTotalesService = recalculoTotalesService;
    this.apuService = apuService;
  }

  async obtenerTodos(): Promise<Partida[]> {
    return await this.partidaRepository.list();
  }

  async obtenerPorId(id_partida: string): Promise<Partida | null> {
    return await this.partidaRepository.obtenerPorIdPartida(id_partida);
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Partida[]> {
    return await this.partidaRepository.obtenerPorPresupuesto(id_presupuesto);
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Partida[]> {
    return await this.partidaRepository.obtenerPorProyecto(id_proyecto);
  }

  async obtenerPorTitulo(id_titulo: string): Promise<Partida[]> {
    return await this.partidaRepository.obtenerPorTitulo(id_titulo);
  }

  async obtenerPrincipalesPorTitulo(id_titulo: string): Promise<Partida[]> {
    return await this.partidaRepository.obtenerPrincipalesPorTitulo(id_titulo);
  }

  async obtenerSubpartidas(id_partida_padre: string): Promise<Partida[]> {
    return await this.partidaRepository.obtenerSubpartidas(id_partida_padre);
  }

  async crear(data: Partial<Partida>): Promise<Partida> {
    // Generar ID si no existe - crear objeto con id_partida desde el inicio
    const idPartida = data.id_partida || await PartidaModel.generateNextId();
    const partidaData: Partial<Partida> & { id_partida: string } = {
      ...data,
      id_partida: idPartida
    };

    // Calcular parcial si no existe
    if (partidaData.metrado !== undefined && partidaData.precio_unitario !== undefined) {
      partidaData.parcial_partida = (partidaData.metrado || 0) * (partidaData.precio_unitario || 0);
    }

    const partidaCreada = await this.partidaRepository.create(partidaData);

    // Recalcular totales del título después de crear la partida
    if (this.recalculoTotalesService && partidaCreada.id_titulo && partidaCreada.id_presupuesto) {
      try {
        await this.recalculoTotalesService.recalcularTotalesAscendentes(
          partidaCreada.id_titulo,
          partidaCreada.id_presupuesto
        );
      } catch (error) {
        console.error('[PartidaService] Error al recalcular totales después de crear partida:', error);
        // No lanzar error para no interrumpir la creación
      }
    }

    return partidaCreada;
  }

  async actualizar(id_partida: string, data: Partial<Partida>): Promise<Partida | null> {

    // Obtener partida actual antes de actualizar (para detectar cambio de título)
    const partidaActual = await this.obtenerPorId(id_partida);
    if (!partidaActual) return null;

    const idTituloAnterior = partidaActual.id_titulo;
    const idTituloNuevo = data.id_titulo !== undefined ? data.id_titulo : idTituloAnterior;
    const cambioTitulo = idTituloAnterior !== idTituloNuevo;

    // Recalcular parcial si se actualiza metrado o precio
    if (data.metrado !== undefined || data.precio_unitario !== undefined) {
      const metrado = data.metrado !== undefined ? data.metrado : partidaActual.metrado;
      const precio = data.precio_unitario !== undefined ? data.precio_unitario : partidaActual.precio_unitario;
      data.parcial_partida = metrado * precio;
    }

    const partidaActualizada = await this.partidaRepository.update(id_partida, data);

    // Recalcular totales si cambió el título o se actualizó parcial
    if (this.recalculoTotalesService && partidaActualizada) {
      try {
        // Si cambió de título, recalcular ambos títulos
        if (cambioTitulo && idTituloAnterior && partidaActualizada.id_presupuesto) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(
            idTituloAnterior,
            partidaActualizada.id_presupuesto
          );
        }

        // Recalcular el título actual (nuevo o mismo)
        if (partidaActualizada.id_titulo && partidaActualizada.id_presupuesto) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(
            partidaActualizada.id_titulo,
            partidaActualizada.id_presupuesto
          );
        }
      } catch (error) {
        console.error('[PartidaService] Error al recalcular totales después de actualizar partida:', error);
        // No lanzar error para no interrumpir la actualización
      }
    }

    return partidaActualizada;
  }

  async eliminar(id_partida: string): Promise<Partida | null> {
    try {
      // Obtener la partida antes de eliminarla
      const partida = await this.partidaRepository.obtenerPorIdPartida(id_partida);
      if (!partida) {
        return null;
      }

      const idTitulo = partida.id_titulo;
      const idPresupuesto = partida.id_presupuesto;

      logger.debug('[PartidaService] Eliminando partida', {
        id_partida,
        idTitulo,
        parcial_partida: partida.parcial_partida
      });

      // 1. Eliminar todos los APUs asociados a esta partida
      if (this.apuService) {
        try {
          // Obtener APUs asociados a esta partida
          const apuAsociado = await this.apuService.obtenerPorPartida(id_partida);
          if (apuAsociado) {
            logger.debug('[PartidaService] Eliminando APU asociado a la partida', {
              id_partida,
              id_apu: apuAsociado.id_apu
            });
            await this.apuService.eliminar(apuAsociado.id_apu);
          }
        } catch (error) {
          logger.error('[PartidaService] Error al eliminar APU asociado:', error as Error);
          // No lanzar error para no interrumpir la eliminación de la partida
        }
      } else {
        logger.warn('[PartidaService] ApuService no disponible, no se eliminarán APUs asociados');
      }

      // 2. Eliminar recursivamente todas las subpartidas
      const subpartidas = await this.partidaRepository.obtenerSubpartidas(id_partida);
      logger.debug('[PartidaService] Eliminando subpartidas', {
        id_partida,
        cantidad_subpartidas: subpartidas.length
      });
      for (const subpartida of subpartidas) {
        await this.eliminar(subpartida.id_partida); // Eliminación recursiva
      }

      // 3. Finalmente, eliminar la partida
      const deleted = await this.partidaRepository.delete(id_partida);

      // 3. Recalcular totales del título después de eliminar
      if (deleted && this.recalculoTotalesService && idTitulo && idPresupuesto) {
        try {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(
            idTitulo,
            idPresupuesto
          );
        } catch (error) {
          console.error('[PartidaService] Error al recalcular totales después de eliminar partida:', error);
          // No lanzar error para no interrumpir la eliminación
        }
      }

      if (deleted) {
        return partida;
      }
      return null;
    } catch (error: any) {
      console.error('Error al eliminar partida:', error);
      throw new Error(error.message || 'Error al eliminar la partida');
    }
  }
}

