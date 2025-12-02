import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ProyectoDocument extends Document {
  id_proyecto: string;
  id_usuario: string;
  id_infraestructura: string;
  nombre_proyecto: string;
  id_departamento: string;
  id_provincia: string;
  id_distrito: string;
  id_localidad: string | null;
  total_proyecto: number | null;
  estado: string;
  fecha_creacion: string;
  fecha_ultimo_calculo: string | null;
  cliente: string;
  empresa: string;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  jornada: number;
}

interface ProyectoModel extends Model<ProyectoDocument> {
  generateNextId(): Promise<string>;
}

const ProyectoSchema = new Schema<ProyectoDocument>({
  id_proyecto: { type: String, required: true, unique: true },
  id_usuario: { type: String, required: true },
  id_infraestructura: { type: String, required: true },
  nombre_proyecto: { type: String, required: true },
  id_departamento: { type: String, required: true },
  id_provincia: { type: String, required: true },
  id_distrito: { type: String, required: true },
  id_localidad: { type: String, default: null },
  total_proyecto: { type: Number, default: null },
  estado: { type: String, required: true },
  fecha_creacion: { type: String, required: true },
  fecha_ultimo_calculo: { type: String, default: null },
  cliente: { type: String, required: true },
  empresa: { type: String, required: true },
  plazo: { type: Number, required: true },
  ppto_base: { type: Number, required: true },
  ppto_oferta: { type: Number, required: true },
  jornada: { type: Number, required: true, default: 8 }
}, {
  collection: 'proyecto',
  timestamps: false
});

// Índices
ProyectoSchema.index({ id_usuario: 1 });
ProyectoSchema.index({ estado: 1 });
ProyectoSchema.index({ fecha_creacion: 1 });
ProyectoSchema.index({ nombre_proyecto: 1 });
ProyectoSchema.index({ id_usuario: 1, estado: 1 });
ProyectoSchema.index({ cliente: 1 });
ProyectoSchema.index({ empresa: 1 });

ProyectoSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimoProyecto = await this.findOne({}, { id_proyecto: 1 })
      .sort({ id_proyecto: -1 })
      .lean();
    
    if (!ultimoProyecto) {
      return 'PRY0000000001';
    }

    const ultimoNumero = parseInt(ultimoProyecto.id_proyecto.replace('PRY', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `PRY${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID:', error);
    throw new Error('Error al generar el ID del proyecto');
  }
};

export const ProyectoModel = mongoose.model<ProyectoDocument, ProyectoModel>(
  'Proyecto',
  ProyectoSchema,
  'proyecto'
);

