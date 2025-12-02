import { IResolvers } from '@graphql-tools/utils';
import { RoleService } from '../../../aplicacion/servicios/RoleService';
import { MenuPermission, Role } from '../../../dominio/entidades/Auth';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de roles que extiende BaseResolver para mantener consistencia
 * Sobrescribe getResolvers() para implementar métodos específicos de roles
 */
export class RoleResolver extends BaseResolver<Role> {
  constructor(private readonly roleService: RoleService) {
    super(roleService);
  }

  /**
   * Sobrescribe getResolvers() para implementar métodos específicos de roles
   */
  override getResolvers(): IResolvers {
    return {
      Query: {
        listRoles: async () => {
          return await ErrorHandler.handleError(
            async () => await this.roleService.listRoles(),
            'listRoles'
          );
        },
        getRole: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.roleService.getRole(id),
            'getRole',
            { id }
          );
        }
      },
      Mutation: {
        addRole: async (_: any, { nombre, descripcion, menusPermissions }: { nombre: string, descripcion: string, menusPermissions: MenuPermission[] }) => {
          return await ErrorHandler.handleError(
            async () => await this.roleService.addRole(nombre, descripcion, menusPermissions),
            'addRole'
          );
        },
        updateRole: async (_: any, { id, nombre, descripcion, menusPermissions }: { id: string, nombre: string, descripcion: string, menusPermissions: MenuPermission[] }) => {
          return await ErrorHandler.handleError(
            async () => await this.roleService.updateRole(id, nombre, descripcion, menusPermissions),
            'updateRole',
            { id }
          );
        },
        deleteRole: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.roleService.deleteRole(id),
            'deleteRole',
            { id }
          );
        }
      }
    };
  }

  /**
   * Método abstracto requerido por BaseResolver
   */
  protected getEntityName(): string {
    return 'Role';
  }
}

