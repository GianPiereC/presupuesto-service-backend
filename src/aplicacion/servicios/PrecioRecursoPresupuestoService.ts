import { PrecioRecursoPresupuesto } from '../../dominio/entidades/PrecioRecursoPresupuesto';
import { IPrecioRecursoPresupuestoRepository } from '../../dominio/repositorios/IPrecioRecursoPresupuestoRepository';
import { BaseService } from './BaseService';
import { PrecioRecursoPresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/PrecioRecursoPresupuestoSchema';
import { ApuService } from './ApuService';

export class PrecioRecursoPresupuestoService extends BaseService<PrecioRecursoPresupuesto> {
  private readonly precioRecursoPresupuestoRepository: IPrecioRecursoPresupuestoRepository;
  private readonly apuService: ApuService | undefined;

  constructor(
    precioRecursoPresupuestoRepository: IPrecioRecursoPresupuestoRepository,
    apuService?: ApuService
  ) {
    super(precioRecursoPresupuestoRepository);
    this.precioRecursoPresupuestoRepository = precioRecursoPresupuestoRepository;
    this.apuService = apuService;
  }

  async obtenerTodos(): Promise<PrecioRecursoPresupuesto[]> {
    return await this.precioRecursoPresupuestoRepository.list();
  }

  async obtenerPorId(id_precio_recurso: string): Promise<PrecioRecursoPresupuesto | null> {
    return await this.precioRecursoPresupuestoRepository.obtenerPorIdPrecioRecurso(id_precio_recurso);
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<PrecioRecursoPresupuesto[]> {
    return await this.precioRecursoPresupuestoRepository.obtenerPorPresupuesto(id_presupuesto);
  }

  async obtenerPorPresupuestoYRecurso(
    id_presupuesto: string,
    recurso_id: string
  ): Promise<PrecioRecursoPresupuesto | null> {
    return await this.precioRecursoPresupuestoRepository.obtenerPorPresupuestoYRecurso(
      id_presupuesto,
      recurso_id
    );
  }

  async crear(data: Partial<PrecioRecursoPresupuesto>): Promise<PrecioRecursoPresupuesto> {
    const idPrecioRecurso = data.id_precio_recurso || await PrecioRecursoPresupuestoModel.generateNextId();
    const fechaActualizacion = data.fecha_actualizacion || new Date().toISOString();
    
    const datosLimpios: any = {
      id_precio_recurso: idPrecioRecurso,
      id_presupuesto: data.id_presupuesto,
      recurso_id: data.recurso_id,
      codigo_recurso: data.codigo_recurso,
      descripcion: data.descripcion,
      unidad: data.unidad,
      tipo_recurso: data.tipo_recurso,
      precio: data.precio,
      fecha_actualizacion: fechaActualizacion,
      usuario_actualizo: data.usuario_actualizo
    };
    
    return await this.precioRecursoPresupuestoRepository.create(datosLimpios);
  }

  async actualizar(
    id_precio_recurso: string,
    data: Partial<PrecioRecursoPresupuesto>
  ): Promise<PrecioRecursoPresupuesto | null> {
    if (data.precio !== undefined) {
      data.fecha_actualizacion = new Date().toISOString();
    }
    return await this.precioRecursoPresupuestoRepository.update(id_precio_recurso, data);
  }

  async actualizarPrecio(
    id_precio_recurso: string,
    nuevo_precio: number,
    usuario_id: string
  ): Promise<PrecioRecursoPresupuesto | null> {
    const precio = await this.obtenerPorId(id_precio_recurso);
    if (!precio) {
      return null;
    }
    
    const precioAnterior = precio.precio;
    precio.actualizarPrecio(nuevo_precio, usuario_id);
    
    const precioActualizado = await this.precioRecursoPresupuestoRepository.update(id_precio_recurso, precio);
    
    // Si el precio cambió y hay ApuService disponible, recalcular todos los APUs que usan este recurso
    if (precioActualizado && this.apuService && Math.abs(precioAnterior - nuevo_precio) > 0.01) {
      try {
        await this.apuService.recalcularApusConRecurso(
          precio.id_presupuesto,
          precio.recurso_id
        );
      } catch (error) {
        console.error('[PrecioRecursoPresupuestoService] Error al recalcular APUs:', error);
        // No lanzar error para no interrumpir la actualización del precio
      }
    }
    
    return precioActualizado;
  }

  async eliminar(id_precio_recurso: string): Promise<boolean> {
    return await this.precioRecursoPresupuestoRepository.delete(id_precio_recurso);
  }
}


