import mongoose from 'mongoose';
import { logger } from '../logging';
import { ConfigService } from './ConfigService';

export const connectDatabase = async (): Promise<void> => {
  const configService = ConfigService.getInstance();
  configService.validate(); // Validar configuración antes de conectar
  
  const connectionURL = configService.getDatabaseUrl();
  const mode = configService.getDatabaseMode();
  
  logger.info(`MongoDB conectando (${mode})`, { url: connectionURL.replace(/\/\/.*@/, '//***:***@') }); // Ocultar credenciales
  await mongoose.connect(connectionURL);
  logger.info('MongoDB conectado');
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB desconectado');
};

