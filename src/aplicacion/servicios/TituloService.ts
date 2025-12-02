import { Titulo } from '../../dominio/entidades/Titulo';
import { ITituloRepository } from '../../dominio/repositorios/ITituloRepository';
import { IPartidaRepository } from '../../dominio/repositorios/IPartidaRepository';
import { BaseService } from './BaseService';
import { TituloModel } from '../../infraestructura/persistencia/mongo/schemas/TituloSchema';
import { ValidationException } from '../../dominio/exceptions/DomainException';
import { RecalculoTotalesService } from './RecalculoTotalesService';
import { ApuService } from './ApuService';
import { logger } from '../../infraestructura/logging';

export class TituloService extends BaseService<Titulo> {
  private readonly tituloRepository: ITituloRepository;
  private readonly partidaRepository: IPartidaRepository;
  private readonly recalculoTotalesService: RecalculoTotalesService | undefined;
  private readonly apuService: ApuService | undefined;

  constructor(
    tituloRepository: ITituloRepository,
    partidaRepository: IPartidaRepository,
    recalculoTotalesService?: RecalculoTotalesService,
    apuService?: ApuService
  ) {
    super(tituloRepository);
    this.tituloRepository = tituloRepository;
    this.partidaRepository = partidaRepository;
    this.recalculoTotalesService = recalculoTotalesService;
    this.apuService = apuService;
  }

  async obtenerTodos(): Promise<Titulo[]> {
    return await this.tituloRepository.list();
  }

  async obtenerPorId(id_titulo: string): Promise<Titulo | null> {
    return await this.tituloRepository.obtenerPorIdTitulo(id_titulo);
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Titulo[]> {
    return await this.tituloRepository.obtenerPorPresupuesto(id_presupuesto);
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Titulo[]> {
    return await this.tituloRepository.obtenerPorProyecto(id_proyecto);
  }

  async obtenerHijos(id_titulo_padre: string): Promise<Titulo[]> {
    return await this.tituloRepository.obtenerHijos(id_titulo_padre);
  }

  async obtenerPorPadre(id_titulo_padre: string | null): Promise<Titulo[]> {
    return await this.tituloRepository.obtenerPorPadre(id_titulo_padre);
  }

  async crear(data: Partial<Titulo>): Promise<Titulo> {
    // Generar ID si no existe
    if (!data.id_titulo) {
      (data as any).id_titulo = await TituloModel.generateNextId();
    }
    
    // Validar unicidad de numero_item por proyecto
    if (data.numero_item && data.id_proyecto) {
      const existente = await this.tituloRepository.obtenerPorNumeroItemYProyecto(
        data.numero_item,
        data.id_proyecto
      );
      if (existente) {
        throw new ValidationException(
          `Ya existe un título con el número de item "${data.numero_item}" en este proyecto`,
          'numero_item'
        );
      }
    }
    
    const tituloCreado = await this.tituloRepository.create(data);
    
    // Recalcular totales del padre después de crear el título
    if (this.recalculoTotalesService && tituloCreado.id_titulo_padre && tituloCreado.id_presupuesto) {
      try {
        await this.recalculoTotalesService.recalcularTotalesAscendentes(
          tituloCreado.id_titulo_padre,
          tituloCreado.id_presupuesto
        );
      } catch (error) {
        console.error('[TituloService] Error al recalcular totales después de crear título:', error);
        // No lanzar error para no interrumpir la creación
      }
    }
    
    return tituloCreado;
  }

  async actualizar(id_titulo: string, data: Partial<Titulo>, skipRecalculo: boolean = false): Promise<Titulo | null> {
    // Validar unicidad de numero_item por proyecto si se está actualizando
    if (data.numero_item) {
      const tituloActual = await this.obtenerPorId(id_titulo);
      if (tituloActual) {
        const id_proyecto = data.id_proyecto || tituloActual.id_proyecto;
        const existente = await this.tituloRepository.obtenerPorNumeroItemYProyecto(
          data.numero_item,
          id_proyecto,
          id_titulo // Excluir el título actual
        );
        if (existente) {
          throw new ValidationException(
            `Ya existe otro título con el número de item "${data.numero_item}" en este proyecto`,
            'numero_item'
          );
        }
      }
    }
    
    // Obtener título actual antes de actualizar (para detectar cambio de padre)
    const tituloActual = await this.obtenerPorId(id_titulo);
    if (!tituloActual) return null;
    
    const idPadreAnterior = tituloActual.id_titulo_padre;
    const idPadreNuevo = data.id_titulo_padre !== undefined ? data.id_titulo_padre : idPadreAnterior;
    const cambioPadre = idPadreAnterior !== idPadreNuevo;
    
    const tituloActualizado = await this.tituloRepository.update(id_titulo, data);
    
    // Recalcular totales solo si NO estamos dentro de un recálculo (skipRecalculo = false)
    // y si cambió el padre (no solo el total_parcial)
    if (!skipRecalculo && this.recalculoTotalesService && tituloActualizado) {
      try {
        // Solo recalcular si cambió el padre (movimiento de título)
        // NO recalcular si solo cambió total_parcial (eso viene de un recálculo)
        if (cambioPadre && idPadreAnterior && tituloActualizado.id_presupuesto) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(
            idPadreAnterior,
            tituloActualizado.id_presupuesto
          );
        }
        
        // Solo recalcular el título actual si cambió el padre (movimiento)
        // NO recalcular si solo cambió total_parcial
        if (cambioPadre && tituloActualizado.id_titulo && tituloActualizado.id_presupuesto) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(
            tituloActualizado.id_titulo,
            tituloActualizado.id_presupuesto
          );
        }
      } catch (error) {
        console.error('[TituloService] Error al recalcular totales después de actualizar título:', error);
        // No lanzar error para no interrumpir la actualización
      }
    }
    
    return tituloActualizado;
  }

  async eliminar(id_titulo: string): Promise<Titulo | null> {
    try {
      // Obtener el título antes de eliminarlo
      const titulo = await this.tituloRepository.obtenerPorIdTitulo(id_titulo);
      if (!titulo) {
        return null;
      }

      const idPadre = titulo.id_titulo_padre;
      const idPresupuesto = titulo.id_presupuesto;

      // 1. Eliminar recursivamente todos los títulos hijos
      const hijos = await this.tituloRepository.obtenerHijos(id_titulo);
      for (const hijo of hijos) {
        await this.eliminar(hijo.id_titulo); // Eliminación recursiva
      }

      // 2. Eliminar todas las partidas asociadas a este título (en cascada)
      const partidas = await this.partidaRepository.obtenerPorTitulo(id_titulo);
      for (const partida of partidas) {
        await this.eliminarPartidaRecursiva(partida.id_partida);
      }

      // 3. Finalmente, eliminar el título
      const deleted = await this.tituloRepository.delete(id_titulo);
      
      // 4. Recalcular totales del padre después de eliminar
      if (deleted && this.recalculoTotalesService && idPresupuesto) {
        try {
          // Si tiene padre, recalcular el padre
          if (idPadre) {
            await this.recalculoTotalesService.recalcularTotalesAscendentes(
              idPadre,
              idPresupuesto
            );
          } else {
            // Si es raíz, recalcular todos los títulos raíz restantes
            // Obtener todos los títulos raíz y recalcular el primero (cualquiera sirve para actualizar presupuesto)
            const titulosRaiz = await this.tituloRepository.obtenerPorPadre(null);
            if (titulosRaiz.length > 0 && titulosRaiz[0]) {
              // Recalcular el primer título raíz (cualquiera sirve para actualizar presupuesto)
              await this.recalculoTotalesService.recalcularTotalesAscendentes(
                titulosRaiz[0].id_titulo,
                idPresupuesto
              );
            } else {
              // No hay más títulos raíz, actualizar presupuesto a 0 directamente
              const PresupuestoModel = (await import('../../infraestructura/persistencia/mongo/schemas/PresupuestoSchema')).PresupuestoModel;
              await PresupuestoModel.updateOne(
                { id_presupuesto: idPresupuesto },
                { $set: { parcial_presupuesto: 0 } }
              );
            }
          }
        } catch (error) {
          console.error('[TituloService] Error al recalcular totales después de eliminar título:', error);
          // No lanzar error para no interrumpir la eliminación
        }
      }
      
      if (deleted) {
        return titulo;
      }
      return null;
    } catch (error: any) {
      console.error('Error al eliminar título:', error);
      throw new Error(error.message || 'Error al eliminar el título');
    }
  }

  /**
   * Método auxiliar para eliminar partidas recursivamente (fallback si no hay PartidaService)
   */
  private async eliminarPartidaRecursiva(id_partida: string): Promise<void> {
    // 1. Eliminar APUs asociados a esta partida antes de eliminarla
    if (this.apuService) {
      try {
        const apuAsociado = await this.apuService.obtenerPorPartida(id_partida);
        if (apuAsociado) {
          logger.debug('[TituloService] Eliminando APU asociado a partida', {
            id_partida,
            id_apu: apuAsociado.id_apu
          });
          await this.apuService.eliminar(apuAsociado.id_apu);
        }
      } catch (error) {
        logger.error('[TituloService] Error al eliminar APU asociado a partida:', error as any);
        // No lanzar error para no interrumpir la eliminación
      }
    } else {
      logger.warn('[TituloService] ApuService no disponible, no se eliminarán APUs asociados a partidas');
    }

    // 2. Eliminar subpartidas recursivamente
    const subpartidas = await this.partidaRepository.obtenerSubpartidas(id_partida);
    for (const subpartida of subpartidas) {
      await this.eliminarPartidaRecursiva(subpartida.id_partida);
    }

    // 3. Finalmente eliminar la partida
    await this.partidaRepository.delete(id_partida);
  }
}

