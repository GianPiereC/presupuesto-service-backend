import { IResolvers } from '@graphql-tools/utils';
import { ProyectoService } from '../../../aplicacion/servicios/ProyectoService';
import { Proyecto } from '../../../dominio/entidades/Proyecto';
import { ErrorHandler } from './ErrorHandler';
import { ProyectoModel } from '../../persistencia/mongo/schemas/ProyectoSchema';
import { PaginationFilterInput, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';

export class ProyectoResolver {
  constructor(private readonly proyectoService: ProyectoService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listProyectos: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const proyectos = await this.proyectoService.obtenerTodos();
              // Obtener todos los _id en batch
              const idsMap = await this.getMongoIdsBatch(proyectos.map(p => p.id_proyecto));
              // Mapear incluyendo el _id de MongoDB
              return proyectos.map(proyecto => ({
                ...proyecto,
                _id: idsMap.get(proyecto.id_proyecto) || null
              }));
            },
            'listProyectos'
          );
        },
        getProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyecto = await this.proyectoService.obtenerPorId(id_proyecto);
              if (!proyecto) return null;
              return {
                ...proyecto,
                _id: await this.getMongoIdAsync(proyecto.id_proyecto)
              };
            },
            'getProyecto',
            { id_proyecto }
          );
        },
        getProyectosByUsuario: async (_: any, { id_usuario }: { id_usuario: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyectos = await this.proyectoService.obtenerPorUsuario(id_usuario);
              // Obtener todos los _id en batch
              const idsMap = await this.getMongoIdsBatch(proyectos.map(p => p.id_proyecto));
              return proyectos.map(proyecto => ({
                ...proyecto,
                _id: idsMap.get(proyecto.id_proyecto) || null
              }));
            },
            'getProyectosByUsuario',
            { id_usuario }
          );
        },
        calcularTotalProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyecto = await this.proyectoService.calcularTotalProyecto(id_proyecto);
              if (!proyecto) return null;
              return {
                ...proyecto,
                _id: await this.getMongoIdAsync(proyecto.id_proyecto)
              };
            },
            'calcularTotalProyecto',
            { id_proyecto }
          );
        },
        listProyectosConPresupuestos: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const proyectos = await this.proyectoService.obtenerProyectosConPresupuestos();
              // Si los proyectos ya vienen con _id desde aggregate, usarlos directamente
              // Si no, obtenerlos en batch
              const proyectosMapeados = proyectos.map((p: any) => {
                if (p._id) {
                  return {
                    ...p,
                    _id: p._id.toString()
                  };
                }
                return p;
              });
              // Si algunos no tienen _id, obtenerlos en batch
              const proyectosSinId = proyectosMapeados.filter((p: any) => !p._id && p.id_proyecto);
              if (proyectosSinId.length > 0) {
                const idsMap = await this.getMongoIdsBatch(proyectosSinId.map((p: any) => p.id_proyecto));
                return proyectosMapeados.map((p: any) => ({
                  ...p,
                  _id: p._id || idsMap.get(p.id_proyecto) || null
                }));
              }
              return proyectosMapeados;
            },
            'listProyectosConPresupuestos'
          );
        },
        listProyectosPaginated: async (_: any, { input }: { input?: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              // Convertir input de GraphQL al formato esperado por el servicio
              const paginationFilterInput = this.convertGraphQLInputToServiceInput(input);
              
              // Obtener resultados paginados
              const result = await this.proyectoService.listarProyectosPaginated(paginationFilterInput);
              
              // Obtener todos los _id en batch
              const idsMap = await this.getMongoIdsBatch(result.data.map(p => p.id_proyecto));
              
              // Mapear incluyendo el _id de MongoDB
              const proyectosConId = result.data.map(proyecto => ({
                ...proyecto,
                _id: idsMap.get(proyecto.id_proyecto) || null
              }));
              
              return {
                data: proyectosConId,
                pagination: result.pagination
              };
            },
            'listProyectosPaginated',
            { input }
          );
        },
      },
      Mutation: {
        addProyecto: async (_: any, data: Partial<Proyecto>) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyecto = await this.proyectoService.crear(data);
              return {
                ...proyecto,
                _id: await this.getMongoIdAsync(proyecto.id_proyecto)
              };
            },
            'addProyecto'
          );
        },
        updateProyecto: async (_: any, { id_proyecto, ...rest }: { id_proyecto: string } & Partial<Proyecto>) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyecto = await this.proyectoService.actualizar(id_proyecto, rest);
              if (!proyecto) {
                throw new Error('Proyecto no encontrado');
              }
              return {
                ...proyecto,
                _id: await this.getMongoIdAsync(proyecto.id_proyecto)
              };
            },
            'updateProyecto',
            { id_proyecto }
          );
        },
        deleteProyecto: async (_: any, { id_proyecto }: { id_proyecto: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const proyecto = await this.proyectoService.eliminar(id_proyecto);
              if (!proyecto) {
                throw new Error('Proyecto no encontrado');
              }
              return {
                ...proyecto,
                _id: await this.getMongoIdAsync(proyecto.id_proyecto)
              };
            },
            'deleteProyecto',
            { id_proyecto }
          );
        },
      },
      Proyecto: {
        _id: (parent: Proyecto & { _id?: string }) => {
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
   * Obtiene el _id de MongoDB de forma asíncrona para un solo proyecto
   */
  private async getMongoIdAsync(id_proyecto: string): Promise<string | null> {
    const doc = await ProyectoModel.findOne({ id_proyecto }).lean();
    return doc?._id?.toString() || null;
  }

  /**
   * Obtiene los _id de MongoDB en batch para múltiples proyectos
   * Esto es más eficiente que hacer consultas individuales
   */
  private async getMongoIdsBatch(id_proyectos: string[]): Promise<Map<string, string>> {
    if (id_proyectos.length === 0) {
      return new Map();
    }
    const docs = await ProyectoModel.find({ id_proyecto: { $in: id_proyectos } }).lean();
    const idsMap = new Map<string, string>();
    docs.forEach(doc => {
      if (doc._id && doc.id_proyecto) {
        idsMap.set(doc.id_proyecto, doc._id.toString());
      }
    });
    return idsMap;
  }

  /**
   * Convierte el input de GraphQL al formato esperado por el servicio
   * GraphQL usa array de FilterInput con field, value, operator
   * El servicio espera un objeto plano con claves como campos
   */
  private convertGraphQLInputToServiceInput(input?: any): PaginationFilterInput {
    if (!input) {
      return {};
    }

    const result: PaginationFilterInput = {};

    // Convertir paginación
    if (input.pagination) {
      result.page = input.pagination.page;
      result.limit = input.pagination.limit;
      result.sortBy = input.pagination.sortBy;
      result.sortOrder = input.pagination.sortOrder === 'asc' ? 'asc' : 'desc';
    }

    // Convertir filtros de GraphQL (array) a formato del servicio (objeto plano)
    if (input.filters && Array.isArray(input.filters)) {
      const filters: FilterInput = {};
      input.filters.forEach((filter: any) => {
        if (filter.field && filter.value !== undefined && filter.value !== null) {
          // Si hay operador, crear objeto con operador y valor
          if (filter.operator && filter.operator !== 'eq') {
            filters[filter.field] = {
              operator: filter.operator as any,
              value: filter.value
            };
          } else {
            // Si no hay operador o es 'eq', usar valor directo
            filters[filter.field] = filter.value;
          }
        }
      });
      result.filters = filters;
    }

    // Convertir búsqueda
    if (input.search) {
      result.search = {
        query: input.search.query,
        fields: input.search.fields
      } as SearchInput;
    }

    return result;
  }
}

