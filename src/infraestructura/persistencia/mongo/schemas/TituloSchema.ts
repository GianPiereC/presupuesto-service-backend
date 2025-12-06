import mongoose, { Schema, Document, Model } from 'mongoose';

export interface TituloDocument extends Document {
  id_titulo: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo_padre: string | null;
  nivel: number;
  numero_item: string;
  descripcion: string;
  tipo: 'TITULO' | 'SUBTITULO';
  orden: number;
  total_parcial: number;
  id_especialidad?: string;
}

interface TituloModel extends Model<TituloDocument> {
  generateNextId(): Promise<string>;
}

const TituloSchema = new Schema<TituloDocument>({
  id_titulo: { type: String, required: true, unique: true },
  id_presupuesto: { type: String, required: true },
  id_proyecto: { type: String, required: true },
  id_titulo_padre: { type: String, default: null },
  nivel: { type: Number, required: true, default: 1 },
  numero_item: { type: String, required: true },
  descripcion: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['TITULO', 'SUBTITULO'],
    required: true 
  },
  orden: { type: Number, required: true },
  total_parcial: { type: Number, default: 0 },
  id_especialidad: { type: String }
}, {
  collection: 'titulo',
  timestamps: false
});

// Índices
TituloSchema.index({ id_presupuesto: 1 });
TituloSchema.index({ id_proyecto: 1 });
TituloSchema.index({ id_titulo_padre: 1 });
TituloSchema.index({ id_presupuesto: 1, orden: 1 });
TituloSchema.index({ id_presupuesto: 1, id_titulo_padre: 1 });
TituloSchema.index({ id_especialidad: 1 });
// Índice compuesto único: numero_item debe ser único por presupuesto (permite mismo numero_item en diferentes versiones)
TituloSchema.index({ numero_item: 1, id_proyecto: 1, id_presupuesto: 1 }, { unique: true });

TituloSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimoTitulo = await this.findOne({}, { id_titulo: 1 })
      .sort({ id_titulo: -1 })
      .lean();
    
    if (!ultimoTitulo) {
      return 'TIT0000000001';
    }

    const ultimoNumero = parseInt(ultimoTitulo.id_titulo.replace('TIT', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `TIT${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de título:', error);
    throw new Error('Error al generar el ID del título');
  }
};

export const TituloModel = mongoose.model<TituloDocument, TituloModel>(
  'Titulo',
  TituloSchema,
  'titulo'
);

