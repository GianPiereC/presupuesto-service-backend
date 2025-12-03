import { Proyecto } from '../../dominio/entidades/Proyecto';
import { IProyectoRepository } from '../../dominio/repositorios/IProyectoRepository';
import { IPresupuestoRepository } from '../../dominio/repositorios/IPresupuestoRepository';
import { BaseService } from './BaseService';
import { PaginationResult, PaginationFilterInput } from '../../dominio/valueObjects/Pagination';

export class ProyectoService extends BaseService<Proyecto> {
  private readonly proyectoRepository: IProyectoRepository;
  private readonly presupuestoRepository: IPresupuestoRepository;

  constructor(
    proyectoRepository: IProyectoRepository,
    presupuestoRepository: IPresupuestoRepository
  ) {
    super(proyectoRepository);
    this.proyectoRepository = proyectoRepository;
    this.presupuestoRepository = presupuestoRepository;
  }

  async obtenerTodos(): Promise<Proyecto[]> {
    return await this.proyectoRepository.list();
  }

  async obtenerPorId(id_proyecto: string): Promise<Proyecto | null> {
    return await this.proyectoRepository.obtenerPorIdProyecto(id_proyecto);
  }

  async obtenerPorUsuario(id_usuario: string): Promise<Proyecto[]> {
    return await this.proyectoRepository.obtenerPorUsuario(id_usuario);
  }

  async crear(data: Partial<Proyecto>): Promise<Proyecto> {
    return await this.proyectoRepository.create(data);
  }

  async actualizar(id_proyecto: string, data: Partial<Proyecto>): Promise<Proyecto | null> {
    return await this.proyectoRepository.update(id_proyecto, data);
  }

  async eliminar(id_proyecto: string): Promise<Proyecto | null> {
    try {
      // Obtener los presupuestos relacionados
      const presupuestos = await this.presupuestoRepository.obtenerPorProyecto(id_proyecto);

      // Eliminar cada presupuesto
      for (const presupuesto of presupuestos) {
        await this.presupuestoRepository.delete(presupuesto.id_presupuesto);
      }

      // Finalmente eliminar el proyecto
      const deleted = await this.proyectoRepository.delete(id_proyecto);
      if (deleted) {
        return await this.proyectoRepository.obtenerPorIdProyecto(id_proyecto);
      }
      return null;
    } catch (error: any) {
      console.error('Error al eliminar proyecto:', error);
      throw new Error(error.message || 'Error al eliminar el proyecto y sus recursos asociados');
    }
  }

  async calcularTotalProyecto(id_proyecto: string): Promise<Proyecto | null> {
    try {
      // Este método será reimplementado con la nueva estructura de DB
      // Por ahora, solo actualiza la fecha sin calcular
      const fechaActual = new Date().toISOString();
      return await this.proyectoRepository.update(id_proyecto, {
        fecha_ultimo_calculo: fechaActual
      });
    } catch (error: any) {
      console.error('Error al calcular total del proyecto:', error);
      throw new Error(error.message || 'Error al calcular el total del proyecto');
    }
  }

  async obtenerProyectosConPresupuestos(): Promise<any[]> {
    return await this.proyectoRepository.obtenerProyectosConPresupuestos();
  }

  /**
   * Lista proyectos con paginación, filtros y búsqueda
   */
  async listarProyectosPaginated(input: PaginationFilterInput): Promise<PaginationResult<Proyecto>> {
    const { filters, search, ...pagination } = input;
    
    // Si hay búsqueda, usar el método search
    if (search && search.query) {
      return await this.search(search, pagination);
    }
    
    // Si hay filtros, usar listWithFilters
    if (filters && Object.keys(filters).length > 0) {
      return await this.listWithFilters(filters, pagination);
    }
    
    // Si solo hay paginación, usar listPaginated
    return await this.listPaginated(pagination || {});
  }
}

