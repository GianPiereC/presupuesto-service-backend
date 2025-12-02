import { IResolvers } from '@graphql-tools/utils';
import { PrecioRecursoPresupuestoService } from '../../../aplicacion/servicios/PrecioRecursoPresupuestoService';
import { PrecioRecursoPresupuesto } from '../../../dominio/entidades/PrecioRecursoPresupuesto';
import { ErrorHandler } from './ErrorHandler';
import { PrecioRecursoPresupuestoModel } from '../../persistencia/mongo/schemas/PrecioRecursoPresupuestoSchema';

export class PrecioRecursoPresupuestoResolver {
  constructor(
    private readonly precioRecursoPresupuestoService: PrecioRecursoPresupuestoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listPreciosRecursoPresupuesto: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const precios = await this.precioRecursoPresupuestoService.obtenerTodos();
              const idsMap = await this.getMongoIdsBatch(precios.map(p => p.id_precio_recurso));
              return precios.map(precio => ({
                ...this.toObject(precio),
                _id: idsMap.get(precio.id_precio_recurso) || null
              }));
            },
            'listPreciosRecursoPresupuesto'
          );
        },
        getPrecioRecursoPresupuesto: async (_: any, { id_precio_recurso }: { id_precio_recurso: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const precio = await this.precioRecursoPresupuestoService.obtenerPorId(id_precio_recurso);
              if (!precio) return null;
              return {
                ...this.toObject(precio),
                _id: await this.getMongoIdAsync(precio.id_precio_recurso)
              };
            },
            'getPrecioRecursoPresupuesto',
            { id_precio_recurso }
          );
        },
        getPreciosRecursoByPresupuesto: async (_: any, { id_presupuesto }: { id_presupuesto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const precios = await this.precioRecursoPresupuestoService.obtenerPorPresupuesto(id_presupuesto);
              const idsMap = await this.getMongoIdsBatch(precios.map(p => p.id_precio_recurso));
              return precios.map(precio => ({
                ...this.toObject(precio),
                _id: idsMap.get(precio.id_precio_recurso) || null
              }));
            },
            'getPreciosRecursoByPresupuesto',
            { id_presupuesto }
          );
        },
        getPrecioRecursoByPresupuestoYRecurso: async (
          _: any,
          { id_presupuesto, recurso_id }: { id_presupuesto: string; recurso_id: string }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              const precio = await this.precioRecursoPresupuestoService.obtenerPorPresupuestoYRecurso(
                id_presupuesto,
                recurso_id
              );
              if (!precio) return null;
              return {
                ...this.toObject(precio),
                _id: await this.getMongoIdAsync(precio.id_precio_recurso)
              };
            },
            'getPrecioRecursoByPresupuestoYRecurso',
            { id_presupuesto, recurso_id }
          );
        }
      },
      Mutation: {
        createPrecioRecursoPresupuesto: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const precio = await this.precioRecursoPresupuestoService.crear({
                id_presupuesto: args.id_presupuesto,
                recurso_id: args.recurso_id,
                codigo_recurso: args.codigo_recurso,
                descripcion: args.descripcion,
                unidad: args.unidad,
                tipo_recurso: args.tipo_recurso,
                precio: args.precio,
                usuario_actualizo: args.usuario_actualizo
              });
              return {
                ...this.toObject(precio),
                _id: await this.getMongoIdAsync(precio.id_precio_recurso)
              };
            },
            'createPrecioRecursoPresupuesto',
            args
          );
        },
        updatePrecioRecursoPresupuesto: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const data: any = {};
              if (args.precio !== undefined) data.precio = args.precio;
              if (args.usuario_actualizo !== undefined) data.usuario_actualizo = args.usuario_actualizo;
              
              const precio = await this.precioRecursoPresupuestoService.actualizar(args.id_precio_recurso, data);
              if (!precio) return null;
              
              return {
                ...this.toObject(precio),
                _id: await this.getMongoIdAsync(precio.id_precio_recurso)
              };
            },
            'updatePrecioRecursoPresupuesto',
            args
          );
        },
        deletePrecioRecursoPresupuesto: async (_: any, { id_precio_recurso }: { id_precio_recurso: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const precio = await this.precioRecursoPresupuestoService.obtenerPorId(id_precio_recurso);
              if (!precio) return null;
              
              await this.precioRecursoPresupuestoService.eliminar(id_precio_recurso);
              return {
                ...this.toObject(precio),
                _id: await this.getMongoIdAsync(precio.id_precio_recurso)
              };
            },
            'deletePrecioRecursoPresupuesto',
            { id_precio_recurso }
          );
        }
      }
    };
  }

  private toObject(precio: PrecioRecursoPresupuesto): any {
    return precio instanceof PrecioRecursoPresupuesto ? Object.assign({}, precio) : precio;
  }

  private async getMongoIdAsync(id_precio_recurso: string): Promise<string | null> {
    try {
      const doc = await PrecioRecursoPresupuestoModel.findOne({ id_precio_recurso }).lean();
      return doc ? doc._id.toString() : null;
    } catch (error) {
      console.error('Error obteniendo _id de MongoDB:', error);
      return null;
    }
  }

  private async getMongoIdsBatch(ids: string[]): Promise<Map<string, string>> {
    try {
      const docs = await PrecioRecursoPresupuestoModel.find({ id_precio_recurso: { $in: ids } }).lean();
      const map = new Map<string, string>();
      docs.forEach((doc: any) => {
        if (doc.id_precio_recurso && doc._id) {
          map.set(doc.id_precio_recurso, doc._id.toString());
        }
      });
      return map;
    } catch (error) {
      console.error('Error obteniendo _ids de MongoDB en batch:', error);
      return new Map();
    }
  }
}


