import { Apu } from '../../dominio/entidades/Apu';
import { RecursoApu } from '../../dominio/entidades/RecursoApu';
import { IApuRepository } from '../../dominio/repositorios/IApuRepository';
import { BaseService } from './BaseService';
import { ApuModel } from '../../infraestructura/persistencia/mongo/schemas/ApuSchema';
import { PrecioRecursoPresupuestoService } from './PrecioRecursoPresupuestoService';
import { PartidaService } from './PartidaService';
import { PartidaModel } from '../../infraestructura/persistencia/mongo/schemas/PartidaSchema';
import mongoose from 'mongoose';

interface CrearApuInput extends Partial<Apu> {
  usuario_actualizo?: string;
  precios_recursos?: Map<string, number>;
}

export class ApuService extends BaseService<Apu> {
  private readonly apuRepository: IApuRepository;
  private readonly precioRecursoPresupuestoService: PrecioRecursoPresupuestoService | undefined;
  private readonly partidaService: PartidaService | undefined;

  constructor(
    apuRepository: IApuRepository,
    precioRecursoPresupuestoService?: PrecioRecursoPresupuestoService,
    partidaService?: PartidaService
  ) {
    super(apuRepository);
    this.apuRepository = apuRepository;
    this.precioRecursoPresupuestoService = precioRecursoPresupuestoService;
    this.partidaService = partidaService;
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
        // Si es subpartida, no manejar precios (las subpartidas tienen precio_unitario_subpartida)
        if (recurso.id_partida_subpartida || !recurso.recurso_id) {
          continue;
        }

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
    
    // El frontend calcula precio_unitario y parcial_partida desde los APUs
    // No es necesario calcular costo_directo ni actualizar partidas aquí
    
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
    
    if ((rendimientoCambio || jornadaCambio) && apu.recursos.length > 0) {
      const preciosMap = new Map<string, number>();
      if (this.precioRecursoPresupuestoService) {
        const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(apu.id_presupuesto);
        precios.forEach(p => {
          preciosMap.set(p.id_precio_recurso, p.precio);
        });
      }
      
      for (const recurso of apu.recursos) {
        let precio = 0;
        
        // PRIORIDAD: Si tiene precio override, usarlo
        if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
          precio = recurso.precio_override;
        } else if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
          precio = preciosMap.get(recurso.id_precio_recurso)!;
        }
        
        if (precio > 0) {
          recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
        }
      }
    }
    
    // El frontend calcula precio_unitario y parcial_partida desde los APUs
    // No es necesario calcular costo_directo ni actualizar partidas aquí
    
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

    // Si tiene precio override, usar precio_override y NO actualizar PrecioRecursoPresupuesto
    if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
      // Usar precio_override directamente, no tocar PrecioRecursoPresupuesto
      // El precio se calcula dinámicamente, no se guarda en RecursoApu
      recurso.parcial = recurso.calcularParcial(recurso.precio_override, apu.rendimiento, apu.jornada);
    } else if (!recurso.id_partida_subpartida && recurso.recurso_id && this.precioRecursoPresupuestoService) {
      // Si NO tiene override, continuar con la lógica normal (precio compartido)
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
    
    // El frontend calcula precio_unitario y parcial_partida desde los APUs
    // No es necesario actualizar partidas aquí
    
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
    
    if (!recursoCompleto) {
      return await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
    }

    // Si es subpartida, no manejar precios (las subpartidas tienen precio_unitario_subpartida)
    // Para subpartidas, el parcial ya viene calculado (cantidad × precio_unitario_subpartida)
    if (recursoCompleto.id_partida_subpartida || !recursoCompleto.recurso_id) {
      // Si se actualiza el precio_unitario_subpartida o cantidad, recalcular parcial
      if (recurso.precio_unitario_subpartida !== undefined || recurso.cantidad !== undefined) {
        const precioUnitarioSubpartida = recurso.precio_unitario_subpartida ?? recursoCompleto.precio_unitario_subpartida ?? 0;
        const cantidad = recurso.cantidad ?? recursoCompleto.cantidad;
        recurso.parcial = Math.round(cantidad * precioUnitarioSubpartida * 100) / 100;
      }
      return await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
    }
    
    // Si tiene precio override, usar precio_override y NO actualizar PrecioRecursoPresupuesto
    if (recurso.tiene_precio_override !== undefined && recurso.tiene_precio_override) {
      // Si se está activando el override o actualizando el precio_override
      if (recurso.precio_override !== undefined) {
        const precioFinal = recurso.precio_override;
        
        // Calcular parcial con precio_override
        const cantidadFinal = recurso.cantidad !== undefined ? recurso.cantidad : recursoCompleto.cantidad;
        const cuadrillaFinal = recurso.cuadrilla !== undefined ? recurso.cuadrilla : recursoCompleto.cuadrilla;
        const desperdicioFinal = recurso.desperdicio_porcentaje !== undefined ? recurso.desperdicio_porcentaje : recursoCompleto.desperdicio_porcentaje;
        
        const recursoTemp = new RecursoApu(
          recursoCompleto.id_recurso_apu,
          recursoCompleto.recurso_id,
          recursoCompleto.codigo_recurso,
          recursoCompleto.descripcion,
          recursoCompleto.unidad_medida,
          recursoCompleto.tipo_recurso,
          recursoCompleto.id_precio_recurso,
          cantidadFinal,
          desperdicioFinal,
          cantidadFinal * (1 + desperdicioFinal / 100),
          0,
          recursoCompleto.orden,
          cuadrillaFinal,
          recursoCompleto.id_partida_subpartida,
          recursoCompleto.precio_unitario_subpartida,
          true, // tiene_precio_override
          precioFinal // precio_override
        );
        
        const parcialCalculado = this.calcularParcialRecurso(recursoTemp, precioFinal, apu);
        recurso.parcial = parcialCalculado;
        
        // Asegurar que se guarden los campos de override
        recurso.tiene_precio_override = true;
        recurso.precio_override = precioFinal;
        
        // NO actualizar PrecioRecursoPresupuesto
        const apuActualizado = await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
        
        // El frontend calcula precio_unitario y parcial_partida desde los APUs
        // No es necesario actualizar partidas aquí
        
        return apuActualizado;
      }
    } else if (recurso.tiene_precio_override === false) {
      // Si se está desactivando el override, limpiar precio_override y usar precio compartido
      recurso.precio_override = undefined;
      // Asegurar que se guarde el estado de override desactivado
      recurso.tiene_precio_override = false;
      
      // Continuar con la lógica normal para usar precio compartido
      // (el código después de este bloque manejará el precio compartido)
    }
    
    // Si NO tiene override (o se desactivó), continuar con la lógica normal (precio compartido)
    if (!recurso.tiene_precio_override) {
      if (!this.precioRecursoPresupuestoService) {
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

      // Recalcular parcial con el precio compartido (no override)
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
        cuadrillaFinal,
        recursoCompleto.id_partida_subpartida,
        recursoCompleto.precio_unitario_subpartida,
        recurso.tiene_precio_override ?? recursoCompleto.tiene_precio_override,
        recurso.precio_override ?? recursoCompleto.precio_override
      );
      
      // Calcular parcial con el precio actualizado, considerando casos especiales
      const parcialCalculado = this.calcularParcialRecurso(recursoTemp, precioFinal, apu);
      recurso.parcial = parcialCalculado;
      
      // Preservar campos de override si no se están cambiando explícitamente
      if (recurso.tiene_precio_override === undefined) {
        recurso.tiene_precio_override = recursoCompleto.tiene_precio_override;
      }
      if (recurso.precio_override === undefined) {
        // Si tiene override activado, preservar el precio_override
        if (recurso.tiene_precio_override) {
          recurso.precio_override = recursoCompleto.precio_override;
        } else {
          // Si no tiene override, asegurar que precio_override sea undefined
          recurso.precio_override = undefined;
        }
      }

      const apuActualizado = await this.apuRepository.actualizarRecurso(id_apu, id_recurso_apu, recurso);
      
      // El frontend calcula precio_unitario y parcial_partida desde los APUs
      // No es necesario actualizar partidas aquí
      
      return apuActualizado;
    }
    
    // Si llegamos aquí, significa que tiene override activado y ya se manejó arriba
    // Este return nunca debería ejecutarse, pero TypeScript lo requiere
    return null;
  }

  private async crearPrecioCompartido(
    id_presupuesto: string,
    recurso: RecursoApu,
    precio: number,
    usuarioId: string
  ): Promise<void> {
    if (!this.precioRecursoPresupuestoService) return;
    if (!recurso.recurso_id || !recurso.codigo_recurso) return;

    try {
      // Verificar si ya existe un precio compartido para este presupuesto y recurso
      const precioExistente = await this.precioRecursoPresupuestoService
        .obtenerPorPresupuestoYRecurso(id_presupuesto, recurso.recurso_id);

      if (precioExistente) {
        // Si ya existe, actualizar el precio si es diferente
        if (Math.abs(precio - precioExistente.precio) > 0.01) {
          await this.precioRecursoPresupuestoService.actualizarPrecio(
            precioExistente.id_precio_recurso,
            precio,
            usuarioId
          );
        }
        recurso.id_precio_recurso = precioExistente.id_precio_recurso;
      } else {
        // Si no existe, crear uno nuevo
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
      }
    } catch (error: any) {
      // Si el error es de clave duplicada, intentar obtener el precio existente
      if (error?.code === 11000 || error?.errorResponse?.code === 11000) {
        console.warn(`[ApuService] Precio compartido ya existe (duplicate key), obteniendo existente...`);
        try {
          const precioExistente = await this.precioRecursoPresupuestoService
            .obtenerPorPresupuestoYRecurso(id_presupuesto, recurso.recurso_id);
          if (precioExistente) {
            recurso.id_precio_recurso = precioExistente.id_precio_recurso;
            // Actualizar precio si es diferente
            if (Math.abs(precio - precioExistente.precio) > 0.01) {
              await this.precioRecursoPresupuestoService.actualizarPrecio(
                precioExistente.id_precio_recurso,
                precio,
                usuarioId
              );
            }
            return;
          }
        } catch (fallbackError) {
          console.error('[ApuService] Error al obtener precio existente después de duplicate key:', fallbackError);
        }
      }
      console.error('[ApuService] Error al crear precio compartido:', error);
    }
  }

  async eliminarRecurso(id_apu: string, id_recurso_apu: string): Promise<Apu | null> {
    const apuActualizado = await this.apuRepository.eliminarRecurso(id_apu, id_recurso_apu);
    
    // El frontend calcula precio_unitario y parcial_partida desde los APUs
    // No es necesario actualizar partidas aquí
    
    return apuActualizado;
  }

  async recalcularApu(id_apu: string): Promise<Apu | null> {
    const apu = await this.obtenerPorId(id_apu);
    if (!apu) return null;
    
    // El frontend calcula precio_unitario y parcial_partida desde los APUs
    // Este método puede ser útil para recalcular parciales de recursos si cambió rendimiento/jornada
    // pero no es necesario actualizar partidas aquí
    
    return apu;
  }

  /**
   * Calcula el parcial de un recurso considerando casos especiales (EQUIPO con "%mo" o "hm")
   * Para subpartidas, usa precio_unitario_subpartida
   */
  private calcularParcialRecurso(recurso: RecursoApu, precio: number, apu: Apu): number {
    // Si es subpartida, el parcial es cantidad × precio_unitario_subpartida
    if (recurso.id_partida_subpartida && recurso.precio_unitario_subpartida !== undefined) {
      return Math.round(recurso.cantidad * recurso.precio_unitario_subpartida * 100) / 100;
    }
    
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

  // Método actualizarPrecioPartida() eliminado
  // El frontend calcula precio_unitario y parcial_partida desde los APUs
  // No es necesario actualizar partidas ni recalcular totales en el backend

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
        
        // El frontend calcula totales desde los APUs
        // No es necesario recopilar títulos afectados
      
      // Recalcular cada APU afectado
      for (const apu of apusAfectados) {
        // Primero calcular parciales de MANO_OBRA (necesarios para EQUIPO con "%mo")
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso === 'MANO_OBRA') {
            let precio = 0;
            
            // PRIORIDAD: Si tiene precio override, usarlo
            if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
              precio = recurso.precio_override;
            } else if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
              precio = preciosMap.get(recurso.id_precio_recurso)!;
            }
            
            if (precio > 0) {
              recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
            }
          }
        }
        
        // Luego calcular parciales de otros recursos (incluyendo EQUIPO que puede depender de MANO_OBRA)
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso !== 'MANO_OBRA') {
            let precio = 0;
            
            // PRIORIDAD: Si tiene precio override, usarlo
            if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
              precio = recurso.precio_override;
            } else if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
              precio = preciosMap.get(recurso.id_precio_recurso)!;
            }
            
            if (precio > 0) {
              recurso.parcial = this.calcularParcialRecurso(recurso, precio, apu);
            }
          }
        }
        
        // Recalcular costo_directo
        apu.calcularCostoDirecto();
        
        // Guardar APU actualizado
        await this.apuRepository.update(apu.id_apu, apu);
        
          // El frontend calcula precio_unitario y parcial_partida desde los APUs
          // No es necesario actualizar partidas ni recalcular totales aquí
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
    
    // Almacenar estados originales para rollback manual (solo APUs, no partidas)
    const estadosAPUs: Array<{ id_apu: string; costo_directo: number }> = [];
    
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
      
      // El frontend calcula totales desde los APUs
      // No es necesario recopilar títulos afectados
      
      // Recalcular cada APU afectado
      for (const apu of apusAfectados) {
        // Primero calcular parciales de MANO_OBRA
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso === 'MANO_OBRA') {
            let precio = 0;
            
            // PRIORIDAD: Si tiene precio override, usarlo
            if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
              precio = recurso.precio_override;
            } else if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
              precio = preciosMap.get(recurso.id_precio_recurso)!;
            }
            
            if (precio > 0) {
              recurso.parcial = recurso.calcularParcial(precio, apu.rendimiento, apu.jornada);
            }
          }
        }
        
        // Luego calcular parciales de otros recursos
        for (const recurso of apu.recursos) {
          if (recurso.tipo_recurso !== 'MANO_OBRA') {
            let precio = 0;
            
            // PRIORIDAD: Si tiene precio override, usarlo
            if (recurso.tiene_precio_override && recurso.precio_override !== undefined) {
              precio = recurso.precio_override;
            } else if (recurso.id_precio_recurso && preciosMap.has(recurso.id_precio_recurso)) {
              precio = preciosMap.get(recurso.id_precio_recurso)!;
            }
            
            if (precio > 0) {
              recurso.parcial = this.calcularParcialRecurso(recurso, precio, apu);
            }
          }
        }
        
        // Recalcular costo_directo
        apu.calcularCostoDirecto();
        
        // Guardar APU actualizado
        await this.apuRepository.update(apu.id_apu, apu);
        
        // El frontend calcula precio_unitario y parcial_partida desde los APUs
        // No es necesario actualizar partidas ni recalcular totales aquí
      }
    } catch (error) {
      // Rollback manual: revertir todos los cambios
      console.error('[ApuService] Error al recalcular APUs, ejecutando rollback manual...', error);
      
      // El frontend calcula precio_unitario y parcial_partida desde los APUs
      // No es necesario rollback de partidas aquí
      
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
      
      // El frontend calcula totales desde los APUs
      // No es necesario rollback de títulos y presupuesto aquí
      
      throw error;
    }
  }

  async eliminar(id_apu: string): Promise<boolean> {
    return await this.apuRepository.delete(id_apu);
  }

  /**
   * Crea partidas subpartidas y sus APUs correspondientes
   * Devuelve un mapeo de temp_id -> id_partida_real
   */
  async crearPartidasSubpartidasYAPUs(input: {
    subpartidas: Array<{
      temp_id: string;
      id_partida_padre: string;
      id_presupuesto: string;
      id_proyecto: string;
      id_titulo: string;
      nivel_partida: number;
      descripcion: string;
      unidad_medida: string;
      precio_unitario: number;
      metrado: number;
      rendimiento: number;
      jornada: number;
      recursos: Array<{
        recurso_id?: string;
        codigo_recurso?: string;
        descripcion: string;
        unidad_medida: string;
        tipo_recurso: string;
        id_precio_recurso?: string;
        precio_usuario: number;
        cuadrilla?: number;
        cantidad: number;
        desperdicio_porcentaje: number;
        cantidad_con_desperdicio: number;
        parcial: number;
        orden: number;
      }>;
    }>;
  }): Promise<Map<string, string>> {
    const mapeoTempIdARealId = new Map<string, string>();
    
    if (!this.partidaService) {
      throw new Error('PartidaService no está disponible');
    }

    if (input.subpartidas.length === 0) {
      return mapeoTempIdARealId;
    }

    // Obtener partida padre para obtener datos necesarios
    const primeraSubpartida = input.subpartidas[0];
    if (!primeraSubpartida?.id_partida_padre) {
      throw new Error('No se proporcionó id_partida_padre');
    }

    const partidaPadre = await this.partidaService.obtenerPorId(primeraSubpartida.id_partida_padre);
    if (!partidaPadre) {
      throw new Error('No se encontró la partida padre');
    }

    // Crear cada subpartida y su APU
    for (const subpartida of input.subpartidas) {
      // Generar ID real para la partida
      const idPartidaReal = await PartidaModel.generateNextId();
      
      // Generar valor temporal para numero_item de subpartida
      const timestamp = Date.now();
      const numeroItemSubpartida = `SP-${timestamp}`;
      
      // Crear la partida subpartida
      await this.partidaService.crear({
        id_partida: idPartidaReal,
        id_presupuesto: subpartida.id_presupuesto,
        id_proyecto: subpartida.id_proyecto,
        id_titulo: subpartida.id_titulo,
        id_partida_padre: subpartida.id_partida_padre,
        nivel_partida: subpartida.nivel_partida,
        numero_item: numeroItemSubpartida,
        descripcion: subpartida.descripcion,
        unidad_medida: subpartida.unidad_medida,
        metrado: subpartida.metrado,
        precio_unitario: subpartida.precio_unitario,
        parcial_partida: subpartida.metrado * subpartida.precio_unitario,
        orden: 0,
        estado: 'Activa',
      });

      // Crear recursos para el APU y mapeo de precios
      const recursosAPU: RecursoApu[] = [];
      const preciosRecursos = new Map<string, number>();
      
      for (const recursoInput of subpartida.recursos) {
        // Generar id_recurso_apu como en la plantilla
        const idRecursoApu = `RAPU${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const recursoApu = new RecursoApu(
          idRecursoApu,
          recursoInput.recurso_id || '',
          recursoInput.codigo_recurso || '',
          recursoInput.descripcion,
          recursoInput.unidad_medida,
          recursoInput.tipo_recurso as any,
          recursoInput.id_precio_recurso || '',
          recursoInput.cantidad,
          recursoInput.desperdicio_porcentaje,
          recursoInput.cantidad_con_desperdicio,
          recursoInput.parcial,
          recursoInput.orden,
          recursoInput.cuadrilla,
          undefined, // id_partida_subpartida (solo para recursos que SON subpartidas)
          undefined  // precio_unitario_subpartida (solo para recursos que SON subpartidas)
        );

        recursosAPU.push(recursoApu);
        
        // Guardar precio en el mapa si hay recurso_id
        if (recursoInput.recurso_id && recursoInput.precio_usuario > 0) {
          preciosRecursos.set(recursoInput.recurso_id, recursoInput.precio_usuario);
        }
      }

      // Crear el APU de la subpartida
      await this.crear({
        id_partida: idPartidaReal,
        id_presupuesto: subpartida.id_presupuesto,
        id_proyecto: subpartida.id_proyecto,
        rendimiento: subpartida.rendimiento,
        jornada: subpartida.jornada,
        recursos: recursosAPU,
        precios_recursos: preciosRecursos,
        usuario_actualizo: 'system',
      });

      // Guardar mapeo
      mapeoTempIdARealId.set(subpartida.temp_id, idPartidaReal);
    }

    return mapeoTempIdARealId;
  }
}


