import mongoose, { Schema, Document } from 'mongoose';

export interface UsuarioDocument extends Document {
  nombres: string;
  apellidos: string;
  usuario: string;
  dni: string;
  contrasenna?: string;
  cargo_id?: mongoose.Types.ObjectId;
  rol_id?: string;
  empresa_id?: mongoose.Types.ObjectId[];
  obra_id?: mongoose.Types.ObjectId[];
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}

const UsuarioSchema = new Schema<UsuarioDocument>({
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  usuario: { type: String, required: true, unique: true },
  dni: { type: String, required: true, unique: true },
  contrasenna: { type: String },
  cargo_id: { type: Schema.Types.ObjectId, ref: 'Cargo' },
  rol_id: { type: String },
  empresa_id: [{ type: Schema.Types.ObjectId, ref: 'Empresa' }],
  obra_id: [{ type: Schema.Types.ObjectId, ref: 'Obra' }],
  telefono: { type: String },
  firma: { type: String },
  foto_perfil: { type: String },
  email: { type: String }
}, { 
  collection: 'usuario',
  timestamps: true 
});

export const UsuarioModel = mongoose.model<UsuarioDocument>('Usuario', UsuarioSchema, 'usuario');

