import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PresupuestoDocument extends Document {
  id_presupuesto: string;
  id_proyecto: string;
  costo_directo: number;
  fecha_creacion: string;
  monto_igv: number;
  monto_utilidad: number;
  nombre_presupuesto: string;
  numeracion_presupuesto?: number;
  parcial_presupuesto: number;
  observaciones: string;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  total_presupuesto: number;
  
  // ===== NUEVOS CAMPOS PARA VERSIONADO (OPCIONALES - compatibilidad con data antigua) =====
  id_grupo_version?: string;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META';
  version?: number | null;
  descripcion_version?: string;
  es_padre?: boolean;
  id_presupuesto_base?: string;
  id_presupuesto_licitacion?: string;
  version_licitacion_aprobada?: number;
  id_presupuesto_contractual?: string;
  version_contractual_aprobada?: number;
  id_presupuesto_meta_vigente?: string;
  version_meta_vigente?: number;
  es_inmutable?: boolean;
  es_activo?: boolean;
  estado?: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'vigente';
  estado_aprobacion?: {
    tipo: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META' | 'OFICIALIZAR_META' | null;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
    id_aprobacion?: string;
  };
  aprobacion_licitacion?: {
    aprobado: boolean;
    usuario_aprobador_id?: string;
    fecha_aprobacion?: string;
    comentario?: string;
    jerarquia_aprobacion?: number;
  };
  aprobacion_meta?: {
    aprobado: boolean;
    usuario_aprobador_id?: string;
    fecha_aprobacion?: string;
    comentario?: string;
    es_version_final: boolean;
  };
}

interface PresupuestoModel extends Model<PresupuestoDocument> {
  generateNextId(): Promise<string>;
  generateNextGrupoVersionId(): Promise<string>;
}

const PresupuestoSchema = new Schema<PresupuestoDocument>({
  id_presupuesto: { type: String, required: true, unique: true },
  id_proyecto: { type: String, required: true },
  nombre_presupuesto: { type: String, required: true },
  fecha_creacion: { type: String, required: true },
  
  // Campos financieros: NO requeridos, se calculan después
  // Se guardan para evitar recalcular cada vez
  costo_directo: { type: Number, default: 0 },
  monto_igv: { type: Number, default: 0 },
  monto_utilidad: { type: Number, default: 0 },
  parcial_presupuesto: { type: Number, default: 0 },
  total_presupuesto: { type: Number, default: 0 },
  ppto_base: { type: Number, default: 0 },
  ppto_oferta: { type: Number, default: 0 },
  plazo: { type: Number, default: 0 },
  
  // Porcentajes: valores por defecto razonables
  porcentaje_igv: { type: Number, default: 18 },
  porcentaje_utilidad: { type: Number, default: 0 },
  
  // Observaciones: opcional
  observaciones: { type: String, default: '' },
  
  numeracion_presupuesto: { type: Number },
  
  // ===== NUEVOS CAMPOS (OPCIONALES - compatibilidad con data antigua) =====
  id_grupo_version: { type: String },
  fase: { 
    type: String, 
    enum: ['BORRADOR', 'LICITACION', 'CONTRACTUAL', 'META']
  },
  version: { type: Number },  // null = padre, número = versión
  descripcion_version: { type: String },  // Opcional: motivo de creación de la versión
  es_padre: { type: Boolean },  // Derivado: version === null (se calcula si no existe)
  id_presupuesto_base: { type: String },
  id_presupuesto_licitacion: { type: String },
  version_licitacion_aprobada: { type: Number },
  id_presupuesto_contractual: { type: String },
  version_contractual_aprobada: { type: Number },
  id_presupuesto_meta_vigente: { type: String },
  version_meta_vigente: { type: Number },
  es_inmutable: { type: Boolean, default: false },
  es_activo: { type: Boolean, default: false },
  estado: {
    type: String,
    enum: ['borrador', 'en_revision', 'aprobado', 'rechazado', 'vigente']
  },
  estado_aprobacion: {
    tipo: {
      type: String,
      enum: ['LICITACION_A_CONTRACTUAL', 'CONTRACTUAL_A_META', 'NUEVA_VERSION_META', 'OFICIALIZAR_META', null]
    },
    estado: {
      type: String,
      enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', null]
    },
    id_aprobacion: { type: String }
  },
  aprobacion_licitacion: {
    aprobado: { type: Boolean },
    usuario_aprobador_id: { type: String },
    fecha_aprobacion: { type: String },
    comentario: { type: String },
    jerarquia_aprobacion: { type: Number }
  },
  aprobacion_meta: {
    aprobado: { type: Boolean },
    usuario_aprobador_id: { type: String },
    fecha_aprobacion: { type: String },
    comentario: { type: String },
    es_version_final: { type: Boolean }
  }
}, {
  collection: 'presupuesto',
  timestamps: false
});

// Índices existentes
PresupuestoSchema.index({ id_proyecto: 1 });
PresupuestoSchema.index({ fecha_creacion: 1 });
PresupuestoSchema.index({ nombre_presupuesto: 1 });

// ===== NUEVOS ÍNDICES PARA VERSIONADO =====
PresupuestoSchema.index({ id_proyecto: 1, fase: 1, version: 1 });
PresupuestoSchema.index({ id_grupo_version: 1, fase: 1, version: 1 });
PresupuestoSchema.index({ id_presupuesto_base: 1, fase: 1 });
PresupuestoSchema.index({ id_proyecto: 1, es_activo: 1 });
PresupuestoSchema.index({ es_activo: 1 });

PresupuestoSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimoPresupuesto = await this.findOne({}, { id_presupuesto: 1 })
      .sort({ id_presupuesto: -1 })
      .lean();
    
    if (!ultimoPresupuesto) {
      return 'PTO0000000001';
    }

    const ultimoNumero = parseInt(ultimoPresupuesto.id_presupuesto.replace('PTO', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `PTO${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID:', error);
    throw new Error('Error al generar el ID del presupuesto');
  }
};

// ===== NUEVO: Generar siguiente ID de grupo versión =====
PresupuestoSchema.statics['generateNextGrupoVersionId'] = async function(): Promise<string> {
  try {
    const ultimoGrupo = await this.findOne(
      { id_grupo_version: { $exists: true, $ne: null } },
      { id_grupo_version: 1 }
    )
      .sort({ id_grupo_version: -1 })
      .lean();
    
    if (!ultimoGrupo || !ultimoGrupo.id_grupo_version) {
      return 'GRP0000000001';
    }

    const ultimoNumero = parseInt(ultimoGrupo.id_grupo_version.replace('GRP', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `GRP${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de grupo versión:', error);
    throw new Error('Error al generar el ID del grupo versión');
  }
};

export const PresupuestoModel = mongoose.model<PresupuestoDocument, PresupuestoModel>(
  'Presupuesto',
  PresupuestoSchema,
  'presupuesto'
);

