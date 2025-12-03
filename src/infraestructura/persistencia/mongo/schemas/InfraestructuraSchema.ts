import mongoose, { Schema, Document, Model } from 'mongoose';

export interface InfraestructuraDocument extends Document {
  id_infraestructura: string;
  nombre_infraestructura: string;
  tipo_infraestructura: string;
  descripcion?: string;
}

interface InfraestructuraModel extends Model<InfraestructuraDocument> {
  generateNextId(): Promise<string>;
}

const InfraestructuraSchema = new Schema<InfraestructuraDocument>({
  id_infraestructura: { type: String, required: true, unique: true },
  nombre_infraestructura: { type: String, required: true },
  tipo_infraestructura: { type: String, required: true },
  descripcion: { type: String }
}, {
  collection: 'infraestructura',
  timestamps: false
});

// Índices
InfraestructuraSchema.index({ id_infraestructura: 1 }, { unique: true });
InfraestructuraSchema.index({ nombre_infraestructura: 1 });

InfraestructuraSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const lastDoc = await this.findOne({}, { id_infraestructura: 1 })
      .sort({ id_infraestructura: -1 })
      .lean();
    
    if (!lastDoc || !lastDoc.id_infraestructura) {
      return 'INF0000000001';
    }
    
    const lastNumber = parseInt(lastDoc.id_infraestructura.replace('INF', ''), 10);
    const nextNumber = lastNumber + 1;
    return `INF${nextNumber.toString().padStart(10, '0')}`;
  } catch (error) {
    throw new Error('Error al generar ID de infraestructura');
  }
};

export const InfraestructuraModel = mongoose.model<InfraestructuraDocument, InfraestructuraModel>('Infraestructura', InfraestructuraSchema);

