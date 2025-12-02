import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface para RECURSO_APU (documento embebido)
 * Representa un recurso dentro de un APU
 */
export interface RecursoApuDocument {
  id_recurso_apu: string;
  
  // Referencia al recurso del monolito
  recurso_id: string;
  
  // Snapshot del recurso (desnormalizado)
  codigo_recurso: string;
  descripcion: string;
  unidad_medida: string;
  tipo_recurso: 'MATERIAL' | 'MANO_OBRA' | 'EQUIPO' | 'SUBCONTRATO';
  
  // Sistema de precios simplificado: SOLO referencia
  id_precio_recurso: string | null;  // REFERENCIA al precio compartido en precio_recurso_presupuesto
  
  // Cantidades
  cuadrilla?: number;                // Solo para MANO_OBRA
  cantidad: number;
  desperdicio_porcentaje: number;
  cantidad_con_desperdicio: number;  // Calculado: cantidad × (1 + desperdicio%)
  
  // Cálculo
  parcial: number;                   // Calculado: cantidad_con_desperdicio × precio
  orden: number;
}

/**
 * Schema para APU
 * Representa el Análisis de Precio Unitario de una partida
 * 
 * Relación: PARTIDA 1:1 APU (UNIQUE)
 * Cardinalidad: Una partida tiene exactamente un APU
 */
export interface ApuDocument extends Document {
  id_apu: string;
  id_partida: string;      // UNIQUE - una partida solo tiene un APU
  id_presupuesto: string;
  id_proyecto: string;
  
  rendimiento: number;     // Unidades por día
  jornada: number;         // Horas por jornada (típicamente 8h)
  
  costo_materiales: number;
  costo_mano_obra: number;
  costo_equipos: number;
  costo_subcontratos: number;
  costo_directo: number;
  
  recursos: RecursoApuDocument[];
}

interface ApuModel extends Model<ApuDocument> {
  generateNextId(): Promise<string>;
}

// Schema para RECURSO_APU (documento embebido)
const RecursoApuSchema = new Schema<RecursoApuDocument>({
  id_recurso_apu: { type: String, required: true },
  recurso_id: { type: String, required: true },
  
  // Snapshot
  codigo_recurso: { type: String, required: true },
  descripcion: { type: String, required: true },
  unidad_medida: { type: String, required: true },
  tipo_recurso: {
    type: String,
    enum: ['MATERIAL', 'MANO_OBRA', 'EQUIPO', 'SUBCONTRATO'],
    required: true
  },
  
  // Precio - SOLO referencia al precio compartido
  id_precio_recurso: { type: String, default: null },
  
  // Cantidades
  cuadrilla: { type: Number },
  cantidad: { type: Number, required: true },
  desperdicio_porcentaje: { type: Number, default: 0 },
  cantidad_con_desperdicio: { type: Number, required: true },
  
  // Cálculo
  parcial: { type: Number, required: true },
  orden: { type: Number, required: true }
}, {
  _id: false // No crear _id para documentos embebidos
});

// Schema para APU
const ApuSchema = new Schema<ApuDocument>({
  id_apu: { type: String, required: true, unique: true },
  id_partida: { type: String, required: true },
  id_presupuesto: { type: String, required: true },
  id_proyecto: { type: String, required: true },
  
  rendimiento: { type: Number, default: 1.0 },
  jornada: { type: Number, default: 8 },
  
  costo_materiales: { type: Number, default: 0 },
  costo_mano_obra: { type: Number, default: 0 },
  costo_equipos: { type: Number, default: 0 },
  costo_subcontratos: { type: Number, default: 0 },
  costo_directo: { type: Number, default: 0 },
  
  // Recursos embebidos
  recursos: { type: [RecursoApuSchema], default: [] }
}, {
  collection: 'apu',
  timestamps: false
});

// Índices
ApuSchema.index({ id_partida: 1 }, { unique: true });
ApuSchema.index({ id_presupuesto: 1 });
ApuSchema.index({ id_proyecto: 1 });
ApuSchema.index({ id_presupuesto: 1, 'recursos.recurso_id': 1 });

ApuSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimoApu = await this.findOne({}, { id_apu: 1 })
      .sort({ id_apu: -1 })
      .lean();
    
    if (!ultimoApu) {
      return 'APU0000000001';
    }

    const ultimoNumero = parseInt(ultimoApu.id_apu.replace('APU', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `APU${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de APU:', error);
    throw new Error('Error al generar el ID del APU');
  }
};

export const ApuModel = mongoose.model<ApuDocument, ApuModel>(
  'Apu',
  ApuSchema,
  'apu'
);


