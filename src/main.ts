// ============================================================================
// PUNTO DE ENTRADA DEL MICROSERVICIO
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno - buscar .env desde la raíz del proyecto
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Importar Logger después de cargar variables de entorno
import { logger } from './infraestructura/logging';

// Variables de entorno cargadas correctamente
logger.info('Variables de entorno cargadas', { path: envPath });

// Importar y ejecutar el servidor
import { initializeServer } from './infraestructura/config/serverInit';

// Inicializar el servidor
initializeServer().catch((error: Error) => {
  logger.error('Error crítico al inicializar', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
});

