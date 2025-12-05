import { IResolvers } from '@graphql-tools/utils';
import { ApuService } from '../../../aplicacion/servicios/ApuService';
import { PrecioRecursoPresupuestoService } from '../../../aplicacion/servicios/PrecioRecursoPresupuestoService';
import { Apu } from '../../../dominio/entidades/Apu';
import { RecursoApu } from '../../../dominio/entidades/RecursoApu';
import { ErrorHandler } from './ErrorHandler';
import { EntityNotFoundException } from '../../../dominio/exceptions/DomainException';
import { ApuModel } from '../../persistencia/mongo/schemas/ApuSchema';
import { mapearTipoCostoRecursoATipoApu } from '../../../dominio/utilidades/TipoRecursoMapper';

export class ApuResolver {
  constructor(
    private readonly apuService: ApuService,
    private readonly precioRecursoPresupuestoService?: PrecioRecursoPresupuestoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listApus: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const apus = await this.apuService.obtenerTodos();
              const idsMap = await this.getMongoIdsBatch(apus.map(a => a.id_apu));
              return await Promise.all(apus.map(async apu => ({
                ...await this.toObject(apu),
                _id: idsMap.get(apu.id_apu) || null
              })));
            },
            'listApus'
          );
        },
        getApu: async (_: any, { id_apu }: { id_apu: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const apu = await this.apuService.obtenerPorId(id_apu);
              if (!apu) return null;
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'getApu',
            { id_apu }
          );
        },
        getApuByPartida: async (_: any, { id_partida }: { id_partida: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const apu = await this.apuService.obtenerPorPartida(id_partida);
              if (!apu) return null;
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'getApuByPartida',
            { id_partida }
          );
        },
        getApusByPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const apus = await this.apuService.obtenerPorPresupuesto(id_presupuesto);
              const idsMap = await this.getMongoIdsBatch(apus.map(a => a.id_apu));
              return await Promise.all(apus.map(async apu => ({
                ...await this.toObject(apu),
                _id: idsMap.get(apu.id_apu) || null
              })));
            },
            'getApusByPresupuesto',
            { id_presupuesto }
          );
        },
        getApusByProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const apus = await this.apuService.obtenerPorProyecto(id_proyecto);
              const idsMap = await this.getMongoIdsBatch(apus.map(a => a.id_apu));
              return await Promise.all(apus.map(async apu => ({
                ...await this.toObject(apu),
                _id: idsMap.get(apu.id_apu) || null
              })));
            },
            'getApusByProyecto',
            { id_proyecto }
          );
        }
      },
      Mutation: {
        createApu: async (_: any, args: any, context?: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const recursos = (args.recursos || []).map((r: any) => this.mapRecursoApuInput(r));
              const usuarioId = context?.user?.id || 'system';

              // Crear mapa de precios por recurso para pasar al servicio
              const preciosRecursos = new Map<string, number>();
              (args.recursos || []).forEach((r: any) => {
                if (r.recurso_id && r.precio_usuario !== undefined) {
                  preciosRecursos.set(r.recurso_id, r.precio_usuario);
                }
              });

              const apu = await this.apuService.crear({
                id_partida: args.id_partida,
                id_presupuesto: args.id_presupuesto,
                id_proyecto: args.id_proyecto,
                rendimiento: args.rendimiento || 1.0,
                jornada: args.jornada || 8,
                costo_materiales: args.costo_materiales || 0,
                costo_mano_obra: args.costo_mano_obra || 0,
                costo_equipos: args.costo_equipos || 0,
                costo_subcontratos: args.costo_subcontratos || 0,
                costo_directo: args.costo_directo || 0,
                recursos,
                usuario_actualizo: usuarioId,
                precios_recursos: preciosRecursos
              });

              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'createApu',
            args
          );
        },
        updateApu: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const data: any = {};
              if (args.rendimiento !== undefined) data.rendimiento = args.rendimiento;
              if (args.jornada !== undefined) data.jornada = args.jornada;
              if (args.costo_materiales !== undefined) data.costo_materiales = args.costo_materiales;
              if (args.costo_mano_obra !== undefined) data.costo_mano_obra = args.costo_mano_obra;
              if (args.costo_equipos !== undefined) data.costo_equipos = args.costo_equipos;
              if (args.costo_subcontratos !== undefined) data.costo_subcontratos = args.costo_subcontratos;
              if (args.costo_directo !== undefined) data.costo_directo = args.costo_directo;
              
              const apu = await this.apuService.actualizar(args.id_apu, data);
              if (!apu) return null;
              
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'updateApu',
            args
          );
        },
        deleteApu: async (_: any, { id_apu }: { id_apu: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const apu = await this.apuService.obtenerPorId(id_apu);
              if (!apu) {
                throw new EntityNotFoundException(
                  `APU con id ${id_apu} no encontrado`,
                  'APU',
                  id_apu
                );
              }
              
              // Obtener el _id ANTES de eliminar el APU
              const mongoId = await this.getMongoIdAsync(apu.id_apu);
              
              // Eliminar el APU
              await this.apuService.eliminar(id_apu);
              
              // Retornar el objeto con el _id obtenido antes de eliminar
              return {
                ...await this.toObject(apu),
                _id: mongoId || null
              };
            },
            'deleteApu',
            { id_apu }
          );
        },
        addRecursoToApu: async (_: any, { id_apu, recurso }: { id_apu: string; recurso: any }, context?: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const recursoApu = this.mapRecursoApuInput(recurso);
              const usuarioId = context?.user?.id || 'system';
              const precioUsuario = recurso.precio_usuario ?? 0;
              
              const apu = await this.apuService.agregarRecurso(id_apu, recursoApu, precioUsuario, usuarioId);
              if (!apu) return null;
              
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'addRecursoToApu',
            { id_apu, recurso }
          );
        },
        updateRecursoInApu: async (
          _: any,
          { id_apu, id_recurso_apu, recurso }: { id_apu: string; id_recurso_apu: string; recurso: any },
          context?: any
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              const recursoData = this.mapRecursoApuInput(recurso);
              const usuarioId = context?.user?.id || 'system';
              // precio_usuario contiene el precio que el usuario ingresó
              const precioUsuario = recurso.precio_usuario ?? 0;
              const apu = await this.apuService.actualizarRecurso(id_apu, id_recurso_apu, recursoData, precioUsuario, usuarioId);
              if (!apu) return null;
              
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'updateRecursoInApu',
            { id_apu, id_recurso_apu, recurso }
          );
        },
        removeRecursoFromApu: async (
          _: any,
          { id_apu, id_recurso_apu }: { id_apu: string; id_recurso_apu: string }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              // Verificar que el APU existe
              const apuExistente = await this.apuService.obtenerPorId(id_apu);
              if (!apuExistente) {
                throw new EntityNotFoundException(
                  `APU con id ${id_apu} no encontrado`,
                  'APU',
                  id_apu
                );
              }

              // Verificar que el recurso existe en el APU
              const recursoExistente = apuExistente.recursos.find(r => r.id_recurso_apu === id_recurso_apu);
              if (!recursoExistente) {
                throw new EntityNotFoundException(
                  `Recurso con id ${id_recurso_apu} no encontrado en el APU ${id_apu}`,
                  'RecursoApu',
                  id_recurso_apu
                );
              }

              // Eliminar el recurso
              const apu = await this.apuService.eliminarRecurso(id_apu, id_recurso_apu);
              if (!apu) {
                throw new Error(`Error al eliminar el recurso ${id_recurso_apu} del APU ${id_apu}`);
              }
              
              return {
                ...await this.toObject(apu),
                _id: await this.getMongoIdAsync(apu.id_apu)
              };
            },
            'removeRecursoFromApu',
            { id_apu, id_recurso_apu }
          );
        },
        crearPartidasSubpartidasYAPUs: async (
          _: any,
          { subpartidas }: { subpartidas: any[] }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              const mapeo = await this.apuService.crearPartidasSubpartidasYAPUs({
                subpartidas: subpartidas.map(sp => ({
                  temp_id: sp.temp_id,
                  id_partida_padre: sp.id_partida_padre,
                  id_presupuesto: sp.id_presupuesto,
                  id_proyecto: sp.id_proyecto,
                  id_titulo: sp.id_titulo,
                  nivel_partida: sp.nivel_partida,
                  descripcion: sp.descripcion,
                  unidad_medida: sp.unidad_medida,
                  precio_unitario: sp.precio_unitario,
                  metrado: sp.metrado,
                  rendimiento: sp.rendimiento,
                  jornada: sp.jornada,
                  recursos: sp.recursos.map((r: any) => ({
                    recurso_id: r.recurso_id,
                    codigo_recurso: r.codigo_recurso,
                    descripcion: r.descripcion,
                    unidad_medida: r.unidad_medida,
                    tipo_recurso: r.tipo_recurso,
                    id_precio_recurso: r.id_precio_recurso,
                    precio_usuario: r.precio_usuario,
                    cuadrilla: r.cuadrilla,
                    cantidad: r.cantidad,
                    desperdicio_porcentaje: r.desperdicio_porcentaje,
                    cantidad_con_desperdicio: r.cantidad_con_desperdicio,
                    parcial: r.parcial,
                    orden: r.orden,
                  })),
                })),
              });
              
              // Convertir Map a array para GraphQL
              const mapeoArray = Array.from(mapeo.entries()).map(([temp_id, id_partida_real]) => ({
                temp_id,
                id_partida_real
              }));
              
              return {
                mapeo: mapeoArray
              };
            },
            'crearPartidasSubpartidasYAPUs',
            { subpartidas }
          );
        }
      }
    };
  }

  private mapRecursoApuInput(input: any): RecursoApu {
    const id_recurso_apu = input.id_recurso_apu || `RAPU${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let tipoRecurso: 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';
    
    if (input.tipo_recurso) {
      if (['MATERIAL', 'MANO_OBRA', 'EQUIPO', 'SUBCONTRATO'].includes(input.tipo_recurso)) {
        tipoRecurso = input.tipo_recurso;
      } else {
        tipoRecurso = mapearTipoCostoRecursoATipoApu(
          input.tipo_recurso,
          input.tipo_recurso_codigo
        );
      }
    } else if (input.tipo_costo_recurso) {
      tipoRecurso = mapearTipoCostoRecursoATipoApu(
        input.tipo_costo_recurso.nombre,
        input.tipo_costo_recurso.codigo
      );
    } else {
      tipoRecurso = 'MATERIAL';
    }
    
    return new RecursoApu(
      id_recurso_apu,
      input.recurso_id,
      input.codigo_recurso,
      input.descripcion,
      input.unidad_medida,
      tipoRecurso,
      input.id_precio_recurso ?? null,
      input.cantidad,
      input.desperdicio_porcentaje || 0,
      input.cantidad_con_desperdicio || (input.cantidad * (1 + (input.desperdicio_porcentaje || 0) / 100)),
      input.parcial || 0,
      input.orden || 0,
      input.cuadrilla,
      input.id_partida_subpartida,
      input.precio_unitario_subpartida,
      input.tiene_precio_override,
      input.precio_override
    );
  }

  private async toObject(apu: Apu): Promise<any> {
    const apuObj = apu instanceof Apu ? Object.assign({}, apu) : apu;
    
    const preciosMap = new Map<string, number>();
    if (this.precioRecursoPresupuestoService && apu.id_presupuesto) {
      try {
        const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(apu.id_presupuesto);
        precios.forEach(p => {
          preciosMap.set(p.id_precio_recurso, p.precio);
        });
      } catch (error) {
        console.error('Error cargando precios compartidos:', error);
      }
    }
    
    return {
      ...apuObj,
      recursos: (apu.recursos || []).map((r: any) => {
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
              // Fórmula correcta para MANO DE OBRA:
              // Parcial_MO = (1 / Rendimiento) × Jornada × Cuadrilla × Precio_Hora
              // O también: Parcial_MO = Cantidad × Precio_Hora (donde Cantidad = (Jornada × Cuadrilla) / Rendimiento)
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
          precio: precioFinal,
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
      })
    };
  }

  private async getMongoIdAsync(id_apu: string): Promise<string | null> {
    try {
      const doc = await ApuModel.findOne({ id_apu }).lean();
      return doc ? doc._id.toString() : null;
    } catch (error) {
      console.error('Error obteniendo _id de MongoDB:', error);
      return null;
    }
  }

  private async getMongoIdsBatch(ids: string[]): Promise<Map<string, string>> {
    try {
      const docs = await ApuModel.find({ id_apu: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_apu && doc._id) {
          map.set(doc.id_apu, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de MongoDB en batch:', error);
      return new Map();
    }
  }
}


