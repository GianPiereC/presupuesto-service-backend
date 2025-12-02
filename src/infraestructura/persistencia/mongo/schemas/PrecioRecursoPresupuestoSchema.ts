import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Schema para PRECIO_RECURSO_PRESUPUESTO
 * Catálogo compartido de precios de recursos por presupuesto
 * 
 * Relación: PRESUPUESTO 1:N PRECIO_RECURSO_PRESUPUESTO
 * Cardinalidad: Un presupuesto puede tener múltiples precios de recursos
 */
export interface PrecioRecursoPresupuestoDocument extends Document {
  id_precio_recurso: string;
  id_presupuesto: string;
  
  // Referencia al recurso del monolito
  recurso_id: string;
  
  // Snapshot del recurso (desnormalizado para historial)
  codigo_recurso: string;
  descripcion: string;
  unidad: string;
  tipo_recurso: 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';
  
  // Precio
  precio: number;                 // Precio del recurso para este presupuesto
  
  // Control y trazabilidad
  fecha_actualizacion: string;
  usuario_actualizo: string;
}

interface PrecioRecursoPresupuestoModel extends Model<PrecioRecursoPresupuestoDocument> {
  generateNextId(): Promise<string>;
}

const PrecioRecursoPresupuestoSchema = new Schema<PrecioRecursoPresupuestoDocument>({
  id_precio_recurso: { type: String, required: true, unique: true },
  id_presupuesto: { type: String, required: true },
  recurso_id: { type: String, required: true },
  
  // Snapshot
  codigo_recurso: { type: String, required: true },
  descripcion: { type: String, required: true },
  unidad: { type: String, required: true },
  tipo_recurso: {
    type: String,
    enum: ['MATERIAL', 'MANO_OBRA', 'EQUIPO', 'SUBCONTRATO'],
    required: true
  },
  
  // Precio
  precio: { type: Number, required: true },
  
  // Control
  fecha_actualizacion: { type: String, required: true },
  usuario_actualizo: { type: String, required: true }
}, {
  collection: 'precio_recurso_presupuesto',
  timestamps: false
});

// Índices
PrecioRecursoPresupuestoSchema.index({ id_presupuesto: 1 });
PrecioRecursoPresupuestoSchema.index({ recurso_id: 1 });
// Índice compuesto único: un recurso solo puede tener un precio por presupuesto
PrecioRecursoPresupuestoSchema.index({ id_presupuesto: 1, recurso_id: 1 }, { unique: true });
PrecioRecursoPresupuestoSchema.index({ id_presupuesto: 1, codigo_recurso: 1 });
PrecioRecursoPresupuestoSchema.index({ tipo_recurso: 1 });

PrecioRecursoPresupuestoSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimoPrecio = await this.findOne({}, { id_precio_recurso: 1 })
      .sort({ id_precio_recurso: -1 })
      .lean();
    
    if (!ultimoPrecio) {
      return 'PRP0000000001';
    }

    const ultimoNumero = parseInt(ultimoPrecio.id_precio_recurso.replace('PRP', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `PRP${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de precio recurso presupuesto:', error);
    throw new Error('Error al generar el ID del precio recurso presupuesto');
  }
};

export const PrecioRecursoPresupuestoModel = mongoose.model<PrecioRecursoPresupuestoDocument, PrecioRecursoPresupuestoModel>(
  'PrecioRecursoPresupuesto',
  PrecioRecursoPresupuestoSchema,
  'precio_recurso_presupuesto'
);


