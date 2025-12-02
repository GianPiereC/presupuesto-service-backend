import { Presupuesto } from '../../dominio/entidades/Presupuesto';
import { IPresupuestoRepository } from '../../dominio/repositorios/IPresupuestoRepository';
import { BaseService } from './BaseService';

export class PresupuestoService extends BaseService<Presupuesto> {
  private readonly presupuestoRepository: IPresupuestoRepository;

  constructor(presupuestoRepository: IPresupuestoRepository) {
    super(presupuestoRepository);
    this.presupuestoRepository = presupuestoRepository;
  }

  async obtenerTodos(): Promise<Presupuesto[]> {
    return await this.presupuestoRepository.list();
  }

  async obtenerPorId(id_presupuesto: string): Promise<Presupuesto | null> {
    return await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto);
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<Presupuesto[]> {
    return await this.presupuestoRepository.obtenerPorProyecto(id_proyecto);
  }

  async obtenerPorGrupoVersion(id_grupo_version: string): Promise<Presupuesto[]> {
    return await this.presupuestoRepository.obtenerPorGrupoVersion(id_grupo_version);
  }

  async eliminarGrupoCompleto(id_grupo_version: string): Promise<boolean> {
    return await this.presupuestoRepository.eliminarGrupoCompleto(id_grupo_version);
  }

  async crear(data: Partial<Presupuesto>): Promise<Presupuesto> {
    return await this.presupuestoRepository.create(data);
  }

  async actualizar(id_presupuesto: string, data: Partial<Presupuesto>): Promise<Presupuesto | null> {
    // Si se actualiza parcial_presupuesto, recalcular total_presupuesto automáticamente
    if (data.parcial_presupuesto !== undefined) {
      const presupuesto = await this.obtenerPorId(id_presupuesto);
      if (presupuesto) {
        const porcentajeIGV = presupuesto.porcentaje_igv || 0;
        const porcentajeUtilidad = presupuesto.porcentaje_utilidad || 0;
        
        const montoIGV = Math.round((data.parcial_presupuesto * porcentajeIGV / 100) * 100) / 100;
        const montoUtilidad = Math.round((data.parcial_presupuesto * porcentajeUtilidad / 100) * 100) / 100;
        const totalPresupuesto = Math.round((data.parcial_presupuesto + montoIGV + montoUtilidad) * 100) / 100;
        
        // Agregar los cálculos a los datos a actualizar
        data.monto_igv = montoIGV;
        data.monto_utilidad = montoUtilidad;
        data.total_presupuesto = totalPresupuesto;
      }
    }
    // Si se actualizan los porcentajes pero no el parcial, recalcular si hay parcial existente
    else if ((data.porcentaje_igv !== undefined || data.porcentaje_utilidad !== undefined)) {
      const presupuesto = await this.obtenerPorId(id_presupuesto);
      if (presupuesto && presupuesto.parcial_presupuesto > 0) {
        const porcentajeIGV = data.porcentaje_igv ?? presupuesto.porcentaje_igv ?? 0;
        const porcentajeUtilidad = data.porcentaje_utilidad ?? presupuesto.porcentaje_utilidad ?? 0;
        
        const montoIGV = Math.round((presupuesto.parcial_presupuesto * porcentajeIGV / 100) * 100) / 100;
        const montoUtilidad = Math.round((presupuesto.parcial_presupuesto * porcentajeUtilidad / 100) * 100) / 100;
        const totalPresupuesto = Math.round((presupuesto.parcial_presupuesto + montoIGV + montoUtilidad) * 100) / 100;
        
        data.monto_igv = montoIGV;
        data.monto_utilidad = montoUtilidad;
        data.total_presupuesto = totalPresupuesto;
      }
    }
    
    return await this.presupuestoRepository.update(id_presupuesto, data);
  }

  async eliminar(id_presupuesto: string): Promise<Presupuesto | null> {
    try {
      // Eliminar el presupuesto
      const deleted = await this.presupuestoRepository.delete(id_presupuesto);
      if (deleted) {
        return await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto);
      }
      return null;
    } catch (error: any) {
      console.error('Error al eliminar presupuesto:', error);
      throw new Error(error.message || 'Error al eliminar el presupuesto');
    }
  }
}

