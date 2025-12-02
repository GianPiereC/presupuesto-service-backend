// ============================================================================
// DATABASE HEALTH CHECK - Health check para MongoDB
// ============================================================================

import mongoose from 'mongoose';
import { HealthCheck, HealthStatus } from './HealthCheck';

/**
 * Health check para MongoDB
 * Verifica que la conexión a la base de datos esté activa
 */
export class DatabaseHealthCheck implements HealthCheck {
  async check(): Promise<HealthStatus> {
    try {
      // Verificar estado de conexión
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          details: {
            readyState: mongoose.connection.readyState,
            message: 'MongoDB no está conectado'
          },
          timestamp: new Date()
        };
      }

      // Verificar que db existe antes de hacer ping
      if (!mongoose.connection.db) {
        return {
          status: 'unhealthy',
          details: {
            readyState: mongoose.connection.readyState,
            message: 'MongoDB db no está disponible'
          },
          timestamp: new Date()
        };
      }

      // Intentar ping a la base de datos
      await mongoose.connection.db.admin().ping();

      return {
        status: 'healthy',
        details: {
          readyState: mongoose.connection.readyState,
          database: mongoose.connection.db.databaseName,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          readyState: mongoose.connection.readyState
        },
        timestamp: new Date()
      };
    }
  }
}

