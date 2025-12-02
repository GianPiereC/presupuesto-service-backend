// ============================================================================
// ENTIDAD DE DOMINIO
// ============================================================================

export interface Role {
  id: string;
  nombre: string;
  descripcion: string;
  menusPermissions: MenuPermission[];
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}

export interface MenuPermission {
  menuID: string;
  permissions: Permission;
}

export interface Permission {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface LoginResponse {
  id: string;
  token: string;
  usuario: string;
  nombresA: string;
  role: Pick<Role, 'id' | 'nombre'>;
}

export interface LoginRequest {
  usuario: string;
  contrasenna: string;
}

