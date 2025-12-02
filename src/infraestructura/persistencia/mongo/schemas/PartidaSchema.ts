import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PartidaDocument extends Document {
  id_partida: string;
  id_presupuesto: string;
  id_proyecto: string;
  id_titulo: string;
  id_partida_padre: string | null;
  nivel_partida: number;
  numero_item: string;
  codigo_partida: string;
  descripcion: string;
  unidad_medida: string;
  metrado: number;
  precio_unitario: number;
  parcial_partida: number;
  orden: number;
  estado: 'Activa' | 'Inactiva';
}

interface PartidaModel extends Model<PartidaDocument> {
  generateNextId(): Promise<string>;
}

const PartidaSchema = new Schema<PartidaDocument>({
  id_partida: { type: String, required: true, unique: true },
  id_presupuesto: { type: String, required: true },
  id_proyecto: { type: String, required: true },
  id_titulo: { type: String, required: true },
  id_partida_padre: { type: String, default: null },
  nivel_partida: { type: Number, required: true, default: 1 },
  numero_item: { type: String, required: true },
  codigo_partida: { type: String, required: true },
  descripcion: { type: String, required: true },
  unidad_medida: { type: String, required: true, default: 'und' },
  metrado: { type: Number, default: 0 },
  precio_unitario: { type: Number, default: 0 },
  parcial_partida: { type: Number, default: 0 },
  orden: { type: Number, required: true },
  estado: { 
    type: String, 
    enum: ['Activa', 'Inactiva'],
    default: 'Activa'
  }
}, {
  collection: 'partida',
  timestamps: false
});

// Índices
PartidaSchema.index({ id_presupuesto: 1 });
PartidaSchema.index({ id_proyecto: 1 });
PartidaSchema.index({ id_titulo: 1 });
PartidaSchema.index({ id_partida_padre: 1 });
PartidaSchema.index({ id_titulo: 1, orden: 1 });
PartidaSchema.index({ id_titulo: 1, id_partida_padre: 1 });
// Índice compuesto único: codigo_partida debe ser único por presupuesto (no por proyecto)
// Esto permite que diferentes versiones del mismo proyecto tengan partidas con los mismos códigos
PartidaSchema.index({ codigo_partida: 1, id_presupuesto: 1 }, { unique: true });

PartidaSchema.statics['generateNextId'] = async function(): Promise<string> {
  try {
    const ultimaPartida = await this.findOne({}, { id_partida: 1 })
      .sort({ id_partida: -1 })
      .lean();
    
    if (!ultimaPartida) {
      return 'PAR0000000001';
    }

    const ultimoNumero = parseInt(ultimaPartida.id_partida.replace('PAR', ''));
    const siguienteNumero = ultimoNumero + 1;
    return `PAR${siguienteNumero.toString().padStart(10, '0')}`;
  } catch (error) {
    console.error('Error generando ID de partida:', error);
    throw new Error('Error al generar el ID de la partida');
  }
};

export const PartidaModel = mongoose.model<PartidaDocument, PartidaModel>(
  'Partida',
  PartidaSchema,
  'partida'
);

