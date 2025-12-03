import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AprobacionPresupuestoDocument extends Document {
  id_aprobacion: string;
  id_presupuesto: string;
  id_grupo_version?: string;
  id_proyecto: string;
  tipo_aprobacion: 'LICITACION_A_CONTRACTUAL' | 'CONTRACTUAL_A_META' | 'NUEVA_VERSION_META';
  usuario_solicitante_id: string;
  usuario_aprobador_id?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
  fecha_solicitud: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  fecha_vencimiento?: string;
  comentario_solicitud?: string;
  comentario_aprobacion?: string;
  comentario_rechazo?: string;
  nivel_jerarquia?: number;
  requiere_multiple_aprobacion?: boolean;
  orden_aprobacion?: number;
  version_presupuesto?: number;
  monto_presupuesto?: number;
  es_urgente?: boolean;
}

interface AprobacionPresupuestoModel extends Model<AprobacionPresupuestoDocument> {
  generateNextId(): Promise<string>;
}

const AprobacionPresupuestoSchema = new Schema<AprobacionPresupuestoDocument>({
  id_aprobacion: { type: String, required: true, unique: true },
  id_presupuesto: { type: String, required: true },
  id_grupo_version: { type: String },
  id_proyecto: { type: String, required: true },
  tipo_aprobacion: {
    type: String,
    enum: ['LICITACION_A_CONTRACTUAL', 'CONTRACTUAL_A_META', 'NUEVA_VERSION_META'],
    required: true
  },
  usuario_solicitante_id: { type: String, required: true },
  usuario_aprobador_id: { type: String },
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO'],
    default: 'PENDIENTE'
  },
  fecha_solicitud: { type: String, required: true },
  fecha_aprobacion: { type: String },
  fecha_rechazo: { type: String },
  fecha_vencimiento: { type: String },
  comentario_solicitud: { type: String },
  comentario_aprobacion: { type: String },
  comentario_rechazo: { type: String },
  nivel_jerarquia: { type: Number },
  requiere_multiple_aprobacion: { type: Boolean, default: false },
  orden_aprobacion: { type: Number },
  version_presupuesto: { type: Number },
  monto_presupuesto: { type: Number },
  es_urgente: { type: Boolean, default: false }
}, {
  collection: 'aprobacion_presupuesto',
  timestamps: true
});

// Índices para optimizar consultas
AprobacionPresupuestoSchema.index({ id_presupuesto: 1, estado: 1 });
AprobacionPresupuestoSchema.index({ id_proyecto: 1, estado: 1 });
AprobacionPresupuestoSchema.index({ usuario_aprobador_id: 1, estado: 1 });
AprobacionPresupuestoSchema.index({ usuario_solicitante_id: 1 });
AprobacionPresupuestoSchema.index({ tipo_aprobacion: 1, estado: 1 });
AprobacionPresupuestoSchema.index({ fecha_solicitud: -1 });
AprobacionPresupuestoSchema.index({ id_grupo_version: 1 });

// Método estático para generar siguiente ID
AprobacionPresupuestoSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimaAprobacion = await this.findOne({}, { id_aprobacion: 1 })
      .sort({ id_aprobacion: -1 })
      .lean();
    
    if (!ultimaAprobacion) {
      return 'APB0000000001';
    }

    const ultimoNumero = parseInt(ultimaAprobacion.id_aprobacion.replace('APB', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `APB${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de aprobación:', error);
    throw new Error('Error al generar el ID de aprobación');
  }
};

export const AprobacionPresupuestoModel = mongoose.model<AprobacionPresupuestoDocument, AprobacionPresupuestoModel>(
  'AprobacionPresupuesto',
  AprobacionPresupuestoSchema,
  'aprobacion_presupuesto'
);

