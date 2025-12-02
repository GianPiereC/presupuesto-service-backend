import { TituloService } from './TituloService';
import { PresupuestoService } from './PresupuestoService';
import mongoose from 'mongoose';

/**
 * Servicio para recalcular totales de títulos y presupuesto
 * Centraliza la lógica de recálculo para ser usado por múltiples servicios
 */
export class RecalculoTotalesService {
  constructor(
    private readonly tituloService: TituloService,
    private readonly presupuestoService: PresupuestoService
  ) {}

  /**
   * Calcula el total de un título usando agregación MongoDB (eficiente)
   * Suma: parciales de partidas directas + totales de títulos hijos
   */
  async calcularTotalTitulo(id_titulo: string): Promise<number> {
    try {
      const PartidaModel = (await import('../../infraestructura/persistencia/mongo/schemas/PartidaSchema')).PartidaModel;
      const TituloModel = (await import('../../infraestructura/persistencia/mongo/schemas/TituloSchema')).TituloModel;
      
      // Suma de parciales de partidas directas (sin padre)
      const sumaPartidas = await PartidaModel.aggregate([
        { $match: { id_titulo, id_partida_padre: null } },
        { $group: { _id: null, total: { $sum: '$parcial_partida' } } }
      ]);
      
      // Suma de totales de títulos hijos
      const sumaTitulosHijos = await TituloModel.aggregate([
        { $match: { id_titulo_padre: id_titulo } },
        { $group: { _id: null, total: { $sum: '$total_parcial' } } }
      ]);
      
      const totalPartidas = sumaPartidas[0]?.total || 0;
      const totalHijos = sumaTitulosHijos[0]?.total || 0;
      
      // Redondear a 2 decimales
      return Math.round((totalPartidas + totalHijos) * 100) / 100;
    } catch (error) {
      console.error('[RecalculoTotalesService] Error al calcular total de título:', error);
      return 0;
    }
  }

  /**
   * Recalcula totales de títulos de forma incremental (solo cadena ascendente)
   * Propaga hacia arriba recursivamente hasta llegar a la raíz
   * Usa transacciones para asegurar consistencia (rollback si falla)
   */
  async recalcularTotalesAscendentes(
    id_titulo: string,
    id_presupuesto: string
  ): Promise<void> {
    try {
      // Intentar usar transacciones primero
      await this.recalcularTotalesAscendentesConTransaccion(id_titulo, id_presupuesto);
    } catch (error: any) {
      // Si el error es porque no hay replica set, usar método sin transacciones
      if (error.message?.includes('Transaction numbers are only allowed on a replica set') ||
          error.message?.includes('not a replica set') ||
          error.code === 20) {
        await this.recalcularTotalesAscendentesSinTransaccion(id_titulo, id_presupuesto);
      } else {
        console.error('[RecalculoTotalesService] Error al recalcular totales ascendentes:', error);
        throw error;
      }
    }
  }

  /**
   * Recalcula totales con transacciones de MongoDB
   */
  private async recalcularTotalesAscendentesConTransaccion(
    id_titulo: string,
    id_presupuesto: string
  ): Promise<void> {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        await this.recalcularTotalesAscendentesRecursivo(id_titulo, id_presupuesto, session);
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Recalcula totales sin transacciones (fallback)
   */
  private async recalcularTotalesAscendentesSinTransaccion(
    id_titulo: string,
    id_presupuesto: string
  ): Promise<void> {
    // Almacenar estados originales para rollback manual
    const estadosOriginales: Array<{ id_titulo: string; total_parcial: number }> = [];
    const estadosPresupuesto: Array<{ id_presupuesto: string; parcial_presupuesto: number }> = [];
    
    try {
      await this.recalcularTotalesAscendentesRecursivo(id_titulo, id_presupuesto, null, estadosOriginales, estadosPresupuesto);
    } catch (error) {
      // Rollback manual: revertir todos los cambios
      console.error('[RecalculoTotalesService] Error al recalcular, ejecutando rollback manual...', error);
      for (let i = estadosOriginales.length - 1; i >= 0; i--) {
        const estado = estadosOriginales[i];
        if (estado) {
          await this.tituloService.actualizar(estado.id_titulo, { total_parcial: estado.total_parcial }, true); // skipRecalculo = true
        }
      }
      for (let i = estadosPresupuesto.length - 1; i >= 0; i--) {
        const estado = estadosPresupuesto[i];
        if (estado) {
          // Obtener el presupuesto para recalcular total_presupuesto en el rollback
          const presupuesto = await this.presupuestoService.obtenerPorId(estado.id_presupuesto);
          if (presupuesto) {
            const porcentajeIGV = presupuesto.porcentaje_igv || 0;
            const porcentajeUtilidad = presupuesto.porcentaje_utilidad || 0;
            const montoIGV = Math.round((estado.parcial_presupuesto * porcentajeIGV / 100) * 100) / 100;
            const montoUtilidad = Math.round((estado.parcial_presupuesto * porcentajeUtilidad / 100) * 100) / 100;
            const totalPresupuesto = Math.round((estado.parcial_presupuesto + montoIGV + montoUtilidad) * 100) / 100;
            
            await this.presupuestoService.actualizar(estado.id_presupuesto, {
              parcial_presupuesto: estado.parcial_presupuesto,
              monto_igv: montoIGV,
              monto_utilidad: montoUtilidad,
              total_presupuesto: totalPresupuesto
            });
          } else {
            await this.presupuestoService.actualizar(estado.id_presupuesto, { parcial_presupuesto: estado.parcial_presupuesto });
          }
        }
      }
      throw error;
    }
  }

  /**
   * Lógica recursiva de recálculo (usada por ambos métodos)
   * Protegido contra recursión infinita con Set de títulos visitados
   */
  private async recalcularTotalesAscendentesRecursivo(
    id_titulo: string,
    id_presupuesto: string,
    session: mongoose.ClientSession | null = null,
    estadosOriginales: Array<{ id_titulo: string; total_parcial: number }> = [],
    estadosPresupuesto: Array<{ id_presupuesto: string; parcial_presupuesto: number }> = [],
    titulosVisitados: Set<string> = new Set()
  ): Promise<void> {
    // Protección contra recursión infinita
    if (titulosVisitados.has(id_titulo)) {
      throw new Error(`Ciclo detectado en jerarquía de títulos: ${id_titulo} ya fue visitado`);
    }
    
    titulosVisitados.add(id_titulo);
    
    // Obtener título actual para guardar estado original (solo si no hay transacción)
    const tituloActual = await this.tituloService.obtenerPorId(id_titulo);
    if (!tituloActual) return;
    
    if (!session && estadosOriginales) {
      estadosOriginales.push({ id_titulo, total_parcial: tituloActual.total_parcial });
    }
    
    // Calcular total del título usando agregación MongoDB (rápido)
    const nuevoTotal = await this.calcularTotalTitulo(id_titulo);
    
    // Actualizar el título directamente sin disparar otro recálculo
    // skipRecalculo = true para evitar bucle infinito
    await this.tituloService.actualizar(id_titulo, { 
      total_parcial: nuevoTotal 
    }, true); // skipRecalculo = true
    
    // Si tiene padre, propagar hacia arriba recursivamente
    if (tituloActual.id_titulo_padre) {
      await this.recalcularTotalesAscendentesRecursivo(
        tituloActual.id_titulo_padre, 
        id_presupuesto,
        session,
        estadosOriginales,
        estadosPresupuesto,
        titulosVisitados
      );
    } else {
      // Es raíz, actualizar parcial_presupuesto
      if (!session && estadosPresupuesto) {
        const presupuestoActual = await this.presupuestoService.obtenerPorId(id_presupuesto);
        if (presupuestoActual) {
          estadosPresupuesto.push({ 
            id_presupuesto, 
            parcial_presupuesto: presupuestoActual.parcial_presupuesto 
          });
        }
      }
      await this.actualizarParcialPresupuesto(id_presupuesto);
    }
    
    // Remover del set al salir (para permitir revisitar en diferentes ramas)
    titulosVisitados.delete(id_titulo);
  }

  /**
   * Actualiza el parcial_presupuesto sumando todos los títulos raíz (sin padre)
   */
  private async actualizarParcialPresupuesto(id_presupuesto: string): Promise<void> {
    try {
      const TituloModel = (await import('../../infraestructura/persistencia/mongo/schemas/TituloSchema')).TituloModel;
      
      // Sumar todos los títulos raíz (sin padre)
      const sumaTitulosRaiz = await TituloModel.aggregate([
        { $match: { id_presupuesto, id_titulo_padre: null } },
        { $group: { _id: null, total: { $sum: '$total_parcial' } } }
      ]);
      
      const parcialPresupuesto = Math.round((sumaTitulosRaiz[0]?.total || 0) * 100) / 100;
      
      // Obtener el presupuesto para calcular total_presupuesto
      const presupuesto = await this.presupuestoService.obtenerPorId(id_presupuesto);
      if (!presupuesto) {
        throw new Error('Presupuesto no encontrado');
      }
      
      // Calcular total_presupuesto: parcial + IGV + utilidad
      const porcentajeIGV = presupuesto.porcentaje_igv || 0;
      const porcentajeUtilidad = presupuesto.porcentaje_utilidad || 0;
      
      const montoIGV = Math.round((parcialPresupuesto * porcentajeIGV / 100) * 100) / 100;
      const montoUtilidad = Math.round((parcialPresupuesto * porcentajeUtilidad / 100) * 100) / 100;
      const totalPresupuesto = Math.round((parcialPresupuesto + montoIGV + montoUtilidad) * 100) / 100;
      
      await this.presupuestoService.actualizar(id_presupuesto, {
        parcial_presupuesto: parcialPresupuesto,
        monto_igv: montoIGV,
        monto_utilidad: montoUtilidad,
        total_presupuesto: totalPresupuesto
      });
    } catch (error) {
      console.error('[RecalculoTotalesService] Error al actualizar parcial presupuesto:', error);
      throw error;
    }
  }
}

