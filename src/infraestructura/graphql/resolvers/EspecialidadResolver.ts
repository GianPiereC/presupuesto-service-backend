import { IResolvers } from '@graphql-tools/utils';
import { EspecialidadService } from '../../../aplicacion/servicios/EspecialidadService';
import { Especialidad } from '../../../dominio/entidades/Especialidad';
import { ErrorHandler } from './ErrorHandler';
import { EspecialidadModel } from '../../persistencia/mongo/schemas/EspecialidadSchema';

export class EspecialidadResolver {
  constructor(
    private readonly especialidadService: EspecialidadService
  ) { }

  getResolvers(): IResolvers {
    return {
      Query: {
        listEspecialidades: async () => {
          return await ErrorHandler.handleError(
            async () => {
              const especialidades = await this.especialidadService.obtenerTodos();
              const idsMap = await this.getMongoIdsBatch(especialidades.map(e => e.id_especialidad));
              return especialidades.map(especialidad => {
                const especialidadObj = especialidad instanceof Especialidad
                  ? Object.assign({}, especialidad)
                  : especialidad;
                return {
                  ...especialidadObj,
                  _id: idsMap.get(especialidad.id_especialidad) || null
                };
              });
            },
            'listEspecialidades'
          );
        },
        getEspecialidad: async (_: any, { id_especialidad }: { id_especialidad: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const especialidad = await this.especialidadService.obtenerPorId(id_especialidad);
              if (!especialidad) return null;
              const especialidadObj = especialidad instanceof Especialidad
                ? Object.assign({}, especialidad)
                : especialidad;
              return {
                ...especialidadObj,
                _id: await this.getMongoIdAsync(especialidad.id_especialidad)
              };
            },
            'getEspecialidad',
            { id_especialidad }
          );
        },
      },
      Mutation: {
        addEspecialidad: async (_: any, { nombre, descripcion }: { nombre: string; descripcion: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const especialidad = await this.especialidadService.crear({ nombre, descripcion });
              const especialidadObj = especialidad instanceof Especialidad
                ? Object.assign({}, especialidad)
                : especialidad;
              return {
                ...especialidadObj,
                _id: await this.getMongoIdAsync(especialidad.id_especialidad)
              };
            },
            'addEspecialidad',
            { nombre, descripcion }
          );
        },
        updateEspecialidad: async (_: any, { id_especialidad, nombre, descripcion }: { id_especialidad: string; nombre?: string; descripcion?: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const updateData: { nombre?: string; descripcion?: string } = {};
              if (nombre !== undefined) updateData.nombre = nombre;
              if (descripcion !== undefined) updateData.descripcion = descripcion;
              const especialidad = await this.especialidadService.actualizar(id_especialidad, updateData);
              if (!especialidad) {
                throw new Error('Especialidad no encontrada');
              }
              const especialidadObj = especialidad instanceof Especialidad
                ? Object.assign({}, especialidad)
                : especialidad;
              return {
                ...especialidadObj,
                _id: await this.getMongoIdAsync(especialidad.id_especialidad)
              };
            },
            'updateEspecialidad',
            { id_especialidad, nombre, descripcion }
          );
        },
        deleteEspecialidad: async (_: any, { id_especialidad }: { id_especialidad: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const eliminado = await this.especialidadService.eliminar(id_especialidad);
              if (!eliminado) {
                throw new Error('Especialidad no encontrada');
              }
              // Retornar la especialidad eliminada (necesitamos obtenerla antes de eliminar)
              const especialidad = await this.especialidadService.obtenerPorId(id_especialidad);
              if (!especialidad) {
                throw new Error('Especialidad no encontrada');
              }
              const especialidadObj = especialidad instanceof Especialidad
                ? Object.assign({}, especialidad)
                : especialidad;
              return {
                ...especialidadObj,
                _id: await this.getMongoIdAsync(especialidad.id_especialidad)
              };
            },
            'deleteEspecialidad',
            { id_especialidad }
          );
        },
      },
    };
  }

  /**
   * Obtiene el _id de MongoDB para un id_especialidad dado
   */
  private async getMongoIdAsync(id_especialidad: string): Promise<string | null> {
    try {
      const doc = await EspecialidadModel.findOne({ id_especialidad }, { _id: 1 }).lean();
      return doc?._id?.toString() || null;
    } catch (error) {
      console.error(`Error obteniendo _id para id_especialidad ${id_especialidad}:`, error);
      return null;
    }
  }

  /**
   * Obtiene los _id de MongoDB para múltiples id_especialidad en batch
   */
  private async getMongoIdsBatch(id_especialidades: string[]): Promise<Map<string, string>> {
    const idsMap = new Map<string, string>();
    try {
      const docs = await EspecialidadModel.find(
        { id_especialidad: { $in: id_especialidades } },
        { _id: 1, id_especialidad: 1 }
      ).lean();

      docs.forEach((doc: any) => {
        if (doc._id && doc.id_especialidad) {
          idsMap.set(doc.id_especialidad, doc._id.toString());
        }
      });
    } catch (error) {
      console.error('Error obteniendo _ids en batch:', error);
    }
    return idsMap;
  }
}





