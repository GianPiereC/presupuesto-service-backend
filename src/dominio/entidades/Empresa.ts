export interface Empresa {
  id: string;
  nombre_comercial: string;
  razon_social: string;
  descripcion?: string;
  estado: string;
  regimen_fiscal?: string;
  ruc: string;
  imagenes?: string[];
  color?: string;
}

export interface EmpresaInput {
  nombre_comercial: string;
  razon_social: string;
  descripcion?: string;
  estado: string;
  regimen_fiscal?: string;
  ruc: string;
  imagenes?: string[];
  color?: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

