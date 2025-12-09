// ============================================================================
// FACTORY PATTERN OPTIMIZADO - Configuración Declarativa de Resolvers
// ============================================================================

import { scalarResolvers } from './scalars';

// Importar resolvers de autenticación
import { AuthResolver } from './AuthResolver';
import { UsuarioResolver } from './UsuarioResolver';
import { EmpresaResolver } from './EmpresaResolver';

// Importar resolvers de ubicación
import { DepartamentoResolver } from './DepartamentoResolver';
import { ProvinciaResolver } from './ProvinciaResolver';
import { DistritoResolver } from './DistritoResolver';
import { LocalidadResolver } from './LocalidadResolver';
import { InfraestructuraResolver } from './InfraestructuraResolver';

// Importar resolvers de presupuestos
import { PresupuestoResolver } from './PresupuestoResolver';
import { ProyectoResolver } from './ProyectoResolver';
import { TituloResolver } from './TituloResolver';
import { PartidaResolver } from './PartidaResolver';
import { EstructuraBatchResolver } from './EstructuraBatchResolver';
import { RecursoResolver } from './RecursoResolver';
import { PrecioRecursoPresupuestoResolver } from './PrecioRecursoPresupuestoResolver';
import { ApuResolver } from './ApuResolver';
import { AprobacionPresupuestoResolver } from './AprobacionPresupuestoResolver';
import { EspecialidadResolver } from './EspecialidadResolver';

// Importar servicios
import { AuthService } from '../../../aplicacion/servicios/AuthService';
import { UsuarioService } from '../../../aplicacion/servicios/UsuarioService';
import { EmpresaService } from '../../../aplicacion/servicios/EmpresaService';
import { DepartamentoService } from '../../../aplicacion/servicios/DepartamentoService';
import { ProvinciaService } from '../../../aplicacion/servicios/ProvinciaService';
import { DistritoService } from '../../../aplicacion/servicios/DistritoService';
import { LocalidadService } from '../../../aplicacion/servicios/LocalidadService';
import { InfraestructuraService } from '../../../aplicacion/servicios/InfraestructuraService';
import { PresupuestoService } from '../../../aplicacion/servicios/PresupuestoService';
import { VersionadoPresupuestoService } from '../../../aplicacion/servicios/VersionadoPresupuestoService';
import { AprobacionPresupuestoService } from '../../../aplicacion/servicios/AprobacionPresupuestoService';
import { ProyectoService } from '../../../aplicacion/servicios/ProyectoService';
import { TituloService } from '../../../aplicacion/servicios/TituloService';
import { PartidaService } from '../../../aplicacion/servicios/PartidaService';
import { EstructuraPresupuestoService } from '../../../aplicacion/servicios/EstructuraPresupuestoService';
import { EstructuraBatchService } from '../../../aplicacion/servicios/EstructuraBatchService';
import { RecursoService } from '../../../aplicacion/servicios/RecursoService';
import { PrecioRecursoPresupuestoService } from '../../../aplicacion/servicios/PrecioRecursoPresupuestoService';
import { ApuService } from '../../../aplicacion/servicios/ApuService';
import { RecalculoTotalesService } from '../../../aplicacion/servicios/RecalculoTotalesService';
import { EspecialidadService } from '../../../aplicacion/servicios/EspecialidadService';

// Importar repositorios HTTP
import { HttpAuthRepository } from '../../persistencia/http/HttpAuthRepository';
import { HttpEmpresaRepository } from '../../persistencia/http/HttpEmpresaRepository';
import { HttpDepartamentoRepository } from '../../persistencia/http/HttpDepartamentoRepository';
import { HttpProvinciaRepository } from '../../persistencia/http/HttpProvinciaRepository';
import { HttpDistritoRepository } from '../../persistencia/http/HttpDistritoRepository';
import { HttpLocalidadRepository } from '../../persistencia/http/HttpLocalidadRepository';
import { HttpInfraestructuraRepository } from '../../persistencia/http/HttpInfraestructuraRepository';
import { HttpRecursoRepository } from '../../persistencia/http/HttpRecursoRepository';

// Importar repositorios MongoDB
import { PresupuestoMongoRepository } from '../../persistencia/mongo/PresupuestoMongoRepository';
import { ProyectoMongoRepository } from '../../persistencia/mongo/ProyectoMongoRepository';
import { TituloMongoRepository } from '../../persistencia/mongo/TituloMongoRepository';
import { PartidaMongoRepository } from '../../persistencia/mongo/PartidaMongoRepository';
import { PrecioRecursoPresupuestoMongoRepository } from '../../persistencia/mongo/PrecioRecursoPresupuestoMongoRepository';
import { ApuMongoRepository } from '../../persistencia/mongo/ApuMongoRepository';
import { AprobacionPresupuestoMongoRepository } from '../../persistencia/mongo/AprobacionPresupuestoMongoRepository';
import { EspecialidadMongoRepository } from '../../persistencia/mongo/EspecialidadMongoRepository';

// Importar Container para DI
import { Container } from '../../di/Container';

// Importar Logger
import { logger } from '../../logging';

/**
 * Factory para crear resolvers de autenticación
 * Mantiene solo lo esencial: Auth, Usuario y Role
 */
export class ResolverFactory {
  /**
   * Container para inyección de dependencias
   */
  private static container: Container | null = null;

  /**
   * Obtener instancia del Container e inicializar dependencias
   */
  private static getContainer(): Container {
    if (!this.container) {
      this.container = Container.getInstance();
      this.initializeContainer();
    }
    return this.container;
  }

  /**
   * Inicializar todas las dependencias en el Container
   */
  private static initializeContainer(): void {
    const container = this.getContainer();

    // Registrar HttpAuthRepository
    container.register('HttpAuthRepository', () => new HttpAuthRepository(), true);

    // Registrar HttpEmpresaRepository
    container.register('HttpEmpresaRepository', () => new HttpEmpresaRepository(), true);

    // Registrar repositorios HTTP de ubicación
    container.register('HttpDepartamentoRepository', () => new HttpDepartamentoRepository(), true);
    container.register('HttpProvinciaRepository', () => new HttpProvinciaRepository(), true);
    container.register('HttpDistritoRepository', () => new HttpDistritoRepository(), true);
    container.register('HttpLocalidadRepository', () => new HttpLocalidadRepository(), true);

    // Registrar AuthService
    container.register('AuthService', (c) => {
      const httpAuthRepo = c.resolve<HttpAuthRepository>('HttpAuthRepository');
      return new AuthService(httpAuthRepo);
    }, true);

    // Registrar UsuarioService
    container.register('UsuarioService', (c) => {
      const httpAuthRepo = c.resolve<HttpAuthRepository>('HttpAuthRepository');
      return new UsuarioService(httpAuthRepo);
    }, true);

    // Registrar EmpresaService
    container.register('EmpresaService', (c) => {
      const httpEmpresaRepo = c.resolve<HttpEmpresaRepository>('HttpEmpresaRepository');
      return new EmpresaService(httpEmpresaRepo);
    }, true);

    // Registrar servicios de ubicación
    container.register('DepartamentoService', (c) => {
      const httpDepartamentoRepo = c.resolve<HttpDepartamentoRepository>('HttpDepartamentoRepository');
      return new DepartamentoService(httpDepartamentoRepo);
    }, true);

    container.register('ProvinciaService', (c) => {
      const httpProvinciaRepo = c.resolve<HttpProvinciaRepository>('HttpProvinciaRepository');
      return new ProvinciaService(httpProvinciaRepo);
    }, true);

    container.register('DistritoService', (c) => {
      const httpDistritoRepo = c.resolve<HttpDistritoRepository>('HttpDistritoRepository');
      return new DistritoService(httpDistritoRepo);
    }, true);

    container.register('LocalidadService', (c) => {
      const httpLocalidadRepo = c.resolve<HttpLocalidadRepository>('HttpLocalidadRepository');
      return new LocalidadService(httpLocalidadRepo);
    }, true);

    // Registrar HttpInfraestructuraRepository
    container.register('HttpInfraestructuraRepository', () => new HttpInfraestructuraRepository(), true);

    // Registrar InfraestructuraService
    container.register('InfraestructuraService', (c) => {
      const httpInfraestructuraRepo = c.resolve<HttpInfraestructuraRepository>('HttpInfraestructuraRepository');
      return new InfraestructuraService(httpInfraestructuraRepo);
    }, true);

    // Registrar HttpRecursoRepository
    container.register('HttpRecursoRepository', () => new HttpRecursoRepository(), true);

    // Registrar RecursoService
    container.register('RecursoService', (c) => {
      const httpRecursoRepo = c.resolve<HttpRecursoRepository>('HttpRecursoRepository');
      return new RecursoService(httpRecursoRepo);
    }, true);

    // Registrar AuthResolver
    container.register('AuthResolver', (c) => {
      const authService = c.resolve<AuthService>('AuthService');
      return new AuthResolver(authService);
    }, true);

    // Registrar UsuarioResolver
    container.register('UsuarioResolver', (c) => {
      const usuarioService = c.resolve<UsuarioService>('UsuarioService');
      return new UsuarioResolver(usuarioService);
    }, true);

    // Registrar EmpresaResolver
    container.register('EmpresaResolver', (c) => {
      const empresaService = c.resolve<EmpresaService>('EmpresaService');
      return new EmpresaResolver(empresaService);
    }, true);

    // Registrar resolvers de ubicación
    container.register('DepartamentoResolver', (c) => {
      const departamentoService = c.resolve<DepartamentoService>('DepartamentoService');
      return new DepartamentoResolver(departamentoService);
    }, true);

    container.register('ProvinciaResolver', (c) => {
      const provinciaService = c.resolve<ProvinciaService>('ProvinciaService');
      return new ProvinciaResolver(provinciaService);
    }, true);

    container.register('DistritoResolver', (c) => {
      const distritoService = c.resolve<DistritoService>('DistritoService');
      return new DistritoResolver(distritoService);
    }, true);

    container.register('LocalidadResolver', (c) => {
      const localidadService = c.resolve<LocalidadService>('LocalidadService');
      return new LocalidadResolver(localidadService);
    }, true);

    // Registrar InfraestructuraResolver
    container.register('InfraestructuraResolver', (c) => {
      const infraestructuraService = c.resolve<InfraestructuraService>('InfraestructuraService');
      return new InfraestructuraResolver(infraestructuraService);
    }, true);

    // Registrar RecursoResolver
    container.register('RecursoResolver', (c) => {
      const recursoService = c.resolve<RecursoService>('RecursoService');
      return new RecursoResolver(recursoService);
    }, true);

    // ========================================================================
    // REGISTRO DE REPOSITORIOS MONGODB DE PRESUPUESTOS
    // ========================================================================
    
    // Registrar PresupuestoMongoRepository
    container.register('PresupuestoMongoRepository', () => new PresupuestoMongoRepository(), true);

    // Registrar ProyectoMongoRepository
    container.register('ProyectoMongoRepository', () => new ProyectoMongoRepository(), true);

    // Registrar TituloMongoRepository
    container.register('TituloMongoRepository', () => new TituloMongoRepository(), true);

    // Registrar PartidaMongoRepository
    container.register('PartidaMongoRepository', () => new PartidaMongoRepository(), true);

    // Registrar EspecialidadMongoRepository
    container.register('EspecialidadMongoRepository', () => new EspecialidadMongoRepository(), true);

    // ========================================================================
    // REGISTRO DE SERVICIOS DE PRESUPUESTOS
    // ========================================================================

    // Registrar PresupuestoService
    container.register('PresupuestoService', (c) => {
      const presupuestoRepo = c.resolve<PresupuestoMongoRepository>('PresupuestoMongoRepository');
      return new PresupuestoService(presupuestoRepo);
    }, true);

    // Registrar AprobacionPresupuestoMongoRepository
    container.register('AprobacionPresupuestoMongoRepository', () => new AprobacionPresupuestoMongoRepository(), true);

    // Registrar VersionadoPresupuestoService
    container.register('VersionadoPresupuestoService', (c) => {
      const presupuestoRepo = c.resolve<PresupuestoMongoRepository>('PresupuestoMongoRepository');
      const tituloRepo = c.resolve<TituloMongoRepository>('TituloMongoRepository');
      const partidaRepo = c.resolve<PartidaMongoRepository>('PartidaMongoRepository');
      const apuRepo = c.resolve<ApuMongoRepository>('ApuMongoRepository');
      const precioRecursoPresupuestoRepo = c.resolve<PrecioRecursoPresupuestoMongoRepository>('PrecioRecursoPresupuestoMongoRepository');
      const aprobacionRepo = c.resolve<AprobacionPresupuestoMongoRepository>('AprobacionPresupuestoMongoRepository');
      return new VersionadoPresupuestoService(presupuestoRepo, tituloRepo, partidaRepo, apuRepo, precioRecursoPresupuestoRepo, aprobacionRepo);
    }, true);

    // Registrar AprobacionPresupuestoService
    container.register('AprobacionPresupuestoService', (c) => {
      const aprobacionRepo = c.resolve<AprobacionPresupuestoMongoRepository>('AprobacionPresupuestoMongoRepository');
      const presupuestoRepo = c.resolve<PresupuestoMongoRepository>('PresupuestoMongoRepository');
      const versionadoService = c.resolve<VersionadoPresupuestoService>('VersionadoPresupuestoService');
      const proyectoService = c.resolve<ProyectoService>('ProyectoService');
      return new AprobacionPresupuestoService(aprobacionRepo, presupuestoRepo, versionadoService, proyectoService);
    }, true);

    // Registrar ProyectoService
    container.register('ProyectoService', (c) => {
      const proyectoRepo = c.resolve<ProyectoMongoRepository>('ProyectoMongoRepository');
      const presupuestoRepo = c.resolve<PresupuestoMongoRepository>('PresupuestoMongoRepository');
      return new ProyectoService(proyectoRepo, presupuestoRepo);
    }, true);

    // Registrar TituloService (sin dependencias inicialmente para evitar ciclos)
    container.register('TituloService', (c) => {
      const tituloRepo = c.resolve<TituloMongoRepository>('TituloMongoRepository');
      const partidaRepo = c.resolve<PartidaMongoRepository>('PartidaMongoRepository');
      return new TituloService(tituloRepo, partidaRepo);
    }, true);

    // Registrar PartidaService (sin dependencias inicialmente para evitar ciclos)
    container.register('PartidaService', (c) => {
      const partidaRepo = c.resolve<PartidaMongoRepository>('PartidaMongoRepository');
      return new PartidaService(partidaRepo);
    }, true);

    // Registrar RecalculoTotalesService (después de TituloService y PresupuestoService)
    container.register('RecalculoTotalesService', (c) => {
      const tituloService = c.resolve<TituloService>('TituloService');
      const presupuestoService = c.resolve<PresupuestoService>('PresupuestoService');
      return new RecalculoTotalesService(tituloService, presupuestoService);
    }, true);

    // Registrar EstructuraPresupuestoService
    container.register('EstructuraPresupuestoService', (c) => {
      const presupuestoService = c.resolve<PresupuestoService>('PresupuestoService');
      const tituloService = c.resolve<TituloService>('TituloService');
      const partidaService = c.resolve<PartidaService>('PartidaService');
      const apuService = c.resolve<ApuService>('ApuService');
      return new EstructuraPresupuestoService(presupuestoService, tituloService, partidaService, apuService);
    }, true);

    // Registrar EstructuraBatchService
    container.register('EstructuraBatchService', (c) => {
      const tituloService = c.resolve<TituloService>('TituloService');
      const recalculoTotalesService = c.resolve<RecalculoTotalesService>('RecalculoTotalesService');
      return new EstructuraBatchService(tituloService, recalculoTotalesService);
    }, true);

    // Registrar PrecioRecursoPresupuestoMongoRepository
    container.register('PrecioRecursoPresupuestoMongoRepository', () => {
      return new PrecioRecursoPresupuestoMongoRepository();
    }, true);

    // Registrar ApuMongoRepository
    container.register('ApuMongoRepository', () => {
      return new ApuMongoRepository();
    }, true);

    // Registrar PrecioRecursoPresupuestoService
    // Registrar PrecioRecursoPresupuestoService (sin ApuService inicialmente para evitar dependencia circular)
    container.register('PrecioRecursoPresupuestoService', (c) => {
      const precioRepo = c.resolve<PrecioRecursoPresupuestoMongoRepository>('PrecioRecursoPresupuestoMongoRepository');
      return new PrecioRecursoPresupuestoService(precioRepo);
    }, true);

    // Registrar ApuService
    container.register('ApuService', (c) => {
      const apuRepo = c.resolve<ApuMongoRepository>('ApuMongoRepository');
      const precioService = c.resolve<PrecioRecursoPresupuestoService>('PrecioRecursoPresupuestoService');
      const partidaService = c.resolve<PartidaService>('PartidaService');
      return new ApuService(apuRepo, precioService, partidaService);
    }, true);

    // Registrar EspecialidadService
    container.register('EspecialidadService', (c) => {
      const especialidadRepo = c.resolve<EspecialidadMongoRepository>('EspecialidadMongoRepository');
      return new EspecialidadService(especialidadRepo);
    }, true);

    // Resolver dependencias circulares: inyectar servicios en TituloService y PartidaService
    const recalculoTotalesService = container.resolve<RecalculoTotalesService>('RecalculoTotalesService');
    const apuService = container.resolve<ApuService>('ApuService');
    const tituloService = container.resolve<TituloService>('TituloService');
    const partidaService = container.resolve<PartidaService>('PartidaService');

    // Usar reflexión para inyectar dependencias
    (tituloService as any).recalculoTotalesService = recalculoTotalesService;
    (tituloService as any).apuService = apuService;
    (partidaService as any).recalculoTotalesService = recalculoTotalesService;
    (partidaService as any).apuService = apuService;

    // Resolver dependencia circular: inyectar ApuService en PrecioRecursoPresupuestoService
    const precioService = container.resolve<PrecioRecursoPresupuestoService>('PrecioRecursoPresupuestoService');
    // Reutilizar apuService ya declarado arriba
    (precioService as any).apuService = apuService;

    // ========================================================================
    // REGISTRO DE RESOLVERS DE PRESUPUESTOS
    // ========================================================================

    // Registrar PresupuestoResolver
    container.register('PresupuestoResolver', (c) => {
      const presupuestoService = c.resolve<PresupuestoService>('PresupuestoService');
      const versionadoPresupuestoService = c.resolve<VersionadoPresupuestoService>('VersionadoPresupuestoService');
      const estructuraPresupuestoService = c.resolve<EstructuraPresupuestoService>('EstructuraPresupuestoService');
      const precioRecursoPresupuestoService = c.resolve<PrecioRecursoPresupuestoService>('PrecioRecursoPresupuestoService');
      return new PresupuestoResolver(presupuestoService, versionadoPresupuestoService, estructuraPresupuestoService, precioRecursoPresupuestoService);
    }, true);

    // Registrar ProyectoResolver
    container.register('ProyectoResolver', (c) => {
      const proyectoService = c.resolve<ProyectoService>('ProyectoService');
      return new ProyectoResolver(proyectoService);
    }, true);

    // Registrar TituloResolver
    container.register('TituloResolver', (c) => {
      const tituloService = c.resolve<TituloService>('TituloService');
      return new TituloResolver(tituloService);
    }, true);

    // Registrar PartidaResolver
    container.register('PartidaResolver', (c) => {
      const partidaService = c.resolve<PartidaService>('PartidaService');
      return new PartidaResolver(partidaService);
    }, true);

    // Registrar EstructuraBatchResolver
    container.register('EstructuraBatchResolver', (c) => {
      const estructuraBatchService = c.resolve<EstructuraBatchService>('EstructuraBatchService');
      return new EstructuraBatchResolver(estructuraBatchService);
    }, true);

    // Registrar PrecioRecursoPresupuestoResolver
    container.register('PrecioRecursoPresupuestoResolver', (c) => {
      const precioService = c.resolve<PrecioRecursoPresupuestoService>('PrecioRecursoPresupuestoService');
      return new PrecioRecursoPresupuestoResolver(precioService);
    }, true);

    // Registrar AprobacionPresupuestoResolver
    container.register('AprobacionPresupuestoResolver', (c) => {
      const aprobacionService = c.resolve<AprobacionPresupuestoService>('AprobacionPresupuestoService');
      return new AprobacionPresupuestoResolver(aprobacionService);
    }, true);

    // Registrar ApuResolver
    container.register('ApuResolver', (c) => {
      const apuService = c.resolve<ApuService>('ApuService');
      const precioRecursoPresupuestoService = c.resolve<PrecioRecursoPresupuestoService>('PrecioRecursoPresupuestoService');
      return new ApuResolver(apuService, precioRecursoPresupuestoService);
    }, true);

    // Registrar EspecialidadResolver
    container.register('EspecialidadResolver', (c) => {
      const especialidadService = c.resolve<EspecialidadService>('EspecialidadService');
      return new EspecialidadResolver(especialidadService);
    }, true);

    logger.info('Container inicializado con dependencias de autenticación, empresa, ubicación, infraestructura, recursos y presupuestos');
  }

  /**
   * Crea todos los resolvers usando Container para inyección de dependencias
   * @returns Array de resolvers GraphQL
   */
  static createResolvers(): unknown[] {
    const resolvers: unknown[] = [scalarResolvers];
    const container = this.getContainer();

    try {
      // Crear AuthResolver
      const authResolver = container.resolve<AuthResolver>('AuthResolver');
      resolvers.push(authResolver.getResolvers());
      logger.debug('Resolver configurado: auth');

      // Crear UsuarioResolver
      const usuarioResolver = container.resolve<UsuarioResolver>('UsuarioResolver');
      resolvers.push(usuarioResolver.getResolvers());
      logger.debug('Resolver configurado: usuario');

      // Crear EmpresaResolver
      const empresaResolver = container.resolve<EmpresaResolver>('EmpresaResolver');
      resolvers.push(empresaResolver.getResolvers());
      logger.debug('Resolver configurado: empresa');

      // Crear resolvers de ubicación
      const departamentoResolver = container.resolve<DepartamentoResolver>('DepartamentoResolver');
      resolvers.push(departamentoResolver.getResolvers());
      logger.debug('Resolver configurado: departamento');

      const provinciaResolver = container.resolve<ProvinciaResolver>('ProvinciaResolver');
      resolvers.push(provinciaResolver.getResolvers());
      logger.debug('Resolver configurado: provincia');

      const distritoResolver = container.resolve<DistritoResolver>('DistritoResolver');
      resolvers.push(distritoResolver.getResolvers());
      logger.debug('Resolver configurado: distrito');

      const localidadResolver = container.resolve<LocalidadResolver>('LocalidadResolver');
      resolvers.push(localidadResolver.getResolvers());
      logger.debug('Resolver configurado: localidad');

      // Crear InfraestructuraResolver
      const infraestructuraResolver = container.resolve<InfraestructuraResolver>('InfraestructuraResolver');
      resolvers.push(infraestructuraResolver.getResolvers());
      logger.debug('Resolver configurado: infraestructura');

      // Crear RecursoResolver
      const recursoResolver = container.resolve<RecursoResolver>('RecursoResolver');
      resolvers.push(recursoResolver.getResolvers());
      logger.debug('Resolver configurado: recurso');

      // ========================================================================
      // RESOLVERS DE PRESUPUESTOS
      // ========================================================================

      // Crear PresupuestoResolver
      const presupuestoResolver = container.resolve<PresupuestoResolver>('PresupuestoResolver');
      resolvers.push(presupuestoResolver.getResolvers());
      logger.debug('Resolver configurado: presupuesto');

      // Crear ProyectoResolver
      const proyectoResolver = container.resolve<ProyectoResolver>('ProyectoResolver');
      resolvers.push(proyectoResolver.getResolvers());
      logger.debug('Resolver configurado: proyecto');

      // Crear TituloResolver
      const tituloResolver = container.resolve<TituloResolver>('TituloResolver');
      resolvers.push(tituloResolver.getResolvers());
      logger.debug('Resolver configurado: titulo');

      // Crear PartidaResolver
      const partidaResolver = container.resolve<PartidaResolver>('PartidaResolver');
      resolvers.push(partidaResolver.getResolvers());
      logger.debug('Resolver configurado: partida');

      // Crear EstructuraBatchResolver
      const estructuraBatchResolver = container.resolve<EstructuraBatchResolver>('EstructuraBatchResolver');
      resolvers.push(estructuraBatchResolver.getResolvers());
      logger.debug('Resolver configurado: estructura-batch');

      // Crear PrecioRecursoPresupuestoResolver
      const precioRecursoPresupuestoResolver = container.resolve<PrecioRecursoPresupuestoResolver>('PrecioRecursoPresupuestoResolver');
      resolvers.push(precioRecursoPresupuestoResolver.getResolvers());
      logger.debug('Resolver configurado: precio-recurso-presupuesto');

      // Crear AprobacionPresupuestoResolver
      const aprobacionPresupuestoResolver = container.resolve<AprobacionPresupuestoResolver>('AprobacionPresupuestoResolver');
      resolvers.push(aprobacionPresupuestoResolver.getResolvers());
      logger.debug('Resolver configurado: aprobacion-presupuesto');

      // Crear ApuResolver
      const apuResolver = container.resolve<ApuResolver>('ApuResolver');
      resolvers.push(apuResolver.getResolvers());
      logger.debug('Resolver configurado: apu');

      // Crear EspecialidadResolver
      const especialidadResolver = container.resolve<EspecialidadResolver>('EspecialidadResolver');
      resolvers.push(especialidadResolver.getResolvers());
      logger.debug('Resolver configurado: especialidad');
    } catch (error) {
      logger.error('Error configurando resolvers', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    logger.info(`Total de resolvers configurados: ${resolvers.length}`);
    return resolvers;
  }
}
