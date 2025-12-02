import { IResolvers } from '@graphql-tools/utils';
import { BaseService } from '../../../aplicacion/servicios/BaseService';
import { PaginationInput, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';
import { ErrorHandler } from './ErrorHandler';
import { GraphQLIdArgs, GraphQLDataArgs, GraphQLUpdateDataArgs } from '../types/GraphQLTypes';

/**
 * Resolver base genérico que genera resolvers GraphQL automáticamente
 * Reduce la duplicación de código en resolvers simples
 */
export abstract class BaseResolver<T> {
  constructor(protected service: BaseService<T>) {}

  /**
   * Genera resolvers GraphQL automáticamente basado en el nombre de la entidad
   */
  getResolvers(): IResolvers {
    const entityName = this.getEntityName();
    const entityNameLower = entityName.toLowerCase();
    const entityNamePlural = this.getEntityNamePlural();

    return {
      Query: {
        [`list${entityNamePlural}`]: async () => {
          return await this.handleError(
            async () => {
              const result = await this.service.list();
              return this.mapEntitiesToGraphQL(result);
            },
            `list${entityNamePlural}`
          );
        },
        [`get${entityName}ById`]: async (_: unknown, args: GraphQLIdArgs) => {
          const { id } = args;
          return await this.handleError(
            async () => {
              const result = await this.service.findById(id);
              return result ? this.mapEntityToGraphQL(result) : null;
            },
            `get${entityName}ById`,
            { id }
          );
        },
        [`list${entityNamePlural}Paginated`]: async (_: unknown, args: { pagination: PaginationInput }) => {
          const { pagination } = args;
          return await this.handleError(
            async () => {
              const result = await this.service.listPaginated(pagination);
              return {
                ...result,
                data: this.mapEntitiesToGraphQL(result.data)
              };
            },
            `list${entityNamePlural}Paginated`
          );
        },
        [`list${entityNamePlural}WithFilters`]: async (_: unknown, args: { filters: FilterInput[]; pagination?: PaginationInput }) => {
          const { filters, pagination } = args;
          return await this.handleError(
            async () => {
              const filterObject = this.convertFiltersToObject(filters);
              const result = await this.service.listWithFilters(filterObject as FilterInput, pagination);
              return {
                ...result,
                data: this.mapEntitiesToGraphQL(result.data)
              };
            },
            `list${entityNamePlural}WithFilters`
          );
        },
        [`search${entityNamePlural}`]: async (_: unknown, args: { search: SearchInput; pagination?: PaginationInput }) => {
          const { search, pagination } = args;
          return await this.handleError(
            async () => {
              const result = await this.service.search(search, pagination);
              return {
                ...result,
                data: this.mapEntitiesToGraphQL(result.data)
              };
            },
            `search${entityNamePlural}`
          );
        },
        [`count${entityNamePlural}`]: async (_: unknown, args: { filters?: FilterInput[] }) => {
          const { filters } = args;
          return await this.handleError(
            async () => {
              const filterObject = filters ? this.convertFiltersToObject(filters) : undefined;
              return await this.service.count(filterObject as FilterInput | undefined);
            },
            `count${entityNamePlural}`
          );
        }
      },
      Mutation: {
        [`add${entityName}`]: async (_: unknown, args: GraphQLDataArgs<Record<string, unknown>>) => {
          const { data } = args;
          return await this.handleError(
            async () => {
              const result = await this.service.create(data as Partial<T>);
              return this.mapEntityToGraphQL(result);
            },
            `add${entityName}`
          );
        },
        [`update${entityName}`]: async (_: unknown, args: GraphQLUpdateDataArgs<Record<string, unknown>>) => {
          const { id, data } = args;
          return await this.handleError(
            async () => {
              const result = await this.service.update(id, data as Partial<T>);
              return result ? this.mapEntityToGraphQL(result) : null;
            },
            `update${entityName}`,
            { id }
          );
        },
        [`delete${entityName}`]: async (_: unknown, args: GraphQLIdArgs) => {
          const { id } = args;
          return await this.handleError(
            async () => {
              const success = await this.service.delete(id);
              return { 
                success, 
                message: success ? `${entityName} eliminado correctamente` : `No se pudo eliminar el ${entityNameLower}` 
              };
            },
            `delete${entityName}`,
            { id }
          );
        }
      }
    };
  }

  /**
   * Manejo centralizado de errores para todos los resolvers
   * @param fn - Función asíncrona a ejecutar
   * @param operationName - Nombre de la operación para logging
   * @param context - Contexto adicional para logging
   * @returns Resultado de la función
   */
  protected async handleError<TResult>(
    fn: () => Promise<TResult>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<TResult> {
    return ErrorHandler.handleError(fn, operationName, context);
  }

  /**
   * Convierte array de filtros GraphQL a objeto para el repositorio
   * @param filters - Array de filtros GraphQL
   * @returns Objeto de filtros para el repositorio
   */
  protected convertFiltersToObject(filters: FilterInput[]): Record<string, unknown> {
    const filterObject: Record<string, unknown> = {};
    
    filters.forEach(filter => {
      const field = filter['field'];
      if (typeof field === 'string') {
        if (filter['operator'] && filter['operator'] !== 'eq') {
          filterObject[field] = {
            operator: filter['operator'],
            value: filter['value']
          };
        } else {
          filterObject[field] = filter['value'];
        }
      }
    });
    
    return filterObject;
  }

  /**
   * Método abstracto que debe ser implementado para obtener el nombre de la entidad
   * Ejemplo: "Acceso", "Sistema", "Permiso"
   * @returns Nombre de la entidad
   */
  protected abstract getEntityName(): string;

  /**
   * Genera el nombre plural de la entidad
   * Por defecto agrega 's', pero puede ser sobrescrito para casos especiales
   * @returns Nombre plural de la entidad
   */
  protected getEntityNamePlural(): string {
    const name = this.getEntityName();
    return name.endsWith('s') ? name : `${name}s`;
  }

  /**
   * Mapea una entidad a formato GraphQL
   * Puede ser sobrescrito para transformaciones específicas
   * @param entity - Entidad de dominio a mapear
   * @returns Entidad en formato GraphQL
   */
  protected mapEntityToGraphQL(entity: T): Record<string, unknown> {
    return entity as unknown as Record<string, unknown>;
  }

  /**
   * Mapea múltiples entidades a formato GraphQL
   * @param entities - Array de entidades de dominio
   * @returns Array de entidades en formato GraphQL
   */
  protected mapEntitiesToGraphQL(entities: T[]): Record<string, unknown>[] {
    return entities.map(entity => this.mapEntityToGraphQL(entity));
  }
}

