import { AprobacionPresupuesto } from '../../dominio/entidades/AprobacionPresupuesto';
import { IAprobacionPresupuestoRepository } from '../../dominio/repositorios/IAprobacionPresupuestoRepository';
import { IPresupuestoRepository } from '../../dominio/repositorios/IPresupuestoRepository';
import { VersionadoPresupuestoService } from './VersionadoPresupuestoService';
import { BaseService } from './BaseService';
import { PresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/PresupuestoSchema';
import { ProyectoService } from './ProyectoService';
import { IBaseRepository } from '../../dominio/repositorios/IBaseRepository';

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
    super({} as IBaseRepository<AprobacionPresupuesto>);
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
        
        // Determinar la fase según el tipo de aprobación
        let faseBusqueda = 'LICITACION';
        if (aprobacion.tipo_aprobacion === 'CONTRACTUAL_A_META' || 
            aprobacion.tipo_aprobacion === 'NUEVA_VERSION_META' ||
            aprobacion.tipo_aprobacion === 'OFICIALIZAR_META') {
          faseBusqueda = 'META';
        } else if (aprobacion.tipo_aprobacion === 'LICITACION_A_CONTRACTUAL') {
          faseBusqueda = 'LICITACION';
        }
        
        const versionSeleccionada = await PresupuestoModel.findOne({
          id_grupo_version: aprobacion.id_grupo_version,
          fase: faseBusqueda,
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
    
    // Si es aprobación de META (versión borrador → aprobada)
    if (aprobacion.tipo_aprobacion === 'CONTRACTUAL_A_META' && aprobacion.version_presupuesto) {
      // Buscar la versión META borrador que se está aprobando
      const versionMeta = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'META',
        version: aprobacion.version_presupuesto
      }).lean();

      if (versionMeta && versionMeta.estado && ['borrador', 'en_revision'].includes(versionMeta.estado)) {
        // Buscar la última versión aprobada de META para calcular el siguiente número
        const ultimaVersionAprobada = await PresupuestoModel.findOne({
          id_grupo_version: aprobacion.id_grupo_version,
          fase: 'META',
          estado: { $in: ['aprobado', 'vigente'] }
        })
          .sort({ version: -1 })
          .lean();

        const nuevoNumeroVersion = ultimaVersionAprobada && ultimaVersionAprobada.version
          ? ultimaVersionAprobada.version + 1
          : 1;

        // Actualizar la versión: cambiar estado y renumerar
        await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
          estado: 'aprobado',
          version: nuevoNumeroVersion,
          estado_aprobacion: undefined
        });
      }
    }

    // Si es aprobación de nueva versión META (solo cambiar estado y renumerar, NO clonar)
    if (aprobacion.tipo_aprobacion === 'NUEVA_VERSION_META' && aprobacion.version_presupuesto) {
      // Buscar la versión META que se está aprobando (debe estar en en_revision)
      const versionMeta = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'META',
        version: aprobacion.version_presupuesto,
        estado: 'en_revision'
      }).lean();

      if (!versionMeta || !versionMeta.id_presupuesto) {
        throw new Error(`No se encontró la versión META ${aprobacion.version_presupuesto} en estado en_revision`);
      }

      // Buscar la última versión aprobada de META para calcular el siguiente número
      const ultimaVersionAprobada = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'META',
        estado: { $in: ['aprobado', 'vigente'] }
      })
        .sort({ version: -1 })
        .lean();

      const nuevoNumeroVersion = ultimaVersionAprobada && ultimaVersionAprobada.version
        ? ultimaVersionAprobada.version + 1
        : 1;

      // Actualizar la MISMA versión: cambiar estado a aprobado y asignar nuevo número de versión
      await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
        estado: 'aprobado',
        version: nuevoNumeroVersion,
        estado_aprobacion: undefined
      });

      console.log(`[AprobacionPresupuestoService] Versión META aprobada: ${versionMeta.id_presupuesto} (V${aprobacion.version_presupuesto} → V${nuevoNumeroVersion})`);
    }

    // Si es aprobación de oficialización META (poner en vigencia)
    if (aprobacion.tipo_aprobacion === 'OFICIALIZAR_META' && aprobacion.version_presupuesto) {
      // Buscar la versión META que se está oficializando (debe estar en en_revision)
      const versionMeta = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'META',
        version: aprobacion.version_presupuesto,
        estado: 'en_revision'
      }).lean();

      if (!versionMeta || !versionMeta.id_presupuesto) {
        throw new Error(`No se encontró la versión META ${aprobacion.version_presupuesto} en estado en_revision para oficializar`);
      }

      // Buscar si hay alguna versión vigente actualmente y cambiarla a aprobado
      const versionVigenteActual = await PresupuestoModel.findOne({
        id_grupo_version: aprobacion.id_grupo_version,
        fase: 'META',
        estado: 'vigente'
      }).lean();

      if (versionVigenteActual && versionVigenteActual.id_presupuesto) {
        await this.presupuestoRepository.update(versionVigenteActual.id_presupuesto, {
          estado: 'aprobado'
        });
        console.log(`[AprobacionPresupuestoService] Versión META vigente anterior actualizada a aprobado: ${versionVigenteActual.id_presupuesto} (V${versionVigenteActual.version})`);
      }

      // Actualizar la versión a estado vigente
      await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
        estado: 'vigente',
        estado_aprobacion: undefined
      });

      // Actualizar el presupuesto padre con la referencia a la versión vigente
      await this.presupuestoRepository.update(aprobacion.id_presupuesto, {
        id_presupuesto_meta_vigente: versionMeta.id_presupuesto,
        version_meta_vigente: versionMeta.version
      });

      console.log(`[AprobacionPresupuestoService] Versión META oficializada (puesta en vigencia): ${versionMeta.id_presupuesto} (V${aprobacion.version_presupuesto})`);
    }

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

    // Limpiar estado_aprobacion del presupuesto padre (solo si no es aprobación de versión META)
    if (aprobacion.tipo_aprobacion !== 'CONTRACTUAL_A_META' && 
        aprobacion.tipo_aprobacion !== 'NUEVA_VERSION_META' || 
        !aprobacion.version_presupuesto) {
      await this.presupuestoRepository.update(aprobacion.id_presupuesto, {
        estado_aprobacion: undefined,
        estado: 'aprobado'
      });
    }

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

    // Limpiar estado_aprobacion del presupuesto padre o versión
    const presupuesto = await this.presupuestoRepository.obtenerPorIdPresupuesto(aprobacion.id_presupuesto);
    if (presupuesto) {
      // Si es aprobación de nueva versión META, actualizar SOLO la versión específica rechazada
      if (aprobacion.tipo_aprobacion === 'NUEVA_VERSION_META') {
        // Buscar la versión específica que está en revisión usando el id_aprobacion guardado
        // Esto garantiza encontrar la versión correcta y NO afectar las versiones aprobadas
        const versionMeta = await PresupuestoModel.findOne({
          id_grupo_version: aprobacion.id_grupo_version,
          fase: 'META',
          estado: 'en_revision',
          'estado_aprobacion.id_aprobacion': id_aprobacion
        }).lean();

        if (versionMeta && versionMeta.id_presupuesto) {
          // Cambiar la versión a estado rechazado (no borrador, para que aparezca como rechazada)
          // IMPORTANTE: Solo actualizar esta versión específica, NO el padre ni otras versiones
          await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
            estado: 'rechazado',
            estado_aprobacion: undefined
          });
          console.log(`[AprobacionPresupuestoService] Versión META rechazada: ${versionMeta.id_presupuesto} (V${versionMeta.version}) - estado: en_revision → rechazado`);
        } else {
          console.warn(`[AprobacionPresupuestoService] No se encontró la versión META en estado en_revision con id_aprobacion ${id_aprobacion} para rechazar`);
        }
        // NO actualizar el presupuesto padre para NUEVA_VERSION_META, ya que puede haber otras versiones aprobadas
      } else if (aprobacion.tipo_aprobacion === 'OFICIALIZAR_META') {
        // Buscar la versión específica que está en revisión usando el id_aprobacion guardado
        const versionMeta = await PresupuestoModel.findOne({
          id_grupo_version: aprobacion.id_grupo_version,
          fase: 'META',
          estado: 'en_revision',
          'estado_aprobacion.id_aprobacion': id_aprobacion
        }).lean();

        if (versionMeta && versionMeta.id_presupuesto) {
          // Cambiar la versión a estado aprobado (volver al estado anterior antes de enviar a oficialización)
          await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
            estado: 'aprobado',
            estado_aprobacion: undefined
          });
          console.log(`[AprobacionPresupuestoService] Versión META rechazada para oficialización: ${versionMeta.id_presupuesto} (V${versionMeta.version}) - estado: en_revision → aprobado`);
        } else {
          console.warn(`[AprobacionPresupuestoService] No se encontró la versión META en estado en_revision con id_aprobacion ${id_aprobacion} para rechazar oficialización`);
        }
        // NO actualizar el presupuesto padre para OFICIALIZAR_META cuando se rechaza
      } else if (aprobacion.tipo_aprobacion === 'CONTRACTUAL_A_META') {
        // Para CONTRACTUAL_A_META, buscar la versión META específica que se está rechazando
        if (aprobacion.version_presupuesto) {
          const versionMeta = await PresupuestoModel.findOne({
            id_grupo_version: aprobacion.id_grupo_version,
            fase: 'META',
            version: aprobacion.version_presupuesto
          }).lean();

          if (versionMeta && versionMeta.id_presupuesto) {
            // Actualizar solo la versión específica rechazada
            await this.presupuestoRepository.update(versionMeta.id_presupuesto, {
              estado: 'rechazado',
              estado_aprobacion: undefined
            });
            console.log(`[AprobacionPresupuestoService] Versión META rechazada (CONTRACTUAL_A_META): ${versionMeta.id_presupuesto} (V${aprobacion.version_presupuesto})`);
          }
        }
        // NO actualizar el presupuesto padre para CONTRACTUAL_A_META si hay version_presupuesto
      } else {
        // Para otros tipos (LICITACION_A_CONTRACTUAL), actualizar el padre
        await this.presupuestoRepository.update(aprobacion.id_presupuesto, {
          estado_aprobacion: undefined,
          estado: 'rechazado'
        });
      }
    }

    return aprobacionActualizada;
  }
}

