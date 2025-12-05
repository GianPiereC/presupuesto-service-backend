import { IResolvers } from '@graphql-tools/utils';
import { PartidaService } from '../../../aplicacion/servicios/PartidaService';
import { Partida } from '../../../dominio/entidades/Partida';
import { ErrorHandler } from './ErrorHandler';
import { PartidaModel } from '../../persistencia/mongo/schemas/PartidaSchema';

export class PartidaResolver {
  constructor(
    private readonly partidaService: PartidaService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listPartidas: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerTodos();
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'listPartidas'
          );
        },
        getPartida: async (_: any, { id_partida }: { id_partida: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partida = await this.partidaService.obtenerPorId(id_partida);
              if (!partida) return null;
              const partidaObj = partida instanceof Partida
                ? Object.assign({}, partida)
                : partida;
              return {
                ...partidaObj,
                _id: await this.getMongoIdAsync(partida.id_partida)
              };
            },
            'getPartida',
            { id_partida }
          );
        },
        getPartidasByPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerPorPresupuesto(id_presupuesto);
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'getPartidasByPresupuesto',
            { id_presupuesto }
          );
        },
        getPartidasByProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerPorProyecto(id_proyecto);
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'getPartidasByProyecto',
            { id_proyecto }
          );
        },
        getPartidasByTitulo: async (_: any, { id_titulo }: { id_titulo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerPorTitulo(id_titulo);
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'getPartidasByTitulo',
            { id_titulo }
          );
        },
        getPartidasPrincipalesByTitulo: async (_: any, { id_titulo }: { id_titulo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerPrincipalesPorTitulo(id_titulo);
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'getPartidasPrincipalesByTitulo',
            { id_titulo }
          );
        },
        getSubpartidas: async (_: any, { id_partida_padre }: { id_partida_padre: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partidas = await this.partidaService.obtenerSubpartidas(id_partida_padre);
              const idsMap = await this.getMongoIdsBatch(partidas.map(p => p.id_partida));
              return partidas.map(partida => {
                const partidaObj = partida instanceof Partida
                  ? Object.assign({}, partida)
                  : partida;
                return {
                  ...partidaObj,
                  _id: idsMap.get(partida.id_partida) || null
                };
              });
            },
            'getSubpartidas',
            { id_partida_padre }
          );
        }
      },
      Mutation: {
        createPartida: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              // Calcular parcial si no se proporciona
              const parcial_partida = args.parcial_partida !== undefined 
                ? args.parcial_partida 
                : (args.metrado || 0) * (args.precio_unitario || 0);

              const partida = await this.partidaService.crear({
                id_presupuesto: args.id_presupuesto,
                id_proyecto: args.id_proyecto,
                id_titulo: args.id_titulo,
                id_partida_padre: args.id_partida_padre || null,
                nivel_partida: args.nivel_partida,
                numero_item: args.numero_item,
                descripcion: args.descripcion,
                unidad_medida: args.unidad_medida,
                metrado: args.metrado,
                precio_unitario: args.precio_unitario,
                parcial_partida: parcial_partida,
                orden: args.orden,
                estado: args.estado || 'Activa'
              });
              const partidaObj = partida instanceof Partida
                ? Object.assign({}, partida)
                : partida;
              return {
                ...partidaObj,
                _id: await this.getMongoIdAsync(partida.id_partida)
              };
            },
            'createPartida',
            args
          );
        },
        updatePartida: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const data: any = {};
              if (args.id_titulo !== undefined) data.id_titulo = args.id_titulo;
              if (args.id_partida_padre !== undefined) data.id_partida_padre = args.id_partida_padre;
              if (args.nivel_partida !== undefined) data.nivel_partida = args.nivel_partida;
              if (args.numero_item !== undefined) data.numero_item = args.numero_item;
              if (args.descripcion !== undefined) data.descripcion = args.descripcion;
              if (args.unidad_medida !== undefined) data.unidad_medida = args.unidad_medida;
              if (args.metrado !== undefined) data.metrado = args.metrado;
              if (args.precio_unitario !== undefined) data.precio_unitario = args.precio_unitario;
              if (args.parcial_partida !== undefined) data.parcial_partida = args.parcial_partida;
              if (args.orden !== undefined) data.orden = args.orden;
              if (args.estado !== undefined) data.estado = args.estado;

              const partida = await this.partidaService.actualizar(args.id_partida, data);
              if (!partida) return null;
              
              const partidaObj = partida instanceof Partida
                ? Object.assign({}, partida)
                : partida;
              return {
                ...partidaObj,
                _id: await this.getMongoIdAsync(partida.id_partida)
              };
            },
            'updatePartida',
            args
          );
        },
        deletePartida: async (_: any, { id_partida }: { id_partida: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const partida = await this.partidaService.eliminar(id_partida);
              if (!partida) return null;
              
              const partidaObj = partida instanceof Partida
                ? Object.assign({}, partida)
                : partida;
              return {
                ...partidaObj,
                _id: await this.getMongoIdAsync(partida.id_partida)
              };
            },
            'deletePartida',
            { id_partida }
          );
        }
      }
    };
  }

  private async getMongoIdAsync(id_partida: string): Promise<string | null> {
    try {
      const doc = await PartidaModel.findOne({ id_partida }).lean();
      return doc ? doc._id.toString() : null;
    } catch (error) {
      console.error('Error obteniendo _id de MongoDB:', error);
      return null;
    }
  }

  private async getMongoIdsBatch(ids: string[]): Promise<Map<string, string>> {
    try {
      const docs = await PartidaModel.find({ id_partida: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_partida && doc._id) {
          map.set(doc.id_partida, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de MongoDB en batch:', error);
      return new Map();
    }
  }
}

