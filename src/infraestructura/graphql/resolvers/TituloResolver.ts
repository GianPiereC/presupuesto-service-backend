import { IResolvers } from '@graphql-tools/utils';
import { TituloService } from '../../../aplicacion/servicios/TituloService';
import { Titulo } from '../../../dominio/entidades/Titulo';
import { ErrorHandler } from './ErrorHandler';
import { TituloModel } from '../../persistencia/mongo/schemas/TituloSchema';

export class TituloResolver {
  constructor(
    private readonly tituloService: TituloService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listTitulos: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const titulos = await this.tituloService.obtenerTodos();
              const idsMap = await this.getMongoIdsBatch(titulos.map(t => t.id_titulo));
              return titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: idsMap.get(titulo.id_titulo) || null
                };
              });
            },
            'listTitulos'
          );
        },
        getTitulo: async (_: any, { id_titulo }: { id_titulo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulo = await this.tituloService.obtenerPorId(id_titulo);
              if (!titulo) return null;
              const tituloObj = titulo instanceof Titulo
                ? Object.assign({}, titulo)
                : titulo;
              return {
                ...tituloObj,
                _id: await this.getMongoIdAsync(titulo.id_titulo)
              };
            },
            'getTitulo',
            { id_titulo }
          );
        },
        getTitulosByPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulos = await this.tituloService.obtenerPorPresupuesto(id_presupuesto);
              const idsMap = await this.getMongoIdsBatch(titulos.map(t => t.id_titulo));
              return titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: idsMap.get(titulo.id_titulo) || null
                };
              });
            },
            'getTitulosByPresupuesto',
            { id_presupuesto }
          );
        },
        getTitulosByProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulos = await this.tituloService.obtenerPorProyecto(id_proyecto);
              const idsMap = await this.getMongoIdsBatch(titulos.map(t => t.id_titulo));
              return titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: idsMap.get(titulo.id_titulo) || null
                };
              });
            },
            'getTitulosByProyecto',
            { id_proyecto }
          );
        },
        getTitulosHijos: async (_: any, { id_titulo_padre }: { id_titulo_padre: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulos = await this.tituloService.obtenerHijos(id_titulo_padre);
              const idsMap = await this.getMongoIdsBatch(titulos.map(t => t.id_titulo));
              return titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: idsMap.get(titulo.id_titulo) || null
                };
              });
            },
            'getTitulosHijos',
            { id_titulo_padre }
          );
        },
        getTitulosPorPadre: async (_: any, { id_titulo_padre }: { id_titulo_padre?: string | null }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulos = await this.tituloService.obtenerPorPadre(id_titulo_padre || null);
              const idsMap = await this.getMongoIdsBatch(titulos.map(t => t.id_titulo));
              return titulos.map(titulo => {
                const tituloObj = titulo instanceof Titulo
                  ? Object.assign({}, titulo)
                  : titulo;
                return {
                  ...tituloObj,
                  _id: idsMap.get(titulo.id_titulo) || null
                };
              });
            },
            'getTitulosPorPadre',
            { id_titulo_padre }
          );
        }
      },
      Mutation: {
        createTitulo: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulo = await this.tituloService.crear({
                id_presupuesto: args.id_presupuesto,
                id_proyecto: args.id_proyecto,
                id_titulo_padre: args.id_titulo_padre || null,
                nivel: args.nivel,
                numero_item: args.numero_item,
                descripcion: args.descripcion,
                tipo: args.tipo,
                orden: args.orden,
                total_parcial: args.total_parcial || 0
              });
              const tituloObj = titulo instanceof Titulo
                ? Object.assign({}, titulo)
                : titulo;
              return {
                ...tituloObj,
                _id: await this.getMongoIdAsync(titulo.id_titulo)
              };
            },
            'createTitulo',
            args
          );
        },
        updateTitulo: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const data: any = {};
              if (args.id_titulo_padre !== undefined) data.id_titulo_padre = args.id_titulo_padre;
              if (args.nivel !== undefined) data.nivel = args.nivel;
              if (args.numero_item !== undefined) data.numero_item = args.numero_item;
              if (args.descripcion !== undefined) data.descripcion = args.descripcion;
              if (args.tipo !== undefined) data.tipo = args.tipo;
              if (args.orden !== undefined) data.orden = args.orden;
              if (args.total_parcial !== undefined) data.total_parcial = args.total_parcial;

              const titulo = await this.tituloService.actualizar(args.id_titulo, data);
              if (!titulo) return null;
              
              const tituloObj = titulo instanceof Titulo
                ? Object.assign({}, titulo)
                : titulo;
              return {
                ...tituloObj,
                _id: await this.getMongoIdAsync(titulo.id_titulo)
              };
            },
            'updateTitulo',
            args
          );
        },
        deleteTitulo: async (_: any, { id_titulo }: { id_titulo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const titulo = await this.tituloService.eliminar(id_titulo);
              if (!titulo) return null;
              
              const tituloObj = titulo instanceof Titulo
                ? Object.assign({}, titulo)
                : titulo;
              return {
                ...tituloObj,
                _id: await this.getMongoIdAsync(titulo.id_titulo)
              };
            },
            'deleteTitulo',
            { id_titulo }
          );
        }
      }
    };
  }

  private async getMongoIdAsync(id_titulo: string): Promise<string | null> {
    try {
      const doc = await TituloModel.findOne({ id_titulo }).lean();
      return doc ? doc._id.toString() : null;
    } catch (error) {
      console.error('Error obteniendo _id de MongoDB:', error);
      return null;
    }
  }

  private async getMongoIdsBatch(ids: string[]): Promise<Map<string, string>> {
    try {
      const docs = await TituloModel.find({ id_titulo: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_titulo && doc._id) {
          map.set(doc.id_titulo, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de MongoDB en batch:', error);
      return new Map();
    }
  }
}

