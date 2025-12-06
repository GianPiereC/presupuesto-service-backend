import mongoose, { Schema, Document, Model } from 'mongoose';

export interface EspecialidadDocument extends Document {
  id_especialidad: string;
  nombre: string;
  descripcion: string;
}

interface EspecialidadModel extends Model<EspecialidadDocument> {
  generateNextId(): Promise<string>;
}

const EspecialidadSchema = new Schema<EspecialidadDocument>({
  id_especialidad: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true }
}, {
  collection: 'especialidad',
  timestamps: false
});

// Índices
EspecialidadSchema.index({ nombre: 1 });
EspecialidadSchema.index({ id_especialidad: 1 });

EspecialidadSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimaEspecialidad = await this.findOne({}, { id_especialidad: 1 })
      .sort({ id_especialidad: -1 })
      .lean();
    
    if (!ultimaEspecialidad) {
      return 'ESP0000000001';
    }

    const ultimoNumero = parseInt(ultimaEspecialidad.id_especialidad.replace('ESP', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `ESP${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de especialidad:', error);
    throw new Error('Error al generar el ID de la especialidad');
  }
};

export const EspecialidadModel = mongoose.model<EspecialidadDocument, EspecialidadModel>(
  'Especialidad',
  EspecialidadSchema,
  'especialidad'
);




