// ============================================================================
// CONFIG SERVICE - Servicio centralizado de configuración
// ============================================================================

import { ValidationException } from '../../dominio/exceptions/DomainException';

/**
 * Servicio centralizado para gestionar configuración
 * Lee variables de entorno, valida y proporciona acceso tipado
 * Implementación nativa usando process.env y dotenv (ya incluido)
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: Map<string, string> = new Map();

  private constructor() {
    this.loadConfig();
  }

  /**
   * Obtener instancia singleton del ConfigService
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Cargar configuración desde variables de entorno
   */
  private loadConfig(): void {
    // Cargar todas las variables de entorno relevantes
    const envVars = [
      'PORT',
      'NODE_ENV',
      'DB_MODE',
      'DATABASE_URL',
      'DATABASE_URL_LOCAL',
      'DATABASE_URL_DEV',
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_BUCKET',
      'GOOGLE_CLOUD_KEY_FILE',
      'INACONS_BACKEND_URL',
      'PERSONAL_BACKEND_URL'
    ];

    envVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.config.set(envVar, value);
      }
    });
  }

  /**
   * Obtener valor de configuración
   */
  get(key: string): string | undefined {
    return this.config.get(key);
  }

  /**
   * Obtener valor de configuración con valor por defecto
   */
  getOrDefault(key: string, defaultValue: string): string {
    return this.config.get(key) || defaultValue;
  }

  /**
   * Obtener valor de configuración requerido (lanza error si no existe)
   */
  getRequired(key: string): string {
    const value = this.config.get(key);
    if (!value) {
      throw new ValidationException(`Configuración requerida no encontrada: ${key}`, key);
    }
    return value;
  }

  /**
   * Obtener número de configuración
   */
  getNumber(key: string, defaultValue?: number): number {
    const value = this.config.get(key);
    if (!value) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new ValidationException(`Configuración numérica no encontrada: ${key}`, key);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new ValidationException(`Configuración ${key} no es un número válido: ${value}`, key);
    }
    return num;
  }

  /**
   * Obtener booleano de configuración
   */
  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.config.get(key);
    if (!value) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return false;
    }
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Obtener URL del servidor
   */
  getServerPort(): number {
    return this.getNumber('PORT', 8080);
  }

  /**
   * Obtener modo de base de datos
   */
  getDatabaseMode(): string {
    return this.getOrDefault('DB_MODE', 'dev');
  }

  /**
   * Obtener URL de base de datos según modo
   */
  getDatabaseUrl(): string {
    const mode = this.getDatabaseMode();
    
    if (mode === 'local') {
      return this.getRequired('DATABASE_URL_LOCAL');
    }
    
    if (mode === 'produccion') {
      return this.getRequired('DATABASE_URL');
    }
    
    // Default: dev
    return this.getRequired('DATABASE_URL_DEV');
  }

  /**
   * Obtener configuración de Google Cloud Storage
   */
  getGCPConfig(): {
    projectId: string;
    bucket: string;
    keyFile: string;
  } {
    return {
      projectId: this.getOrDefault('GOOGLE_CLOUD_PROJECT_ID', 'primeval-aspect-448817-i2'),
      bucket: this.getOrDefault('GOOGLE_CLOUD_BUCKET', 'primeval-aspect-448817-i2_cloudbuild'),
      keyFile: this.getOrDefault('GOOGLE_CLOUD_KEY_FILE', './src/infraestructura/config/gcp-key.json')
    };
  }

  /**
   * Obtener URLs de servicios externos
   */
  getExternalServiceUrls(): {
    inaconsBackendUrl: string;
    personalBackendUrl: string;
    tareoBackendUrl: string;
  } {
    return {
      inaconsBackendUrl: this.getOrDefault(
        'INACONS_BACKEND_URL',
        'https://my-app-424951913083.southamerica-east1.run.app/graphql'
      ),
      personalBackendUrl: this.getOrDefault(
        'PERSONAL_BACKEND_URL',
        'https://personal-production-1128.up.railway.app/graphql'
      ),
      tareoBackendUrl: this.getOrDefault(
        'TAREO_BACKEND_URL',
        'https://kapo-tareo-bakend-production.up.railway.app/graphql'
      )
    };
  }

  /**
   * Obtener entorno de ejecución
   */
  getNodeEnv(): string {
    return this.getOrDefault('NODE_ENV', 'development');
  }

  /**
   * Verificar si está en producción
   */
  isProduction(): boolean {
    return this.getNodeEnv() === 'production';
  }

  /**
   * Verificar si está en desarrollo
   */
  isDevelopment(): boolean {
    return this.getNodeEnv() === 'development';
  }

  /**
   * Validar configuración requerida
   */
  validate(): void {
    const required = ['DATABASE_URL_DEV'];
    const mode = this.getDatabaseMode();
    
    if (mode === 'local') {
      required.push('DATABASE_URL_LOCAL');
    } else if (mode === 'produccion') {
      required.push('DATABASE_URL');
    }

    const missing: string[] = [];
    required.forEach(key => {
      if (!this.config.has(key)) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      throw new ValidationException(`Configuración faltante: ${missing.join(', ')}`);
    }
  }
}

