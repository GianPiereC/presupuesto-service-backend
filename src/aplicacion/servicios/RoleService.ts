import { Role, MenuPermission } from '../../dominio/entidades/Auth';
import { IAuthRepository } from '../../dominio/repositorios/IAuthRepository';
import { BaseService } from './BaseService';
import { IBaseRepository } from '../../dominio/repositorios/IBaseRepository';

/**
 * Servicio de roles que extiende BaseService para mantener consistencia
 * Implementa métodos específicos para gestión de roles
 */
export class RoleService extends BaseService<Role> {
  // @ts-ignore - Reservado para uso futuro cuando IAuthRepository tenga métodos de roles
  private readonly _authRepository: IAuthRepository;
  
  constructor(repository: IAuthRepository) {
    // BaseService requiere IBaseRepository, creamos un adaptador mínimo
    super({} as IBaseRepository<Role>);
    this._authRepository = repository;
  }

  async listRoles(): Promise<Role[]> {
    // TODO: Implementar cuando IAuthRepository tenga método para listar roles
    // Por ahora retornamos array vacío para evitar errores de compilación
    return [];
  }

  async getRole(_id: string): Promise<Role | null> {
    // TODO: Implementar cuando IAuthRepository tenga método para obtener rol
    // Por ahora retornamos null para evitar errores de compilación
    return null;
  }

  async addRole(_nombre: string, _descripcion: string, _menusPermissions: MenuPermission[]): Promise<Role> {
    // TODO: Implementar cuando IAuthRepository tenga método para crear rol
    // Por ahora lanzamos error para indicar que no está implementado
    throw new Error('Método addRole no implementado aún');
  }

  async updateRole(_id: string, _nombre: string, _descripcion: string, _menusPermissions: MenuPermission[]): Promise<Role> {
    // TODO: Implementar cuando IAuthRepository tenga método para actualizar rol
    // Por ahora lanzamos error para indicar que no está implementado
    throw new Error('Método updateRole no implementado aún');
  }

  async deleteRole(_id: string): Promise<Role> {
    // TODO: Implementar cuando IAuthRepository tenga método para eliminar rol
    // Por ahora lanzamos error para indicar que no está implementado
    throw new Error('Método deleteRole no implementado aún');
  }
}

