// ============================================================================
// SERVICE REGISTRY - Registro simple de servicios
// ============================================================================

import { ConfigService } from '../config/ConfigService';
import { logger } from '../logging';

/**
 * Interfaz para registro de servicios
 * Separa la lógica de descubrimiento de servicios de la configuración estática
 */
export interface ServiceRegistry {
  /**
   * Obtener URL de un servicio por nombre
   */
  getServiceUrl(serviceName: string): Promise<string>;

  /**
   * Registrar URL de un servicio
   */
  register(serviceName: string, url: string): Promise<void>;

  /**
   * Verificar si un servicio está registrado
   */
  isRegistered(serviceName: string): boolean;
}

/**
 * Implementación simple de Service Registry
 * Usa ConfigService para inicialización estática pero permite descubrimiento dinámico
 * Sin dependencias externas, solo configuración
 */
export class SimpleServiceRegistry implements ServiceRegistry {
  private static instance: SimpleServiceRegistry;
  private services = new Map<string, string>();
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.initializeFromConfig();
  }

  /**
   * Obtener instancia singleton del registro
   */
  static getInstance(): SimpleServiceRegistry {
    if (!SimpleServiceRegistry.instance) {
      SimpleServiceRegistry.instance = new SimpleServiceRegistry();
    }
    return SimpleServiceRegistry.instance;
  }

  /**
   * Inicializar servicios desde configuración estática
   */
  private initializeFromConfig(): void {
    try {
      const urls = this.configService.getExternalServiceUrls();
      
      // Registrar servicios conocidos con nombres estándar para base de datos
      this.services.set('inacons-backend', urls.inaconsBackendUrl);
      this.services.set('personal-backend', urls.personalBackendUrl);
      this.services.set('tareo-backend', urls.tareoBackendUrl);
      
      logger.info('ServiceRegistry inicializado desde configuración', {
        servicesCount: this.services.size
      });
    } catch (error) {
      logger.error('Error inicializando ServiceRegistry desde configuración', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obtener URL de un servicio por nombre
   */
  async getServiceUrl(serviceName: string): Promise<string> {
    const url = this.services.get(serviceName);
    
    if (!url) {
      logger.error(`Servicio no encontrado en el registro: ${serviceName}`, {
        serviceName,
        availableServices: Array.from(this.services.keys())
      });
      throw new Error(`Service ${serviceName} not found in registry.`);
    }
    
    logger.debug(`URL obtenida para el servicio ${serviceName}`, { serviceName, url });
    return url;
  }

  /**
   * Registrar URL de un servicio dinámicamente
   */
  async register(serviceName: string, url: string): Promise<void> {
    // Validar URL básica
    if (!url || !url.startsWith('http')) {
      throw new Error(`URL inválida para servicio ${serviceName}: ${url}`);
    }
    
    this.services.set(serviceName, url);
    logger.info(`Servicio registrado dinámicamente: ${serviceName} -> ${url}`, {
      serviceName,
      url
    });
  }

  /**
   * Verificar si un servicio está registrado
   */
  isRegistered(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Obtener todos los servicios registrados (útil para debugging)
   */
  getAllServices(): Map<string, string> {
    return new Map(this.services);
  }
}


