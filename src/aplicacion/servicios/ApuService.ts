import { Apu } from '../../dominio/entidades/Apu';
import { RecursoApu } from '../../dominio/entidades/RecursoApu';
import { IApuRepository } from '../../dominio/repositorios/IApuRepository';
import { BaseService } from './BaseService';
import { ApuModel } from '../../infraestructura/persistencia/mongo/schemas/ApuSchema';
import { PrecioRecursoPresupuestoService } from './PrecioRecursoPresupuestoService';
import { PartidaService } from './PartidaService';
import { RecalculoTotalesService } from './RecalculoTotalesService';
import mongoose from 'mongoose';

interface CrearApuInput extends Partial<Apu> {
  usuario_actualizo?: string;
  precios_recursos?: Map<string, number>;
}

export class ApuService extends BaseService<Apu> {
  private readonly apuRepository: IApuRepository;
  private readonly precioRecursoPresupuestoService: PrecioRecursoPresupuestoService | undefined;
  private readonly partidaService: PartidaService | undefined;
  private readonly recalculoTotalesService: RecalculoTotalesService | undefined;

  constructor(
    apuRepository: IApuRepository,
    precioRecursoPresupuestoService?: PrecioRecursoPresupuestoService,
    partidaService?: PartidaService,
    recalculoTotalesService?: RecalculoTotalesService
  ) {
    super(apuRepository);
    this.apuRepository = apuRepository;
    this.precioRecursoPresupuestoService = precioRecursoPresupuestoService;
    this.partidaService = partidaService;
    this.recalculoTotalesService = recalculoTotalesService;
  }

  async obtenerTodos(): Promise<Apu[]> {
    return await this.apuRepository.list();
  }

  async obtenerPorId(id_apu: string): Promise<Apu | null> {
    return await this.apuRepository.obtenerPorIdApu(id_apu);
  }

  async obtenerPorPartida(id_partida: string): Promise<Apu | null> {
    return await this.apuRepository.obtenerPorPartida(id_partida);
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<Apu[]> {
    return await this.apuRepository.obtenerPorPresupuesto(id_presupuesto);
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Apu[]> {
    return await this.apuRepository.obtenerPorProyecto(id_proyecto);
  }

  async crear(data: CrearApuInput): Promise<Apu> {
    const idApu = data.id_apu || await ApuModel.generateNextId();
    const recursos = data.recursos || [];
    const preciosRecursos = (data as any).precios_recursos as Map<string, number> || new Map();

    if (recursos.length > 0 && this.precioRecursoPresupuestoService && data.id_presupuesto) {
      for (const recurso of recursos) {
        const precioExistente = await this.precioRecursoPresupuestoService
          .obtenerPorPresupuestoYRecurso(data.id_presupuesto, recurso.recurso_id);

        // Obtener el precio del recurso (del mapa de precios o del precio existente)
        const precioRecurso = preciosRecursos.get(recurso.recurso_id) || 0;

        if (precioExistente) {
          recurso.id_precio_recurso = precioExistente.id_precio_recurso;
          // Actualizar precio si es diferente
          if (Math.abs(precioRecurso - precioExistente.precio) > 0.01) {
            await this.precioRecursoPresupuestoService.actualizarPrecio(
              precioExistente.id_precio_recurso,
              precioRecurso,
              data.usuario_actualizo || 'system'
            );
          }
        } else if (precioRecurso > 0) {
          // Crear precio compartido si no existe y hay precio válido
          await this.crearPrecioCompartido(
            data.id_presupuesto,
            recurso,
            precioRecurso,
            data.usuario_actualizo || 'system'
          );
        }
      }
    }
    
    const dataConId: Partial<Apu> = {
      ...data,
      recursos,
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_equipos: 0,
      costo_subcontratos: 0,
      costo_directo: 0
    } as Partial<Apu>;
    (dataConId as any).id_apu = idApu;
    
    const apu = await this.apuRepository.create(dataConId);
    
    if (apu.recursos.length > 0) {
      apu.calcularCostoDirecto();
      await this.apuRepository.update(apu.id_apu, apu);
      
      // Actualizar precio_unitario de la partida
      await this.actualizarPrecioPartida(apu.id_partida, apu.costo_directo);
    }
    
    return apu;
  }

  async actualizar(id_apu: string, data: Partial<Apu>): Promise<Apu | null> {
    const apu = await this.obtenerPorId(id_apu);
    if (!apu) return null;
    
    const rendimientoCambio = data.rendimiento !== undefined && data.rendimiento !== apu.rendimiento;
    const jornadaCambio = data.jornada !== undefined && data.jornada !== apu.jornada;
    
    if (data.rendimiento !== undefined) {
      apu.rendimiento = data.rendimiento;
    }
    if (data.jornada !== undefined) {
      apu.jornada = data.jornada;
    }
    
    if ((rendimientoCambio || jornadaCambio) && apu.recursos.length > 0 && this.precioRecursoPresupuestoService) {
      const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(apu.id_presupuesto);
      const preciosMap = new Map(precios.map(p => [p.id_precio_recurso, p.precio]));
      
      for (const recurso of apu.recursos) {
        if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
          const precio = preciosMap.get(recurso.id_precio_recurso)!;
          recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
        }
      }
    }
    
    if (apu.recursos.length > 0) {
      apu.calcularCostoDirecto();
      await this.apuRepository.update(id_apu, apu);
      
      // Actualizar precio_unitario de la partida
      await this.actualizarPrecioPartida(apu.id_partida, apu.costo_directo);
    }
    
    return apu;
  }

  async agregarRecurso(
    id_apu: string, 
    recurso: RecursoApu,
    precioUsuario: number,
    usuarioId?: string
  ): Promise<Apu | null> {
    const apu = await this.obtenerPorId(id_apu);
    if (!apu) return null;

    if (this.precioRecursoPresupuestoService) {
      const precioExistente = await this.precioRecursoPresupuestoService
        .obtenerPorPresupuestoYRecurso(apu.id_presupuesto, recurso.recurso_id);
      
      if (precioExistente) {
        recurso.id_precio_recurso = precioExistente.id_precio_recurso;
        
        if (Math.abs(precioUsuario - precioExistente.precio) > 0.01) {
          await this.precioRecursoPresupuestoService.actualizarPrecio(
            precioExistente.id_precio_recurso,
            precioUsuario,
            usuarioId || 'system'
          );
        }
      } else {
        await this.crearPrecioCompartido(
          apu.id_presupuesto,
          recurso,
          precioUsuario,
          usuarioId || 'system'
        );
      }
    }
    
    const apuActualizado = await this.apuRepository.agregarRecurso(id_apu, recurso);
    
    if (apuActualizado) {
      // Actualizar precio_unitario de la partida
      await this.actualizarPrecioPartida(apuActualizado.id_partida, apuActualizado.costo_directo);
    }
    
    return apuActualizado;
  }

  async actualizarRecurso(
    id_apu: string,
    id_recurso_apu: string,
    recurso: Partial<RecursoApu>,
    precioUsuario: number,
    usuarioId?: string
  ): Promise<Apu | null> {
    const apu = await this.obtenerPorId(id_apu);
    if (!apu) return null;

    const apuActual = await this.obtenerPorId(id_apu);
    const recursoCompleto = apuActual?.recursos.find(r => r.id_recurso_apu === id_recurso_apu);
    
    if (!recursoCompleto || !this.precioRecursoPresupuestoService) {
      return await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
    }

    const precioExistente = await this.precioRecursoPresupuestoService
      .obtenerPorPresupuestoYRecurso(apu.id_presupuesto, recursoCompleto.recurso_id);
    
    let precioFinal = precioUsuario;
    
    if (precioExistente) {
      if (Math.abs(precioUsuario - precioExistente.precio) > 0.01) {
        await this.precioRecursoPresupuestoService.actualizarPrecio(
          precioExistente.id_precio_recurso,
          precioUsuario,
          usuarioId || 'system'
        );
        // Obtener el precio actualizado después de actualizarlo
        const precioActualizado = await this.precioRecursoPresupuestoService.obtenerPorId(precioExistente.id_precio_recurso);
        if (precioActualizado) {
          precioFinal = precioActualizado.precio;
        } else {
          precioFinal = precioUsuario;
        }
      } else {
        precioFinal = precioExistente.precio;
      }
      recurso.id_precio_recurso = precioExistente.id_precio_recurso;
    } else {
      await this.crearPrecioCompartido(
        apu.id_presupuesto,
        recursoCompleto,
        precioUsuario,
        usuarioId || 'system'
      );
      recurso.id_precio_recurso = recursoCompleto.id_precio_recurso;
      precioFinal = precioUsuario;
    }

      // Recalcular parcial con el precio actualizado
      // Usar los valores del recurso actualizado (si vienen en recurso) o los del recurso completo
      const cantidadFinal = recurso.cantidad !== undefined ? recurso.cantidad : recursoCompleto.cantidad;
      const cuadrillaFinal = recurso.cuadrilla !== undefined ? recurso.cuadrilla : recursoCompleto.cuadrilla;
      const desperdicioFinal = recurso.desperdicio_porcentaje !== undefined ? recurso.desperdicio_porcentaje : recursoCompleto.desperdicio_porcentaje;
      
      // Crear un recurso temporal para calcular el parcial
      const recursoTemp = new RecursoApu(
        recursoCompleto.id_recurso_apu,
        recursoCompleto.recurso_id,
        recursoCompleto.codigo_recurso,
        recursoCompleto.descripcion,
        recursoCompleto.unidad_medida,
        recursoCompleto.tipo_recurso,
        recurso.id_precio_recurso ?? recursoCompleto.id_precio_recurso,
        cantidadFinal,
        desperdicioFinal,
        cantidadFinal * (1 + desperdicioFinal / 100),
        0, // parcial se calculará
        recursoCompleto.orden,
        cuadrillaFinal
      );
      
      // Calcular parcial con el precio actualizado, considerando casos especiales
      const parcialCalculado = this.calcularParcialRecurso(recursoTemp, precioFinal, apu);
      recurso.parcial = parcialCalculado;

    const apuActualizado = await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
    
    if (apuActualizado) {
      // Actualizar precio_unitario de la partida
      await this.actualizarPrecioPartida(apuActualizado.id_partida, apuActualizado.costo_directo);
    }
    
    return apuActualizado;
  }

  private async crearPrecioCompartido(
    id_presupuesto: string,
    recurso: RecursoApu,
    precio: number,
    usuarioId: string
  ): Promise<void> {
    if (!this.precioRecursoPresupuestoService) return;

    try {
      const nuevoPrecio = await this.precioRecursoPresupuestoService.crear({
        id_presupuesto,
        recurso_id: recurso.recurso_id,
        codigo_recurso: recurso.codigo_recurso,
        descripcion: recurso.descripcion,
        unidad: recurso.unidad_medida,
        tipo_recurso: recurso.tipo_recurso,
        precio,
        usuario_actualizo: usuarioId
      });

      recurso.id_precio_recurso = nuevoPrecio.id_precio_recurso;
    } catch (error) {
      console.error('[ApuService] Error al crear precio compartido:', error);
    }
  }

  async eliminarRecurso(id_apu: string, id_recurso_apu: string): Promise<Apu | null> {
    const apuActualizado = await this.apuRepository.eliminarRecurso(id_apu, id_recurso_apu);
    
    if (apuActualizado) {
      // Actualizar precio_unitario de la partida
      await this.actualizarPrecioPartida(apuActualizado.id_partida, apuActualizado.costo_directo);
    }
    
    return apuActualizado;
  }

  async recalcularApu(id_apu: string): Promise<Apu | null> {
    const apu = await this.obtenerPorId(id_apu);
    if (!apu) return null;
    
    apu.calcularCostoDirecto();
    await this.apuRepository.update(id_apu, apu);
    
    // Actualizar precio_unitario de la partida
    await this.actualizarPrecioPartida(apu.id_partida, apu.costo_directo);
    
    return apu;
  }

  /**
   * Calcula el parcial de un recurso considerando casos especiales (EQUIPO con "%mo" o "hm")
   */
  private calcularParcialRecurso(recurso: RecursoApu, precio: number, apu: Apu): number {
    const unidadMedidaLower = recurso.unidad_medida?.toLowerCase() || '';
    
    // Si es EQUIPO con unidad "%mo", calcular basándose en la sumatoria de parciales de MANO_OBRA
    if (recurso.tipo_recurso === 'EQUIPO' && unidadMedidaLower === '%mo') {
      // Sumar todos los parciales de MANO_OBRA del APU (ya calculados previamente)
      const sumaHHManoObra = apu.recursos
        .filter(r => r.tipo_recurso === 'MANO_OBRA')
        .reduce((suma, r) => suma + (r.parcial || 0), 0);
      
      // Aplicar el porcentaje: sumaHH * (cantidad / 100) - redondear a 2 decimales
      return Math.round(sumaHHManoObra * (recurso.cantidad / 100) * 100) / 100;
    }
    
    // Para otros casos, usar el método estándar
    return recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
  }

  /**
   * Actualiza el precio_unitario de la partida basado en el costo_directo del APU
   * Redondea a 2 decimales para mantener consistencia
   * Recalcula totales ascendentes de títulos y presupuesto
   */
  private async actualizarPrecioPartida(id_partida: string, costo_directo: number): Promise<void> {
    if (!this.partidaService) return;
    
    try {
      const partida = await this.partidaService.obtenerPorId(id_partida);
      if (!partida) return;
      
      // Actualizar precio_unitario = costo_directo (redondeado a 2 decimales)
      // Recalcular parcial_partida = metrado * precio_unitario (redondeado a 2 decimales)
      const nuevoPrecioUnitario = Math.round(costo_directo * 100) / 100;
      const nuevoParcialPartida = Math.round(partida.metrado * nuevoPrecioUnitario * 100) / 100;
      
      await this.partidaService.actualizar(id_partida, {
        precio_unitario: nuevoPrecioUnitario,
        parcial_partida: nuevoParcialPartida
      });
      
      // Recalcular totales ascendentes del título (y propagar hacia arriba)
      if (this.recalculoTotalesService) {
        await this.recalculoTotalesService.recalcularTotalesAscendentes(partida.id_titulo, partida.id_presupuesto);
      }
    } catch (error) {
      console.error('[ApuService] Error al actualizar precio de partida:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Recalcula todos los APUs que usan un recurso específico (para bulk update cuando cambia precio)
   * Optimizado: recopila títulos únicos afectados para evitar recálculos duplicados
   * Usa transacciones para asegurar consistencia (rollback si falla)
   */
  async recalcularApusConRecurso(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<void> {
    if (!this.precioRecursoPresupuestoService || !this.partidaService) return;
    
    try {
      // Intentar usar transacciones primero
      await this.recalcularApusConRecursoConTransaccion(id_presupuesto, recurso_id);
    } catch (error: any) {
      // Si el error es porque no hay replica set, usar método sin transacciones
      if (error.message?.includes('Transaction numbers are only allowed on a replica set') ||
          error.message?.includes('not a replica set') ||
          error.code === 20) {
        await this.recalcularApusConRecursoSinTransaccion(id_presupuesto, recurso_id);
      } else {
        console.error('[ApuService] Error al recalcular APUs con recurso:', error);
        throw error;
      }
    }
  }

  /**
   * Recalcula APUs con transacciones de MongoDB
   */
  private async recalcularApusConRecursoConTransaccion(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<void> {
    if (!this.precioRecursoPresupuestoService || !this.partidaService) return;
    
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
      // Obtener todos los APUs del presupuesto
      const apus = await this.obtenerPorPresupuesto(id_presupuesto);
      
      // Filtrar APUs que tienen este recurso
      const apusAfectados = apus.filter(apu => 
        apu.recursos.some(r => r.recurso_id === recurso_id)
      );
      
      // Obtener precios actualizados
        if (!this.precioRecursoPresupuestoService || !this.partidaService) return;
        
      const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(id_presupuesto);
      const preciosMap = new Map(precios.map(p => [p.id_precio_recurso, p.precio]));
        
        // Set para recopilar títulos únicos afectados (evitar recalcular duplicados)
        const titulosAfectados = new Set<string>();
      
      // Recalcular cada APU afectado
      for (const apu of apusAfectados) {
        // Primero calcular parciales de MANO_OBRA (necesarios para EQUIPO con "%mo")
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso === 'MANO_OBRA' && recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
            const precio = preciosMap.get(recurso.id_precio_recurso)!;
            recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
          }
        }
        
        // Luego calcular parciales de otros recursos (incluyendo EQUIPO que puede depender de MANO_OBRA)
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso !== 'MANO_OBRA' && recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
            const precio = preciosMap.get(recurso.id_precio_recurso)!;
            recurso.parcial = this.calcularParcialRecurso(recurso, precio, apu);
          }
        }
        
        // Recalcular costo_directo
        apu.calcularCostoDirecto();
        
        // Guardar APU actualizado
        await this.apuRepository.update(apu.id_apu, apu);
        
          // Actualizar precio_unitario y parcial_partida de la partida
          const partida = await this.partidaService.obtenerPorId(apu.id_partida);
          if (partida) {
            const nuevoPrecioUnitario = Math.round(apu.costo_directo * 100) / 100;
            const nuevoParcialPartida = Math.round(partida.metrado * nuevoPrecioUnitario * 100) / 100;
            
            await this.partidaService.actualizar(apu.id_partida, {
              precio_unitario: nuevoPrecioUnitario,
              parcial_partida: nuevoParcialPartida
            });
            
            // Agregar título a la lista de afectados (evita duplicados)
            titulosAfectados.add(partida.id_titulo);
          }
        }
        
      // Recalcular totales de títulos únicos afectados (batch - evita recálculos duplicados)
      if (this.recalculoTotalesService && titulosAfectados.size > 0) {
        // Recalcular cada título único y propagar hacia arriba
        // Nota: RecalculoTotalesService maneja sus propias transacciones
        for (const id_titulo of titulosAfectados) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(id_titulo, id_presupuesto);
        }
      }
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Recalcula APUs sin transacciones (fallback con rollback manual)
   */
  private async recalcularApusConRecursoSinTransaccion(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<void> {
    if (!this.precioRecursoPresupuestoService || !this.partidaService) return;
    
    // Almacenar estados originales para rollback manual
    const estadosAPUs: Array<{ id_apu: string; costo_directo: number }> = [];
    const estadosPartidas: Array<{ id_partida: string; precio_unitario: number; parcial_partida: number }> = [];
    
    try {
      // Obtener todos los APUs del presupuesto
      const apus = await this.obtenerPorPresupuesto(id_presupuesto);
      
      // Filtrar APUs que tienen este recurso
      const apusAfectados = apus.filter(apu => 
        apu.recursos.some(r => r.recurso_id === recurso_id)
      );
      
      // Guardar estados originales de APUs
      for (const apu of apusAfectados) {
        estadosAPUs.push({ id_apu: apu.id_apu, costo_directo: apu.costo_directo });
      }
      
      // Obtener precios actualizados
      const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(id_presupuesto);
      const preciosMap = new Map(precios.map(p => [p.id_precio_recurso, p.precio]));
      
      // Set para recopilar títulos únicos afectados
      const titulosAfectados = new Set<string>();
      
      // Recalcular cada APU afectado
      for (const apu of apusAfectados) {
        // Primero calcular parciales de MANO_OBRA
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso === 'MANO_OBRA' && recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
            const precio = preciosMap.get(recurso.id_precio_recurso)!;
            recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
          }
        }
        
        // Luego calcular parciales de otros recursos
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso !== 'MANO_OBRA' && recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
            const precio = preciosMap.get(recurso.id_precio_recurso)!;
            recurso.parcial = this.calcularParcialRecurso(recurso, precio, apu);
          }
        }
        
        // Recalcular costo_directo
        apu.calcularCostoDirecto();
        
        // Guardar APU actualizado
        await this.apuRepository.update(apu.id_apu, apu);
        
        // Actualizar precio_unitario y parcial_partida de la partida
        const partida = await this.partidaService.obtenerPorId(apu.id_partida);
        if (partida) {
          // Guardar estado original de partida
          estadosPartidas.push({
            id_partida: partida.id_partida,
            precio_unitario: partida.precio_unitario,
            parcial_partida: partida.parcial_partida
          });
          
          const nuevoPrecioUnitario = Math.round(apu.costo_directo * 100) / 100;
          const nuevoParcialPartida = Math.round(partida.metrado * nuevoPrecioUnitario * 100) / 100;
          
          await this.partidaService.actualizar(apu.id_partida, {
            precio_unitario: nuevoPrecioUnitario,
            parcial_partida: nuevoParcialPartida
          });
          
          titulosAfectados.add(partida.id_titulo);
        }
      }
      
      // Recalcular totales de títulos únicos afectados
      if (this.recalculoTotalesService && titulosAfectados.size > 0) {
        // Recalcular cada título único y propagar hacia arriba
        for (const id_titulo of titulosAfectados) {
          await this.recalculoTotalesService.recalcularTotalesAscendentes(id_titulo, id_presupuesto);
        }
      }
    } catch (error) {
      // Rollback manual: revertir todos los cambios
      console.error('[ApuService] Error al recalcular APUs, ejecutando rollback manual...', error);
      
      // Rollback de partidas
      for (let i = estadosPartidas.length - 1; i >= 0; i--) {
        const estado = estadosPartidas[i];
        if (estado) {
          await this.partidaService.actualizar(estado.id_partida, {
            precio_unitario: estado.precio_unitario,
            parcial_partida: estado.parcial_partida
          });
        }
      }
      
      // Rollback de APUs (restaurar costo_directo)
      for (let i = estadosAPUs.length - 1; i >= 0; i--) {
        const estado = estadosAPUs[i];
        if (estado) {
          const apu = await this.obtenerPorId(estado.id_apu);
          if (apu) {
            apu.costo_directo = estado.costo_directo;
            await this.apuRepository.update(estado.id_apu, apu);
          }
        }
      }
      
      // Rollback de títulos y presupuesto se maneja automáticamente por RecalculoTotalesService
      // No necesitamos rollback manual aquí porque RecalculoTotalesService ya lo maneja
      
      throw error;
    }
  }

  async eliminar(id_apu: string): Promise<boolean> {
    return await this.apuRepository.delete(id_apu);
  }
}


