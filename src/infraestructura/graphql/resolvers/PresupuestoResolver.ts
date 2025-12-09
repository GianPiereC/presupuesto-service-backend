import { IResolvers } from '@graphql-tools/utils';
import { PresupuestoService } from '../../../aplicacion/servicios/PresupuestoService';
import { VersionadoPresupuestoService } from '../../../aplicacion/servicios/VersionadoPresupuestoService';
import { EstructuraPresupuestoService } from '../../../aplicacion/servicios/EstructuraPresupuestoService';
import { PrecioRecursoPresupuestoService } from '../../../aplicacion/servicios/PrecioRecursoPresupuestoService';
import { Presupuesto } from '../../../dominio/entidades/Presupuesto';
import { Titulo } from '../../../dominio/entidades/Titulo';
import { Partida } from '../../../dominio/entidades/Partida';
import { Apu } from '../../../dominio/entidades/Apu';
import { ErrorHandler } from './ErrorHandler';
import { PresupuestoModel } from '../../persistencia/mongo/schemas/PresupuestoSchema';
import { TituloModel } from '../../persistencia/mongo/schemas/TituloSchema';
import { PartidaModel } from '../../persistencia/mongo/schemas/PartidaSchema';
import { ApuModel } from '../../persistencia/mongo/schemas/ApuSchema';

export class PresupuestoResolver {
  constructor(
    private readonly presupuestoService: PresupuestoService,
    private readonly versionadoPresupuestoService: VersionadoPresupuestoService,
    private readonly estructuraPresupuestoService: EstructuraPresupuestoService,
    private readonly precioRecursoPresupuestoService?: PrecioRecursoPresupuestoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listPresupuestos: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuestos = await this.presupuestoService.obtenerTodos();
              // Obtener todos los _id en batch
              const idsMap = await this.getMongoIdsBatch(presupuestos.map(p => p.id_presupuesto));
              // Normalizar valores null para compatibilidad con datos antiguos
              return presupuestos.map(presupuesto => {
                const presupuestoObj = presupuesto instanceof Presupuesto
                  ? Object.assign({}, presupuesto)
                  : presupuesto;
                return this.normalizarPresupuestoParaGraphQL({
                  ...presupuestoObj,
                  _id: idsMap.get(presupuesto.id_presupuesto) || null
                });
              });
            },
            'listPresupuestos'
          );
        },
        getPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.presupuestoService.obtenerPorId(id_presupuesto);
              if (!presupuesto) return null;
              const presupuestoObj = presupuesto instanceof Presupuesto
                ? Object.assign({}, presupuesto)
                : presupuesto;
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuestoObj,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'getPresupuesto',
            { id_presupuesto }
          );
        },
        getPresupuestosByProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuestos = await this.presupuestoService.obtenerPorProyecto(id_proyecto);
              // Obtener todos los _id en batch
              const idsMap = await this.getMongoIdsBatch(presupuestos.map(p => p.id_presupuesto));
              
              // Normalizar valores null para compatibilidad con datos antiguos
              return presupuestos.map(presupuesto => {
                // Si es instancia de Presupuesto, extraer propiedades manualmente para preservar null
                let presupuestoObj: any;
                if (presupuesto instanceof Presupuesto) {
                  presupuestoObj = {
                    id_presupuesto: presupuesto.id_presupuesto,
                    id_proyecto: presupuesto.id_proyecto,
                    costo_directo: presupuesto.costo_directo,
                    fecha_creacion: presupuesto.fecha_creacion,
                    monto_igv: presupuesto.monto_igv,
                    monto_utilidad: presupuesto.monto_utilidad,
                    nombre_presupuesto: presupuesto.nombre_presupuesto,
                    parcial_presupuesto: presupuesto.parcial_presupuesto,
                    observaciones: presupuesto.observaciones,
                    porcentaje_igv: presupuesto.porcentaje_igv,
                    porcentaje_utilidad: presupuesto.porcentaje_utilidad,
                    plazo: presupuesto.plazo,
                    ppto_base: presupuesto.ppto_base,
                    ppto_oferta: presupuesto.ppto_oferta,
                    total_presupuesto: presupuesto.total_presupuesto,
                    numeracion_presupuesto: presupuesto.numeracion_presupuesto,
                    id_grupo_version: presupuesto.id_grupo_version,
                    fase: presupuesto.fase,
                    version: presupuesto.version,
                    descripcion_version: presupuesto.descripcion_version,
                    es_padre: presupuesto.es_padre,
                    id_presupuesto_base: presupuesto.id_presupuesto_base,
                    id_presupuesto_licitacion: presupuesto.id_presupuesto_licitacion,
                    version_licitacion_aprobada: presupuesto.version_licitacion_aprobada,
                    id_presupuesto_contractual: presupuesto.id_presupuesto_contractual,
                    version_contractual_aprobada: presupuesto.version_contractual_aprobada,
                    es_inmutable: presupuesto.es_inmutable,
                    es_activo: presupuesto.es_activo,
                    estado: presupuesto.estado, // Preservar null explícitamente
                    estado_aprobacion: presupuesto.estado_aprobacion,
                    aprobacion_licitacion: presupuesto.aprobacion_licitacion,
                    aprobacion_meta: presupuesto.aprobacion_meta,
                  };
                } else {
                  presupuestoObj = presupuesto;
                }
                
                return this.normalizarPresupuestoParaGraphQL({
                  ...presupuestoObj,
                  _id: idsMap.get(presupuesto.id_presupuesto) || null
                });
              });
            },
            'getPresupuestosByProyecto',
            { id_proyecto }
          );
        },
        getPresupuestosMetaCompletados: async (
          _: any,
          { id_proyecto, estado }: { id_proyecto?: string; estado?: string }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              const filtros: any = {
                fase: 'META',
                version: { $ne: null }  // Excluye padres automáticamente
              };
              
              if (id_proyecto) {
                filtros.id_proyecto = id_proyecto;
              }
              
              if (estado) {
                filtros.estado = estado;
              } else {
                filtros.estado = { $in: ['vigente', 'aprobado'] };
              }
              
              filtros['aprobacion_meta.aprobado'] = true;
              
              const docs = await PresupuestoModel.find(filtros).lean();
              const idsMap = await this.getMongoIdsBatch(docs.map((d: any) => d.id_presupuesto));
              
              return docs.map((doc: any) => this.normalizarPresupuestoParaGraphQL({
                ...doc,
                _id: idsMap.get(doc.id_presupuesto) || null
              }));
            },
            'getPresupuestosMetaCompletados',
            { id_proyecto, estado }
          );
        },
        getPresupuestosPorFaseYEstado: async (
          _: any,
          { fase, estado, id_proyecto }: { fase: string; estado?: string; id_proyecto?: string }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              // Primero, buscar padres con la fase especificada
              const filtrosPadres: any = {
                fase,
                es_padre: true,
                version: null
              };
              
              if (id_proyecto) {
                filtrosPadres.id_proyecto = id_proyecto;
              }
              
              if (estado) {
                filtrosPadres.estado = estado;
              }
              
              const padres = await PresupuestoModel.find(filtrosPadres).lean();
              const gruposIds = padres.map((p: any) => p.id_grupo_version).filter(Boolean);
              
              // Luego, buscar versiones de esos grupos que tengan LA MISMA FASE
              const filtrosVersiones: any = {
                id_grupo_version: { $in: gruposIds },
                fase, // Solo versiones de la misma fase
                $or: [
                  { es_padre: false },
                  { es_padre: true, version: { $ne: null } }
                ]
              };
              
              if (id_proyecto) {
                filtrosVersiones.id_proyecto = id_proyecto;
              }
              
              if (estado) {
                filtrosVersiones.estado = estado;
              }
              
              const versiones = await PresupuestoModel.find(filtrosVersiones).lean();
              
              // Combinar padres y versiones
              const todos = [...padres, ...versiones];
              const idsMap = await this.getMongoIdsBatch(todos.map((d: any) => d.id_presupuesto));
              
              return todos.map((doc: any) => this.normalizarPresupuestoParaGraphQL({
                ...doc,
                _id: idsMap.get(doc.id_presupuesto) || null
              }));
            },
            'getPresupuestosPorFaseYEstado',
            { fase, estado, id_proyecto }
          );
        },
        getEstructuraPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const estructura = await this.estructuraPresupuestoService.obtenerEstructuraCompleta(id_presupuesto);
              if (!estructura) return null;

              // Normalizar presupuesto
              const presupuestoObj = estructura.presupuesto instanceof Presupuesto
                ? Object.assign({}, estructura.presupuesto)
                : estructura.presupuesto;
              const presupuestoNormalizado = this.normalizarPresupuestoParaGraphQL({
                ...presupuestoObj,
                _id: await this.getMongoIdAsync(estructura.presupuesto.id_presupuesto)
              });

              // Obtener _id de MongoDB para títulos y partidas en batch
              const tituloIdsMap = await this.getMongoIdsBatchTitulos(estructura.titulos.map(t => t.id_titulo));
              const partidaIdsMap = await this.getMongoIdsBatchPartidas(estructura.partidas.map(p => p.id_partida));

              // Normalizar títulos
              const titulosNormalizados = estructura.titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: tituloIdsMap.get(titulo.id_titulo) || null
                };
              });

              // Normalizar partidas
              const partidasNormalizadas = estructura.partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: partidaIdsMap.get(partida.id_partida) || null
                };
              });

              // Normalizar APUs (si existen)
              let apusNormalizados: any[] = [];
              let preciosCompartidos: any[] = [];
              
              if (estructura.apus && estructura.apus.length > 0) {
                const apuIdsMap = await this.getMongoIdsBatchApus(estructura.apus.map(a => a.id_apu));
                
                // Obtener precios compartidos del presupuesto (una sola vez para todos los APUs)
                const preciosMap = new Map<string, number>();
                if (this.precioRecursoPresupuestoService && id_presupuesto) {
                  try {
                    const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(id_presupuesto);
                    precios.forEach(p => {
                      preciosMap.set(p.id_precio_recurso, p.precio);
                      // Agregar a precios_compartidos para el frontend
                      preciosCompartidos.push({
                        id_precio_recurso: p.id_precio_recurso,
                        recurso_id: p.recurso_id,
                        precio: p.precio
                      });
                    });
                  } catch (error) {
                    console.error('Error cargando precios compartidos:', error);
                  }
                }
                
                apusNormalizados = await Promise.all(estructura.apus.map(async (apu) => {
                  const apuObj = apu instanceof Apu
                    ? Object.assign({}, apu)
                    : apu;
                  
                  // Normalizar recursos con precio calculado
                  const recursosNormalizados = (apu.recursos || []).map((r: any) => {
                    return this.normalizarRecursoApu(r, apu, preciosMap);
                  });
                  
                  return {
                    ...apuObj,
                    _id: apuIdsMap.get(apu.id_apu) || null,
                    recursos: recursosNormalizados
                  };
                }));
              }

              return {
                presupuesto: presupuestoNormalizado,
                titulos: titulosNormalizados,
                partidas: partidasNormalizadas,
                apus: apusNormalizados,
                precios_compartidos: preciosCompartidos
              };
            },
            'getEstructuraPresupuesto',
            { id_presupuesto }
          );
        },
      },
      Mutation: {
        addPresupuesto: async (_: any, data: Partial<Presupuesto>) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.presupuestoService.crear(data);
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'addPresupuesto'
          );
        },
        updatePresupuesto: async (_: any, { id_presupuesto, ...rest }: { id_presupuesto: string } & Partial<Presupuesto>) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.presupuestoService.actualizar(id_presupuesto, rest);
              if (!presupuesto) {
                throw new Error('Presupuesto no encontrado');
              }
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'updatePresupuesto',
            { id_presupuesto }
          );
        },
        deletePresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.presupuestoService.eliminar(id_presupuesto);
              if (!presupuesto) {
                throw new Error('Presupuesto no encontrado');
              }
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'deletePresupuesto',
            { id_presupuesto }
          );
        },
        eliminarGrupoPresupuestoCompleto: async (_: any, { id_grupo_version }: { id_grupo_version: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              // Verificar que el grupo existe y está en estado BORRADOR
              const presupuestos = await this.presupuestoService.obtenerPorGrupoVersion(id_grupo_version);

              if (presupuestos.length === 0) {
                throw new Error('Grupo de presupuesto no encontrado');
              }

              // Verificar que el padre esté en estado BORRADOR
              const presupuestoPadre = presupuestos.find(p => p.es_padre);
              if (!presupuestoPadre || presupuestoPadre.fase !== 'BORRADOR') {
                throw new Error('Solo se puede eliminar el grupo completo cuando el presupuesto padre está en estado BORRADOR');
              }

              const eliminado = await this.presupuestoService.eliminarGrupoCompleto(id_grupo_version);

              return {
                success: eliminado,
                message: eliminado
                  ? 'Grupo de presupuesto eliminado completamente'
                  : 'Error al eliminar el grupo de presupuesto',
                grupo_version_eliminado: id_grupo_version
              };
            },
            'eliminarGrupoPresupuestoCompleto',
            { id_grupo_version }
          );
        },
        crearPresupuestoPadre: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              // No pasar fase al crear padre (siempre se crea sin fase)
              const presupuesto = await this.versionadoPresupuestoService.crearPresupuestoPadre({
                id_proyecto: args.id_proyecto,
                nombre_presupuesto: args.nombre_presupuesto,
                porcentaje_igv: args.porcentaje_igv,
                porcentaje_utilidad: args.porcentaje_utilidad
                // fase no se pasa - el padre y v1 se crean sin fase
              });
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'crearPresupuestoPadre',
            args
          );
        },
        crearVersionDesdePadre: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.crearVersionDesdePadre(
                args.id_presupuesto_padre,
                args.descripcion_version
              );
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'crearVersionDesdePadre',
            args
          );
        },
        crearVersionDesdeVersion: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.crearVersionDesdeVersion(
                args.id_presupuesto_base,
                args.descripcion_version
              );
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'crearVersionDesdeVersion',
            args
          );
        },
        enviarALicitacion: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.enviarALicitacion(
                args.id_presupuesto
              );
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'enviarALicitacion',
            args
          );
        },
        pasarAContractual: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const aprobacion = await this.versionadoPresupuestoService.pasarAContractual(
                args.id_presupuesto_licitacion,
                args.usuario_solicitante_id,
                args.motivo
              );
              
              // Retornar la aprobación (no el presupuesto)
              return {
                id_aprobacion: aprobacion.id_aprobacion,
                id_presupuesto: aprobacion.id_presupuesto,
                id_grupo_version: aprobacion.id_grupo_version,
                id_proyecto: aprobacion.id_proyecto,
                tipo_aprobacion: aprobacion.tipo_aprobacion,
                usuario_solicitante_id: aprobacion.usuario_solicitante_id,
                usuario_aprobador_id: aprobacion.usuario_aprobador_id,
                estado: aprobacion.estado,
                fecha_solicitud: aprobacion.fecha_solicitud,
                fecha_aprobacion: aprobacion.fecha_aprobacion,
                fecha_rechazo: aprobacion.fecha_rechazo,
                comentario_solicitud: aprobacion.comentario_solicitud,
                comentario_aprobacion: aprobacion.comentario_aprobacion,
                comentario_rechazo: aprobacion.comentario_rechazo,
                version_presupuesto: aprobacion.version_presupuesto,
                monto_presupuesto: aprobacion.monto_presupuesto
              };
            },
            'pasarAContractual',
            args
          );
        },
        enviarVersionMetaAAprobacion: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const aprobacion = await this.versionadoPresupuestoService.enviarVersionMetaAAprobacion(
                args.id_presupuesto_meta,
                args.usuario_solicitante_id,
                args.comentario
              );
              
              // Retornar la aprobación
              return {
                id_aprobacion: aprobacion.id_aprobacion,
                id_presupuesto: aprobacion.id_presupuesto,
                id_grupo_version: aprobacion.id_grupo_version,
                id_proyecto: aprobacion.id_proyecto,
                tipo_aprobacion: aprobacion.tipo_aprobacion,
                usuario_solicitante_id: aprobacion.usuario_solicitante_id,
                usuario_aprobador_id: aprobacion.usuario_aprobador_id,
                estado: aprobacion.estado,
                fecha_solicitud: aprobacion.fecha_solicitud,
                fecha_aprobacion: aprobacion.fecha_aprobacion,
                fecha_rechazo: aprobacion.fecha_rechazo,
                comentario_solicitud: aprobacion.comentario_solicitud,
                comentario_aprobacion: aprobacion.comentario_aprobacion,
                comentario_rechazo: aprobacion.comentario_rechazo,
                version_presupuesto: aprobacion.version_presupuesto,
                monto_presupuesto: aprobacion.monto_presupuesto
              };
            },
            'enviarVersionMetaAAprobacion',
            args
          );
        },
        enviarVersionMetaAOficializacion: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const aprobacion = await this.versionadoPresupuestoService.enviarVersionMetaAOficializacion(
                args.id_presupuesto_meta,
                args.usuario_solicitante_id,
                args.comentario
              );
              
              // Retornar la aprobación
              return {
                id_aprobacion: aprobacion.id_aprobacion,
                id_presupuesto: aprobacion.id_presupuesto,
                id_grupo_version: aprobacion.id_grupo_version,
                id_proyecto: aprobacion.id_proyecto,
                tipo_aprobacion: aprobacion.tipo_aprobacion,
                usuario_solicitante_id: aprobacion.usuario_solicitante_id,
                usuario_aprobador_id: aprobacion.usuario_aprobador_id,
                estado: aprobacion.estado,
                fecha_solicitud: aprobacion.fecha_solicitud,
                fecha_aprobacion: aprobacion.fecha_aprobacion,
                fecha_rechazo: aprobacion.fecha_rechazo,
                comentario_solicitud: aprobacion.comentario_solicitud,
                comentario_aprobacion: aprobacion.comentario_aprobacion,
                comentario_rechazo: aprobacion.comentario_rechazo,
                version_presupuesto: aprobacion.version_presupuesto,
                monto_presupuesto: aprobacion.monto_presupuesto
              };
            },
            'enviarVersionMetaAOficializacion',
            args
          );
        },
        crearPresupuestoConVersion: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.crearPresupuestoConVersion({
                id_proyecto: args.id_proyecto,
                nombre_presupuesto: args.nombre_presupuesto,
                costo_directo: args.costo_directo,
                monto_igv: args.monto_igv,
                monto_utilidad: args.monto_utilidad,
                parcial_presupuesto: args.parcial_presupuesto,
                observaciones: args.observaciones,
                porcentaje_igv: args.porcentaje_igv,
                porcentaje_utilidad: args.porcentaje_utilidad,
                plazo: args.plazo,
                ppto_base: args.ppto_base,
                ppto_oferta: args.ppto_oferta,
                total_presupuesto: args.total_presupuesto,
                id_grupo_version: args.id_grupo_version,
                fase: args.fase,
                descripcion_version: args.descripcion_version
              });
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'crearPresupuestoConVersion',
            args
          );
        },
        crearPresupuestoMetaDesdeContractual: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.crearPresupuestoMetaDesdeContractual(
                args.id_presupuesto_contractual,
                args.motivo
              );
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'crearPresupuestoMetaDesdeContractual',
            args
          );
        },
        actualizarPresupuestoPadre: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const presupuesto = await this.versionadoPresupuestoService.actualizarPresupuestoPadre(
                args.id_presupuesto,
                {
                  nombre_presupuesto: args.nombre_presupuesto,
                  porcentaje_igv: args.porcentaje_igv,
                  porcentaje_utilidad: args.porcentaje_utilidad
                }
              );
              
              return this.normalizarPresupuestoParaGraphQL({
                ...presupuesto,
                _id: await this.getMongoIdAsync(presupuesto.id_presupuesto)
              });
            },
            'actualizarPresupuestoPadre',
            args
          );
        },
      },
      Presupuesto: {
        _id: (parent: Presupuesto & { _id?: string }) => {
          // Si el _id ya está mapeado en el objeto parent, retornarlo
          if (parent._id) {
            return parent._id;
          }
          // Si no, retornar null (esto no debería pasar si mapeamos correctamente)
          return null;
        },
      },
    };
  }

  /**
   * Obtiene el _id de MongoDB de forma asíncrona para un solo presupuesto
   */
  private async getMongoIdAsync(id_presupuesto: string): Promise<string | null> {
    const doc = await PresupuestoModel.findOne({ id_presupuesto }).lean();
    return doc?._id?.toString() || null;
  }

  /**
   * Obtiene los _id de MongoDB en batch para múltiples presupuestos
   * Esto es más eficiente que hacer consultas individuales
   */
  private async getMongoIdsBatch(id_presupuestos: string[]): Promise<Map<string, string>> {
    if (id_presupuestos.length === 0) {
      return new Map();
    }
    const docs = await PresupuestoModel.find({ id_presupuesto: { $in: id_presupuestos } }).lean();
    const idsMap = new Map<string, string>();
    docs.forEach(doc => {
      if (doc._id && doc.id_presupuesto) {
        idsMap.set(doc.id_presupuesto, doc._id.toString());
      }
    });
    return idsMap;
  }

  /**
   * Normaliza presupuesto para GraphQL, manejando valores null y objetos vacíos de datos antiguos
   */
  private normalizarPresupuestoParaGraphQL(presupuesto: any): any {
    // Convertir a objeto plano si es un documento de Mongoose o instancia de clase
    let presupuestoPlain: any;
    if (presupuesto && typeof presupuesto.toObject === 'function') {
      presupuestoPlain = presupuesto.toObject();
    } else if (presupuesto && typeof presupuesto.toJSON === 'function') {
      presupuestoPlain = presupuesto.toJSON();
    } else if (presupuesto instanceof Presupuesto) {
      // Si es instancia de Presupuesto, extraer propiedades manualmente
      presupuestoPlain = {
        id_presupuesto: presupuesto.id_presupuesto,
        id_proyecto: presupuesto.id_proyecto,
        costo_directo: presupuesto.costo_directo,
        fecha_creacion: presupuesto.fecha_creacion,
        monto_igv: presupuesto.monto_igv,
        monto_utilidad: presupuesto.monto_utilidad,
        nombre_presupuesto: presupuesto.nombre_presupuesto,
        parcial_presupuesto: presupuesto.parcial_presupuesto,
        observaciones: presupuesto.observaciones,
        porcentaje_igv: presupuesto.porcentaje_igv,
        porcentaje_utilidad: presupuesto.porcentaje_utilidad,
        plazo: presupuesto.plazo,
        ppto_base: presupuesto.ppto_base,
        ppto_oferta: presupuesto.ppto_oferta,
        total_presupuesto: presupuesto.total_presupuesto,
        numeracion_presupuesto: presupuesto.numeracion_presupuesto,
        id_grupo_version: presupuesto.id_grupo_version,
        fase: presupuesto.fase,
        version: presupuesto.version,
        descripcion_version: presupuesto.descripcion_version,
        es_padre: presupuesto.es_padre,
        id_presupuesto_base: presupuesto.id_presupuesto_base,
        id_presupuesto_licitacion: presupuesto.id_presupuesto_licitacion,
        version_licitacion_aprobada: presupuesto.version_licitacion_aprobada,
        es_inmutable: presupuesto.es_inmutable,
        es_activo: presupuesto.es_activo,
        estado: presupuesto.estado,
        estado_aprobacion: presupuesto.estado_aprobacion,
        aprobacion_licitacion: presupuesto.aprobacion_licitacion,
        aprobacion_meta: presupuesto.aprobacion_meta,
      };
    } else {
      presupuestoPlain = presupuesto;
    }

    // Función helper para verificar si un valor es un objeto vacío
    const esObjetoVacio = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val !== 'object') return false;
      if (Array.isArray(val)) return false;
      if (val instanceof Date) return false;
      try {
        return Object.keys(val).length === 0;
      } catch {
        return false;
      }
    };

    // Función helper para normalizar valores que pueden ser null u objetos vacíos
    const normalizarValor = (val: any, defaultValue: any = null): any => {
      if (val === null || val === undefined) {
        return defaultValue;
      }
      if (esObjetoVacio(val)) {
        return defaultValue;
      }
      return val;
    };

    // Extraer valores normalizados
    const estadoVal = presupuestoPlain.estado;
    const estadoAprobacionVal = presupuestoPlain.estado_aprobacion;
    const esActivoVal = presupuestoPlain.es_activo;
    const esInmutableVal = presupuestoPlain.es_inmutable;
    const faseVal = presupuestoPlain.fase;
    const versionVal = presupuestoPlain.version;
    const esPadreVal = presupuestoPlain.es_padre;

    // Normalizar valores específicos antes de construir el resultado
    // Validar que es_activo sea realmente un boolean (no un objeto u otro tipo)
    const esActivoNormalizado = (typeof esActivoVal === 'boolean')
      ? esActivoVal
      : (esActivoVal === true || esActivoVal === 'true' || esActivoVal === 1)
        ? true
        : (esActivoVal === false || esActivoVal === 'false' || esActivoVal === 0 || esActivoVal === null || esActivoVal === undefined)
          ? false
          : false; // Default a false si es un objeto u otro tipo

    // Validar que es_inmutable sea realmente un boolean (no un string u otro tipo)
    const esInmutableNormalizado = (typeof esInmutableVal === 'boolean')
      ? esInmutableVal
      : (esInmutableVal === true || esInmutableVal === 'true' || esInmutableVal === 1)
        ? true
        : (esInmutableVal === false || esInmutableVal === 'false' || esInmutableVal === 0 || esInmutableVal === null || esInmutableVal === undefined)
          ? false
          : false; // Default a false si es un string u otro tipo

    // Normalizar estado: debe ser string o null (preservar null explícitamente)
    const estadoNormalizado = (estadoVal === null)
      ? null
      : (estadoVal && typeof estadoVal === 'string')
        ? estadoVal
        : null;

    // Normalizar estado_aprobacion: debe ser objeto válido o null
    const estadoAprobacionNormalizado = (estadoAprobacionVal && typeof estadoAprobacionVal === 'object' && !Array.isArray(estadoAprobacionVal) && !esObjetoVacio(estadoAprobacionVal))
      ? estadoAprobacionVal
      : null;

    // Construir objeto normalizado - IMPORTANTE: remover campos problemáticos antes del spread
    const { estado: _, estado_aprobacion: __, es_activo: ___, es_inmutable: ____, ...presupuestoSinCamposProblematicos } = presupuestoPlain;

    const resultado: any = {
      ...presupuestoSinCamposProblematicos,
      // Normalizar estado: si es null, undefined u objeto vacío, usar null
      estado: estadoNormalizado,
      // Normalizar estado_aprobacion: si es null, undefined u objeto vacío, usar null
      estado_aprobacion: estadoAprobacionNormalizado,
      // Normalizar es_activo: validar que sea boolean
      es_activo: esActivoNormalizado,
      // Normalizar es_padre: calcular si no existe o es objeto vacío
      es_padre: esPadreVal === true || esPadreVal === false
        ? esPadreVal
        : (versionVal === null || versionVal === undefined),
      // Normalizar es_inmutable: validar que sea boolean
      es_inmutable: esInmutableNormalizado,
      // Normalizar fase: si es null, undefined u objeto vacío, mantener null
      fase: faseVal && typeof faseVal === 'string'
        ? faseVal
        : normalizarValor(faseVal, null),
      // Normalizar version: mantener null si es null o undefined
      version: versionVal !== undefined && versionVal !== null
        ? versionVal
        : null,
    };

    // Normalizar objetos anidados solo si existen
    if (presupuestoPlain.aprobacion_licitacion !== undefined) {
      resultado.aprobacion_licitacion = esObjetoVacio(presupuestoPlain.aprobacion_licitacion)
        ? null
        : presupuestoPlain.aprobacion_licitacion;
    }
    
    if (presupuestoPlain.aprobacion_meta !== undefined) {
      resultado.aprobacion_meta = esObjetoVacio(presupuestoPlain.aprobacion_meta)
        ? null
        : presupuestoPlain.aprobacion_meta;
    }

    return resultado;
  }

  private async getMongoIdsBatchTitulos(id_titulos: string[]): Promise<Map<string, string>> {
    try {
      if (id_titulos.length === 0) {
        return new Map();
      }
      const docs = await TituloModel.find({ id_titulo: { $in: id_titulos } }).lean();
      const idsMap = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_titulo && doc._id) {
          idsMap.set(doc.id_titulo, doc._id.toString());
        }
      });
      return idsMap;
    } catch (error) {
      console.error('Error obteniendo _ids de títulos de MongoDB en batch:', error);
      return new Map();
    }
  }

  private async getMongoIdsBatchPartidas(id_partidas: string[]): Promise<Map<string, string>> {
    try {
      if (id_partidas.length === 0) {
        return new Map();
      }
      const docs = await PartidaModel.find({ id_partida: { $in: id_partidas } }).lean();
      const idsMap = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_partida && doc._id) {
          idsMap.set(doc.id_partida, doc._id.toString());
        }
      });
      return idsMap;
    } catch (error) {
      console.error('Error obteniendo _ids de partidas de MongoDB en batch:', error);
      return new Map();
    }
  }

  private async getMongoIdsBatchApus(id_apus: string[]): Promise<Map<string, string>> {
    try {
      if (id_apus.length === 0) {
        return new Map();
      }
      const docs = await ApuModel.find({ id_apu: { $in: id_apus } }).lean();
      const idsMap = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_apu && doc._id) {
          idsMap.set(doc.id_apu, doc._id.toString());
        }
      });
      return idsMap;
    } catch (error) {
      console.error('Error obteniendo _ids de APUs de MongoDB en batch:', error);
      return new Map();
    }
  }

  /**
   * Normaliza un recurso APU calculando el precio correctamente
   * Misma lógica que ApuResolver.toObject()
   */
  private normalizarRecursoApu(r: any, apu: Apu, preciosMap: Map<string, number>): any {
    const cantidad = typeof r.cantidad === 'number' ? r.cantidad : 0;
    const desperdicio = typeof r.desperdicio_porcentaje === 'number' ? r.desperdicio_porcentaje : 0;
    const cantidadConDesperdicio = typeof r.cantidad_con_desperdicio === 'number' 
      ? r.cantidad_con_desperdicio 
      : cantidad * (1 + desperdicio / 100);
    
    let precio = 0;
    
    // PRIORIDAD 1: Si tiene precio override, usarlo directamente
    if (r.tiene_precio_override && r.precio_override !== undefined && r.precio_override !== null) {
      precio = r.precio_override;
    } else if (r.id_precio_recurso && preciosMap.has(r.id_precio_recurso)) {
      // PRIORIDAD 2: Si no tiene override, usar precio compartido
      precio = preciosMap.get(r.id_precio_recurso)!;
    } else {
      // PRIORIDAD 3: Si no hay precio compartido, intentar calcular desde parcial guardado
      const tipoRecurso = r.tipo_recurso || 'MATERIAL';
      if (tipoRecurso === 'MANO_OBRA' && apu.rendimiento > 0 && apu.jornada > 0 && r.parcial) {
        // Despejar precio desde parcial: Precio = Parcial / ((1 / Rendimiento) × Jornada × Cuadrilla)
        const cuadrillaValue = r.cuadrilla || 1;
        const divisor = (1 / apu.rendimiento) * apu.jornada * cuadrillaValue;
        precio = divisor > 0 ? r.parcial / divisor : 0;
      } else if (cantidadConDesperdicio > 0) {
        precio = (r.parcial || 0) / cantidadConDesperdicio;
      }
    }
    
    // Función helper para truncar a 4 decimales
    const truncateToFour = (num: number): number => {
      return Math.round(num * 10000) / 10000;
    };

    // Para subpartidas, el precio puede venir del precio_unitario_subpartida
    let precioFinal = precio;
    if (r.id_partida_subpartida && r.precio_unitario_subpartida !== undefined) {
      precioFinal = r.precio_unitario_subpartida;
    }
    
    // Usar el parcial guardado si existe, sino recalcular
    let parcial = typeof r.parcial === 'number' ? r.parcial : 0;
    const tipoRecurso = r.tipo_recurso || 'MATERIAL';
    
    // Si es subpartida, recalcular parcial como cantidad × precio_unitario_subpartida
    if (r.id_partida_subpartida && r.precio_unitario_subpartida !== undefined) {
      if (!parcial || parcial === 0) {
        parcial = Math.round(cantidad * precioFinal * 100) / 100;
      }
    } else {
      // Solo recalcular si el parcial no está guardado o es 0
      if (!parcial || parcial === 0) {
        switch (tipoRecurso) {
          case 'MATERIAL':
            parcial = truncateToFour(cantidadConDesperdicio * precioFinal);
            break;
          
          case 'MANO_OBRA': {
            if (apu.rendimiento > 0 && apu.jornada > 0) {
              const cuadrillaValue = r.cuadrilla || 1;
              parcial = truncateToFour((1 / apu.rendimiento) * apu.jornada * cuadrillaValue * precioFinal);
            } else {
              parcial = 0;
            }
            break;
          }
          
          case 'EQUIPO':
            if (apu.rendimiento > 0 && apu.jornada > 0) {
              const horasMaquina = (cantidad / apu.rendimiento) * apu.jornada;
              parcial = truncateToFour(horasMaquina * precioFinal);
            } else {
              parcial = 0;
            }
            break;
          
          case 'SUBCONTRATO':
            parcial = truncateToFour(cantidad * precioFinal);
            break;
          
          default:
            parcial = truncateToFour(cantidadConDesperdicio * precioFinal);
        }
      } else {
        // Asegurar que el parcial guardado esté truncado a 4 decimales
        parcial = truncateToFour(parcial);
      }
    }
    
    return {
      id_recurso_apu: r.id_recurso_apu || '',
      recurso_id: r.recurso_id || undefined,
      id_partida_subpartida: r.id_partida_subpartida || undefined,
      codigo_recurso: r.codigo_recurso || null,
      descripcion: r.descripcion || '',
      unidad_medida: r.unidad_medida || '',
      tipo_recurso: r.tipo_recurso || 'MATERIAL',
      id_precio_recurso: r.id_precio_recurso ?? null,
      precio: precioFinal, // NUNCA null, siempre un número
      cuadrilla: r.cuadrilla ?? null,
      cantidad: cantidad,
      desperdicio_porcentaje: desperdicio,
      cantidad_con_desperdicio: cantidadConDesperdicio,
      parcial: parcial,
      precio_unitario_subpartida: r.precio_unitario_subpartida || undefined,
      tiene_precio_override: r.tiene_precio_override || false,
      precio_override: r.precio_override || undefined,
      orden: typeof r.orden === 'number' ? r.orden : 0
    };
  }
}

