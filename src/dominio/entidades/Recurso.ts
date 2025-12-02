export interface ImagenRecurso {
  id: string;
  file: string;
}

export interface Unidad {
  id?: string;
  unidad_id?: string;
  nombre: string;
  descripcion?: string;
}

export interface TipoRecurso {
  id?: string;
  nombre: string;
  codigo?: string;
}

export interface TipoCostoRecurso {
  id?: string;
  nombre: string;
  codigo?: string;
}

export interface ClasificacionRecurso {
  id?: string;
  nombre: string;
  parent_id?: string | null;
}

export interface Recurso {
  id: string;
  recurso_id?: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  cantidad?: number;
  unidad_id?: string;
  unidad?: Unidad;
  precio_actual?: number;
  tipo_recurso_id?: string;
  tipo_recurso?: TipoRecurso;
  tipo_costo_recurso_id?: string;
  tipo_costo_recurso?: TipoCostoRecurso;
  clasificacion_recurso_id?: string;
  clasificacion_recurso?: ClasificacionRecurso;
  fecha?: string;
  vigente?: boolean;
  usado?: boolean;
  imagenes?: ImagenRecurso[];
  activo_fijo?: boolean;
  combustible_ids?: string[];
  estado_activo_fijo?: string;
  fecha_checked_activo_fijo?: string;
}

export interface RecursoPaginationInfo {
  page: number;
  total: number;
  itemsPage: number;
  pages: number;
}

export interface ListRecursoPaginationResponse {
  info: RecursoPaginationInfo;
  status: string;
  message?: string;
  recursos: Recurso[];
}

export interface FilterRangeDateInput {
  startDate?: string;
  endDate?: string;
}

export interface ListRecursoPaginationInput {
  page?: number;
  itemsPage?: number;
  searchTerm?: string;
  estado_activo_fijo?: string;
  filterRangeDate?: FilterRangeDateInput;
}

