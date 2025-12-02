export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  dni: string;
  contrasenna?: string;
  cargo_id?: {
    id: string;
    nombre: string;
    descripcion?: string;
    gerarquia?: number;
  };
  rol_id?: string;
  empresa_id?: Array<{
    id: string;
    nombre_comercial: string;
    razon_social: string;
    ruc: string;
  }>;
  obra_id?: Array<{
    id: string;
    titulo: string;
    nombre: string;
    descripcion?: string;
    ubicacion?: string;
  }>;
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}

export interface UsuarioInput {
  nombres?: string;
  apellidos?: string;
  usuario?: string;
  dni?: string;
  contrasenna?: string;
  cargo_id?: string;
  rol_id?: string;
  empresa_id?: string[];
  obra_id?: string[];
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}

export interface UsuarioResponse {
  id: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  dni: string;
  cargo_id?: {
    id: string;
    nombre: string;
    descripcion?: string;
    gerarquia?: number;
  };
  rol_id?: string;
  empresa_id?: Array<{
    id: string;
    nombre_comercial: string;
    razon_social: string;
    ruc: string;
  }>;
  obra_id?: Array<{
    id: string;
    titulo: string;
    nombre: string;
    descripcion?: string;
    ubicacion?: string;
  }>;
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}

