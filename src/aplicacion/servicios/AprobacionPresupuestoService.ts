import { AprobacionPresupuesto } from '../../dominio/entidades/AprobacionPresupuesto';
import { IAprobacionPresupuestoRepository } from '../../dominio/repositorios/IAprobacionPresupuestoRepository';
import { IPresupuestoRepository } from '../../dominio/repositorios/IPresupuestoRepository';
import { VersionadoPresupuestoService } from './VersionadoPresupuestoService';
import { BaseService } from './BaseService';
import { PresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/PresupuestoSchema';
import { ProyectoService } from './ProyectoService';

export class AprobacionPresupuestoService extends BaseService<AprobacionPresupuesto> {
  private readonly aprobacionRepository: IAprobacionPresupuestoRepository;
  private readonly presupuestoRepository: IPresupuestoRepository;
  private readonly versionadoService: VersionadoPresupuestoService;
  private readonly proyectoService: ProyectoService;

  constructor(
    aprobacionRepository: IAprobacionPresupuestoRepository,
    presupuestoRepository: IPresupuestoRepository,
    versionadoService: VersionadoPresupuestoService,
    proyectoService: ProyectoService
  ) {
    super(aprobacionRepository);
    this.aprobacionRepository = aprobacionRepository;
    this.presupuestoRepository = presupuestoRepository;
    this.versionadoService = versionadoService;
    this.proyectoService = proyectoService;
  }

  async crearAprobacion(data: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto> {
    return await this.aprobacionRepository.crear(data);
  }

  async obtenerPorId(id_aprobacion: string): Promise<AprobacionPresupuesto | null> {
    return await this.aprobacionRepository.obtenerPorId(id_aprobacion);
  }

  async obtenerPorPresupuesto(id_presupuesto: string): Promise<AprobacionPresupuesto[]> {
    return await this.aprobacionRepository.obtenerPorPresupuesto(id_presupuesto);
  }

  async obtenerPorProyecto(id_proyecto: string): Promise<AprobacionPresupuesto[]> {
    return await this.aprobacionRepository.obtenerPorProyecto(id_proyecto);
  }

  async obtenerPendientesPorAprobador(usuario_aprobador_id: string): Promise<AprobacionPresupuesto[]> {
    return await this.aprobacionRepository.obtenerPendientesPorAprobador(usuario_aprobador_id);
  }

  async obtenerPendientes(): Promise<AprobacionPresupuesto[]> {
    return await this.aprobacionRepository.obtenerPendientes();
  }

  /**
   * Obtiene aprobaciones pendientes agrupadas por proyecto y presupuesto
   * Similar a la estructura que usa el frontend
   */
  async obtenerPendientesAgrupadas(): Promise<any[]> {
    const aprobaciones = await this.aprobacionRepository.obtenerPendientes();
    
    // Agrupar por proyecto
    const proyectosMap = new Map<string, any>();
    
    for (const aprobacion of aprobaciones) {
      const proyectoId = aprobacion.id_proyecto;
      
      if (!proyectosMap.has(proyectoId)) {
        // Obtener datos del proyecto
        const proyecto = await this.proyectoService.obtenerPorId(proyectoId);
        if (!proyecto) continue;
        
        proyectosMap.set(proyectoId, {
          proyecto: {
            id_proyecto: proyecto.id_proyecto,
            nombre_proyecto: proyecto.nombre_proyecto,
            cliente: proyecto.cliente,
            empresa: proyecto.empresa,
            estado: proyecto.estado,
            total_proyecto: proyecto.total_proyecto,
            plazo: proyecto.plazo,
            fecha_creacion: proyecto.fecha_creacion
          },
          gruposPresupuestos: []
        });
      }
      
      const proyectoData = proyectosMap.get(proyectoId);
      
      // Buscar si ya existe un grupo para este presupuesto
      let grupoExistente = proyectoData.gruposPresupuestos.find(
        (g: any) => g.id_grupo_version === aprobacion.id_grupo_version
      );
      
      if (!grupoExistente) {
        // Obtener el presupuesto padre
        const presupuestoPadre = await this.presupuestoRepository.obtenerPorIdPresupuesto(aprobacion.id_presupuesto);
        if (!presupuestoPadre) continue;
        
        // Obtener SOLO la versión específica que se seleccionó para aprobar
        // La versión está guardada en aprobacion.version_presupuesto
        if (!aprobacion.version_presupuesto) {
          console.warn(`Aprobación ${aprobacion.id_aprobacion} no tiene version_presupuesto especificada`);
          continue;
        }
        
        const versionSeleccionada = await PresupuestoModel.findOne({
          id_grupo_version: aprobacion.id_grupo_version,
          fase: aprobacion.tipo_aprobacion === 'LICITACION_A_CONTRACTUAL' ? 'LICITACION' : 'CONTRACTUAL',
          version: aprobacion.version_presupuesto
        }).lean();
        
        if (!versionSeleccionada) {
          console.warn(`No se encontró la versión ${aprobacion.version_presupuesto} del grupo ${aprobacion.id_grupo_version}`);
          continue;
        }
        
        grupoExistente = {
          id_aprobacion: aprobacion.id_aprobacion, // Incluir id_aprobacion para poder aprobar/rechazar
          id_grupo_version: aprobacion.id_grupo_version,
          presupuestoPadre: {
            id_presupuesto: presupuestoPadre.id_presupuesto,
            nombre_presupuesto: presupuestoPadre.nombre_presupuesto,
            fecha_creacion: presupuestoPadre.fecha_creacion,
            total_presupuesto: presupuestoPadre.total_presupuesto
          },
          versiones: [{
            id_presupuesto: versionSeleccionada.id_presupuesto,
            nombre_presupuesto: versionSeleccionada.nombre_presupuesto,
            version: versionSeleccionada.version,
            fecha_creacion: versionSeleccionada.fecha_creacion,
            total_presupuesto: versionSeleccionada.total_presupuesto,
            descripcion_version: versionSeleccionada.descripcion_version
          }], // Solo la versión seleccionada
          tipoAprobacion: aprobacion.tipo_aprobacion
        };
        
        proyectoData.gruposPresupuestos.push(grupoExistente);
      }
    }
    
    return Array.from(proyectosMap.values());
  }

  async actualizarAprobacion(id_aprobacion: string, datos: Partial<AprobacionPresupuesto>): Promise<AprobacionPresupuesto | null> {
    return await this.aprobacionRepository.actualizar(id_aprobacion, datos);
  }

  async aprobar(id_aprobacion: string, usuario_aprobador_id: string, comentario?: string): Promise<AprobacionPresupuesto> {
    const aprobacion = await this.aprobacionRepository.obtenerPorId(id_aprobacion);
    
    if (!aprobacion) {
      throw new Error('Aprobación no encontrada');
    }

    if (aprobacion.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar solicitudes pendientes');
    }

    // Obtener el presupuesto padre (para limpiar estado_aprobacion después)
    const presupuestoPadre = await this.presupuestoRepository.obtenerPorIdPresupuesto(aprobacion.id_presupuesto);
    if (!presupuestoPadre) {
      throw new Error('Presupuesto padre no encontrado');
    }

    // Si es aprobación de Licitación → Contractual, crear el presupuesto contractual
    if (aprobacion.tipo_aprobacion === 'LICITACION_A_CONTRACTUAL') {
      // Buscar SOLO la versión específica de licitación que se seleccionó
      if (!aprobacion.version_presupuesto) {
        throw new Error('La aprobación no tiene version_presupuesto especificada');
      }

      const versionLicitacion = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'LICITACION',
        version: aprobacion.version_presupuesto
      }).lean();

      if (!versionLicitacion) {
        throw new Error(`No se encontró la versión ${aprobacion.version_presupuesto} de licitación a aprobar`);
      }

      if (!versionLicitacion.id_presupuesto) {
        throw new Error('La versión de licitación no tiene id_presupuesto');
      }

      // Crear el presupuesto contractual clonando SOLO la versión seleccionada
      await this.versionadoService.crearPresupuestoContractualDesdeLicitacion(
        versionLicitacion.id_presupuesto,
        aprobacion.comentario_solicitud || undefined
      );
    }
    // TODO: Agregar lógica para CONTRACTUAL_A_META cuando se implemente

    // Actualizar la aprobación
    const aprobacionActualizada = await this.aprobacionRepository.actualizar(id_aprobacion, {
      estado: 'APROBADO',
      usuario_aprobador_id,
      fecha_aprobacion: new Date().toISOString(),
      comentario_aprobacion: comentario
    });

    if (!aprobacionActualizada) {
      throw new Error('Error al actualizar la aprobación');
    }

    // Limpiar estado_aprobacion del presupuesto padre
    await this.presupuestoRepository.update(aprobacion.id_presupuesto, {
      estado_aprobacion: null,
      estado: 'aprobado'
    });

    return aprobacionActualizada;
  }

  async rechazar(id_aprobacion: string, usuario_aprobador_id: string, comentario: string): Promise<AprobacionPresupuesto> {
    const aprobacion = await this.aprobacionRepository.obtenerPorId(id_aprobacion);
    
    if (!aprobacion) {
      throw new Error('Aprobación no encontrada');
    }

    if (aprobacion.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden rechazar solicitudes pendientes');
    }

    // Actualizar la aprobación
    const aprobacionActualizada = await this.aprobacionRepository.actualizar(id_aprobacion, {
      estado: 'RECHAZADO',
      usuario_aprobador_id,
      fecha_rechazo: new Date().toISOString(),
      comentario_rechazo: comentario
    });

    if (!aprobacionActualizada) {
      throw new Error('Error al actualizar la aprobación');
    }

    // Limpiar estado_aprobacion del presupuesto padre
    const presupuesto = await this.presupuestoRepository.obtenerPorIdPresupuesto(aprobacion.id_presupuesto);
    if (presupuesto) {
      await this.presupuestoRepository.update(aprobacion.id_presupuesto, {
        estado_aprobacion: null,
        estado: 'rechazado'
      });
    }

    return aprobacionActualizada;
  }
}

