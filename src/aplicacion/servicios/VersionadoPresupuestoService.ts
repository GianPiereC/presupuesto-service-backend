import { Presupuesto } from '../../dominio/entidades/Presupuesto';
import { Titulo } from '../../dominio/entidades/Titulo';
import { Partida } from '../../dominio/entidades/Partida';
import { Apu } from '../../dominio/entidades/Apu';
import { PrecioRecursoPresupuesto } from '../../dominio/entidades/PrecioRecursoPresupuesto';
import { AprobacionPresupuesto } from '../../dominio/entidades/AprobacionPresupuesto';
import { IPresupuestoRepository } from '../../dominio/repositorios/IPresupuestoRepository';
import { ITituloRepository } from '../../dominio/repositorios/ITituloRepository';
import { IPartidaRepository } from '../../dominio/repositorios/IPartidaRepository';
import { IApuRepository } from '../../dominio/repositorios/IApuRepository';
import { IPrecioRecursoPresupuestoRepository } from '../../dominio/repositorios/IPrecioRecursoPresupuestoRepository';
import { IAprobacionPresupuestoRepository } from '../../dominio/repositorios/IAprobacionPresupuestoRepository';
import { PresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/PresupuestoSchema';
import { TituloModel } from '../../infraestructura/persistencia/mongo/schemas/TituloSchema';
import { PartidaModel } from '../../infraestructura/persistencia/mongo/schemas/PartidaSchema';
import { ApuModel } from '../../infraestructura/persistencia/mongo/schemas/ApuSchema';
import { PrecioRecursoPresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/PrecioRecursoPresupuestoSchema';
import { AprobacionPresupuestoModel } from '../../infraestructura/persistencia/mongo/schemas/AprobacionPresupuestoSchema';

export interface CrearPresupuestoPadreInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  porcentaje_igv?: number;
  porcentaje_utilidad?: number;
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META'; // Opcional: default BORRADOR
}

export interface CrearPresupuestoConVersionInput {
  id_proyecto: string;
  nombre_presupuesto: string;
  costo_directo: number;
  monto_igv: number;
  monto_utilidad: number;
  parcial_presupuesto: number;
  observaciones: string;
  porcentaje_igv: number;
  porcentaje_utilidad: number;
  plazo: number;
  ppto_base: number;
  ppto_oferta: number;
  total_presupuesto: number;
  id_grupo_version?: string; // Opcional: si no se proporciona, se genera uno nuevo
  fase?: 'BORRADOR' | 'LICITACION' | 'CONTRACTUAL' | 'META'; // Opcional: default BORRADOR
  descripcion_version?: string; // Opcional: motivo de creación
}

export class VersionadoPresupuestoService {
  constructor(
    private readonly presupuestoRepository: IPresupuestoRepository,
    private readonly tituloRepository: ITituloRepository,
    private readonly partidaRepository: IPartidaRepository,
    private readonly apuRepository: IApuRepository,
    private readonly precioRecursoPresupuestoRepository: IPrecioRecursoPresupuestoRepository,
    private readonly aprobacionRepository: IAprobacionPresupuestoRepository
  ) {}

  /**
   * Ordena jerárquicamente títulos para mantener la estructura correcta al clonar.
   * Garantiza que los padres se procesen antes que sus hijos, y dentro del mismo nivel
   * se respete el orden entre hermanos.
   * 
   * @param titulos Array de títulos a ordenar
   * @returns Array de títulos ordenados jerárquicamente (padres antes de hijos)
   */
  private ordenarTitulosJerarquicamente(titulos: Titulo[]): Titulo[] {
    // Crear mapa de títulos por padre
    const titulosPorPadre = new Map<string | null, Titulo[]>();
    
    titulos.forEach(titulo => {
      const padre = titulo.id_titulo_padre || null;
      if (!titulosPorPadre.has(padre)) {
        titulosPorPadre.set(padre, []);
      }
      titulosPorPadre.get(padre)!.push(titulo);
    });
    
    // Ordenar cada grupo por orden
    titulosPorPadre.forEach((grupo) => {
      grupo.sort((a, b) => a.orden - b.orden);
    });
    
    // Función recursiva para construir el orden jerárquico
    const construirOrden = (idPadre: string | null): Titulo[] => {
      const resultado: Titulo[] = [];
      const titulosHijos = titulosPorPadre.get(idPadre) || [];
      
      for (const titulo of titulosHijos) {
        resultado.push(titulo);
        // Procesar recursivamente los hijos
        resultado.push(...construirOrden(titulo.id_titulo));
      }
      
      return resultado;
    };
    
    return construirOrden(null);
  }

  /**
   * Ordena partidas respetando la jerarquía y el orden relativo dentro de cada título.
   * Primero ordena las partidas principales (sin id_partida_padre) dentro de cada título,
   * luego ordena las subpartidas después de sus partidas padre.
   * Si se proporcionan títulos ordenados, respeta ese orden para las partidas.
   * 
   * @param partidas Array de partidas a ordenar
   * @param titulosOrdenados Opcional: Array de títulos ya ordenados jerárquicamente para respetar su orden
   * @returns Array de partidas ordenadas respetando jerarquía y orden dentro de cada título
   */
  private ordenarPartidasJerarquicamente(partidas: Partida[], titulosOrdenados?: Titulo[]): Partida[] {
    // Separar partidas principales y subpartidas
    const partidasPrincipales = partidas.filter(p => !p.id_partida_padre);
    const subpartidas = partidas.filter(p => p.id_partida_padre !== null);
    
    // Crear mapa de partidas por título
    const partidasPorTitulo = new Map<string, Partida[]>();
    
    partidasPrincipales.forEach(partida => {
      if (!partidasPorTitulo.has(partida.id_titulo)) {
        partidasPorTitulo.set(partida.id_titulo, []);
      }
      partidasPorTitulo.get(partida.id_titulo)!.push(partida);
    });
    
    // Ordenar partidas dentro de cada título por orden
    partidasPorTitulo.forEach((grupo) => {
      grupo.sort((a, b) => a.orden - b.orden);
    });
    
    // Determinar el orden de los títulos
    let titulosIds: string[];
    if (titulosOrdenados && titulosOrdenados.length > 0) {
      // Usar el orden jerárquico de los títulos proporcionados
      titulosIds = titulosOrdenados
        .filter(t => partidasPorTitulo.has(t.id_titulo))
        .map(t => t.id_titulo);
    } else {
      // Si no se proporcionan títulos ordenados, usar orden simple por ID
      titulosIds = Array.from(partidasPorTitulo.keys());
    }
    
    // Ordenar las partidas principales según el orden de sus títulos
    // y dentro de cada título por su orden
    const partidasOrdenadas: Partida[] = [];
    
    for (const idTitulo of titulosIds) {
      const partidasDelTitulo = partidasPorTitulo.get(idTitulo) || [];
      partidasDelTitulo.sort((a, b) => a.orden - b.orden);
      
      for (const partida of partidasDelTitulo) {
        partidasOrdenadas.push(partida);
        
        // Agregar subpartidas de esta partida inmediatamente después
        const subpartidasDeEsta = subpartidas
          .filter(sp => sp.id_partida_padre === partida.id_partida)
          .sort((a, b) => a.orden - b.orden);
        
        partidasOrdenadas.push(...subpartidasDeEsta);
      }
    }
    
    return partidasOrdenadas;
  }

  /**
   * Crear presupuesto padre (sin detalles)
   * Siempre crea un nuevo grupo de versiones
   */
  async crearPresupuestoPadre(
    data: CrearPresupuestoPadreInput
  ): Promise<Presupuesto> {
    const id_presupuesto_padre = await PresupuestoModel.generateNextId();
    const id_grupo_version = await PresupuestoModel.generateNextGrupoVersionId();
    
    // 1. Crear el presupuesto padre con fase BORRADOR
    await this.presupuestoRepository.create({
      id_presupuesto: id_presupuesto_padre,
      id_proyecto: data.id_proyecto,
      nombre_presupuesto: data.nombre_presupuesto,
      id_grupo_version,
      fase: 'BORRADOR',  // Fase inicial: BORRADOR
      version: null,  // null = padre
      es_padre: true,
      // Campos financieros en 0 (se actualizarán cuando se agreguen detalles)
      costo_directo: 0,
      monto_igv: 0,
      monto_utilidad: 0,
      parcial_presupuesto: 0,
      observaciones: '',
      porcentaje_igv: data.porcentaje_igv ?? 18,
      porcentaje_utilidad: data.porcentaje_utilidad ?? 0,
      plazo: 0,
      ppto_base: 0,
      ppto_oferta: 0,
      total_presupuesto: 0,
      es_inmutable: false,
      es_activo: false,
      fecha_creacion: new Date().toISOString()
    } as Partial<Presupuesto>);
    
    // 2. Crear versión 1 automáticamente con fase BORRADOR
    const version1 = await this.crearVersionDesdePadre(
      id_presupuesto_padre,
      'Versión inicial'
    );
    
    // 3. Retornar la versión 1 (no el padre)
    return version1;
  }

  /**
   * Crear versión 1 desde un presupuesto padre
   * El padre no tiene detalles, así que la versión 1 se crea vacía (sin clonar)
   */
  async crearVersionDesdePadre(
    id_presupuesto_padre: string,
    descripcion_version?: string
  ): Promise<Presupuesto> {
    // Obtener el presupuesto padre
    const padre = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_padre);
    if (!padre) {
      throw new Error('Presupuesto padre no encontrado');
    }

    if (!padre.es_padre || padre.version !== null) {
      throw new Error('El presupuesto especificado no es un padre');
    }

    if (!padre.id_grupo_version) {
      throw new Error('El presupuesto padre no tiene id_grupo_version');
    }

    // Verificar que no exista ya una versión 1 para este grupo con fase BORRADOR
    const versionExistente = await PresupuestoModel.findOne({
      id_grupo_version: padre.id_grupo_version,
      version: 1,
      fase: 'BORRADOR'
    });

    if (versionExistente) {
      throw new Error('Ya existe una versión 1 para este presupuesto');
    }

    // Generar nuevo id_presupuesto para la versión
    const id_presupuesto = await PresupuestoModel.generateNextId();

    // Crear versión 1 con fase BORRADOR
    const nuevaVersion = await this.presupuestoRepository.create({
      id_presupuesto,
      id_proyecto: padre.id_proyecto,
      nombre_presupuesto: padre.nombre_presupuesto,
      id_grupo_version: padre.id_grupo_version,
      fase: 'BORRADOR',  // Fase inicial: BORRADOR
      version: 1,
      es_padre: false,
      id_presupuesto_base: id_presupuesto_padre,
      descripcion_version: descripcion_version || undefined,
      // Campos financieros en 0 (se actualizarán cuando se agreguen detalles)
      costo_directo: 0,
      monto_igv: 0,
      monto_utilidad: 0,
      parcial_presupuesto: 0,
      observaciones: '',
      porcentaje_igv: padre.porcentaje_igv || 18,
      porcentaje_utilidad: padre.porcentaje_utilidad || 0,
      plazo: 0,
      ppto_base: 0,
      ppto_oferta: 0,
      total_presupuesto: 0,
      es_inmutable: false,
      es_activo: false,
      fecha_creacion: new Date().toISOString()
    } as Partial<Presupuesto>);

    return nuevaVersion;
  }

  /**
   * Enviar versión 1 a licitación (cambiar fase de BORRADOR a LICITACION)
   * Actualiza tanto el padre como la versión 1
   * Solo se puede hacer con version 1 en fase BORRADOR
   */
  async enviarALicitacion(id_presupuesto: string): Promise<Presupuesto> {
    const presupuesto = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto);
    
    if (!presupuesto) {
      throw new Error('Presupuesto no encontrado');
    }
    
    if (presupuesto.version !== 1) {
      throw new Error('Solo la versión 1 puede ser enviada a licitación');
    }
    
    if (presupuesto.fase !== 'BORRADOR') {
      throw new Error('Solo se pueden enviar presupuestos en fase BORRADOR');
    }
    
    if (!presupuesto.id_presupuesto_base) {
      throw new Error('No se encontró el presupuesto padre');
    }
    
    // Actualizar la versión 1 a fase LICITACION
    const presupuestoActualizado = await this.presupuestoRepository.update(id_presupuesto, {
      fase: 'LICITACION'
    } as Partial<Presupuesto>);
    
    if (!presupuestoActualizado) {
      throw new Error('Error al actualizar el presupuesto');
    }
    
    // Actualizar también el padre a fase LICITACION
    await this.presupuestoRepository.update(presupuesto.id_presupuesto_base, {
      fase: 'LICITACION'
    } as Partial<Presupuesto>);
    
    return presupuestoActualizado;
  }

  /**
   * Crear presupuesto con versionado
   * Si es el primer presupuesto del proyecto, genera id_grupo_version automáticamente
   * Si ya existe id_grupo_version, crea una nueva versión
   */
  async crearPresupuestoConVersion(
    data: CrearPresupuestoConVersionInput
  ): Promise<Presupuesto> {
    // Generar id_presupuesto
    const id_presupuesto = await PresupuestoModel.generateNextId();
    
    // Determinar id_grupo_version
    let id_grupo_version = data.id_grupo_version;
    
    if (!id_grupo_version) {
      // Es un nuevo presupuesto, generar nuevo grupo
      id_grupo_version = await PresupuestoModel.generateNextGrupoVersionId();
    } else {
      // Verificar que el grupo existe para este proyecto
      const grupoExistente = await PresupuestoModel.findOne({ 
        id_grupo_version,
        id_proyecto: data.id_proyecto 
      });
      
      if (!grupoExistente) {
        throw new Error(`El grupo de versión ${id_grupo_version} no existe para este proyecto`);
      }
    }
    
    // Calcular siguiente versión si ya existe el grupo
    let version = 1;
    const fase = data.fase || 'BORRADOR';
    
    if (id_grupo_version) {
      const ultimaVersion = await PresupuestoModel.findOne({
        id_grupo_version,
        fase: fase
      })
        .sort({ version: -1 })
        .lean();
      
      if (ultimaVersion && ultimaVersion.version) {
        version = ultimaVersion.version + 1;
      }
    }
    
    // Crear presupuesto
    const nuevoPresupuesto = await this.presupuestoRepository.create({
      id_presupuesto,
      id_proyecto: data.id_proyecto,
      costo_directo: data.costo_directo,
      fecha_creacion: new Date().toISOString(),
      monto_igv: data.monto_igv,
      monto_utilidad: data.monto_utilidad,
      nombre_presupuesto: data.nombre_presupuesto,
      parcial_presupuesto: data.parcial_presupuesto,
      observaciones: data.observaciones,
      porcentaje_igv: data.porcentaje_igv,
      porcentaje_utilidad: data.porcentaje_utilidad,
      plazo: data.plazo,
      ppto_base: data.ppto_base,
      ppto_oferta: data.ppto_oferta,
      total_presupuesto: data.total_presupuesto,
      // Nuevos campos
      id_grupo_version,
      fase: fase,
      version,
      descripcion_version: data.descripcion_version,
      es_padre: false,  // Es una versión, no padre
      es_inmutable: false,
      es_activo: false
    } as Partial<Presupuesto>);
    
    return nuevoPresupuesto;
  }

  /**
   * Validar integridad de datos antes de clonar
   */
  private async validarIntegridadDatos(id_presupuesto_base: string): Promise<{
    esValido: boolean;
    errores: string[];
    warnings: string[];
  }> {
    const errores: string[] = [];
    const warnings: string[] = [];

    try {
      // Obtener todas las entidades del presupuesto base
      const titulosBase = await this.tituloRepository.obtenerPorPresupuesto(id_presupuesto_base);
      const partidasBase = await this.partidaRepository.obtenerPorPresupuesto(id_presupuesto_base);
      const apusBase = await this.apuRepository.obtenerPorPresupuesto(id_presupuesto_base);

      console.log(`[VersionadoPresupuestoService] 📊 Entidades encontradas: ${titulosBase.length} títulos, ${partidasBase.length} partidas, ${apusBase.length} APUs`);

      // Verificar que todas las referencias de títulos sean válidas
      for (const titulo of titulosBase) {
        if (titulo.id_titulo_padre) {
          const tituloPadreExiste = titulosBase.some(t => t.id_titulo === titulo.id_titulo_padre);
          if (!tituloPadreExiste) {
            errores.push(`Título ${titulo.id_titulo} referencia padre ${titulo.id_titulo_padre} que no existe`);
          }
        }
      }

      // Verificar que todas las referencias de partidas sean válidas
      for (const partida of partidasBase) {
        const tituloExiste = titulosBase.some(t => t.id_titulo === partida.id_titulo);
        if (!tituloExiste) {
          errores.push(`Partida ${partida.id_partida} referencia título ${partida.id_titulo} que no existe`);
        }

        if (partida.id_partida_padre) {
          const partidaPadreExiste = partidasBase.some(p => p.id_partida === partida.id_partida_padre);
          if (!partidaPadreExiste) {
            errores.push(`Partida ${partida.id_partida} referencia padre ${partida.id_partida_padre} que no existe`);
          }
        }
      }

      // Verificar que todas las referencias de APUs sean válidas
      for (const apu of apusBase) {
        const partidaExiste = partidasBase.some(p => p.id_partida === apu.id_partida);
        if (!partidaExiste) {
          warnings.push(`APU ${apu.id_apu} referencia partida ${apu.id_partida} que no existe - será omitido en la clonación`);
        }
      }

      const resultado = {
        esValido: errores.length === 0,
        errores,
        warnings
      };

      if (errores.length > 0) {
        console.error(`[VersionadoPresupuestoService] ❌ ${errores.length} errores críticos encontrados`);
      }

      if (warnings.length > 0) {
        console.warn(`[VersionadoPresupuestoService] ⚠️  ${warnings.length} advertencias encontradas`);
      }

      return resultado;

    } catch (error) {
      console.error('[VersionadoPresupuestoService] Error en validación de integridad:', error);
      return {
        esValido: false,
        errores: [`Error al validar integridad: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Crear una nueva versión clonando un presupuesto completo (con títulos, partidas y APUs)
   * @param id_presupuesto_base ID del presupuesto a clonar
   * @param descripcion_version Descripción opcional de la nueva versión
   * @returns El nuevo presupuesto creado
   */
  async crearVersionDesdeVersion(
    id_presupuesto_base: string,
    descripcion_version?: string
  ): Promise<Presupuesto> {
    let id_presupuesto_nuevo: string | null = null;
    
    try {
      // 1. Obtener el presupuesto base
      const presupuestoBase = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_base);
      if (!presupuestoBase) {
        throw new Error('Presupuesto base no encontrado');
      }

      // 1.5. Validar integridad de datos antes de proceder
      console.log(`[VersionadoPresupuestoService] 🔍 Validando integridad de datos del presupuesto ${id_presupuesto_base}...`);
      const validacion = await this.validarIntegridadDatos(id_presupuesto_base);

      if (!validacion.esValido) {
        console.error('[VersionadoPresupuestoService] ❌ Errores críticos de integridad encontrados:', validacion.errores);
        throw new Error(`Datos inconsistentes en el presupuesto base: ${validacion.errores.join(', ')}`);
      }

      if (validacion.warnings.length > 0) {
        console.warn('[VersionadoPresupuestoService] ⚠️  Advertencias de integridad:', validacion.warnings);
      }

      // Verificar que el presupuesto base no sea un padre
      if (presupuestoBase.es_padre && presupuestoBase.version === null) {
        throw new Error('No se puede clonar un presupuesto padre. Use crearVersionDesdePadre en su lugar.');
      }

      // Obtener el grupo de versiones
      if (!presupuestoBase.id_grupo_version) {
        throw new Error('El presupuesto base no tiene id_grupo_version');
      }

      // 2. Calcular el número de la nueva versión
      // Si es fase META, calcular según el estado (borrador vs aprobado tienen numeración independiente)
      const faseNuevaVersion = presupuestoBase.fase || 'LICITACION';
      let nuevaVersionNum = 1;
      
      if (faseNuevaVersion === 'META') {
        // Para META: buscar la última versión borrador (estado borrador/en_revision/rechazado)
        const ultimaVersionBorrador = await PresupuestoModel.findOne({
          id_grupo_version: presupuestoBase.id_grupo_version,
          fase: 'META',
          estado: { $in: ['borrador', 'en_revision', 'rechazado'] }
        })
          .sort({ version: -1 })
          .lean();
        
        nuevaVersionNum = ultimaVersionBorrador && ultimaVersionBorrador.version 
          ? ultimaVersionBorrador.version + 1 
          : 1;
      } else {
        // Para otras fases: buscar la última versión de la misma fase
        const ultimaVersion = await PresupuestoModel.findOne({
          id_grupo_version: presupuestoBase.id_grupo_version,
          fase: faseNuevaVersion,
        })
          .sort({ version: -1 })
          .lean();

        nuevaVersionNum = ultimaVersion && ultimaVersion.version ? ultimaVersion.version + 1 : 1;
      }

      // 3. Obtener el presupuesto padre del grupo
      const padre = await PresupuestoModel.findOne({
        id_grupo_version: presupuestoBase.id_grupo_version,
        es_padre: true,
        version: null,
      }).lean();

      if (!padre) {
        throw new Error('No se encontró el presupuesto padre del grupo');
      }

      // 4. Crear el nuevo presupuesto (clon del base)
      id_presupuesto_nuevo = await PresupuestoModel.generateNextId();
    const nuevoPresupuesto = await this.presupuestoRepository.create({
      id_presupuesto: id_presupuesto_nuevo,
      id_proyecto: presupuestoBase.id_proyecto,
      nombre_presupuesto: presupuestoBase.nombre_presupuesto,
      id_grupo_version: presupuestoBase.id_grupo_version,
      fase: faseNuevaVersion, // Mantener la fase del presupuesto base
      version: nuevaVersionNum,
      es_padre: false,
      id_presupuesto_base: padre.id_presupuesto,
      descripcion_version: descripcion_version || undefined,
      // Si es fase META, establecer estado como 'borrador' para que aparezca en "Por Aprobar"
      estado: faseNuevaVersion === 'META' ? 'borrador' : undefined,
      // Clonar campos financieros
      costo_directo: presupuestoBase.costo_directo || 0,
      monto_igv: presupuestoBase.monto_igv || 0,
      monto_utilidad: presupuestoBase.monto_utilidad || 0,
      parcial_presupuesto: presupuestoBase.parcial_presupuesto || 0,
      observaciones: presupuestoBase.observaciones || '',
      porcentaje_igv: presupuestoBase.porcentaje_igv || 18,
      porcentaje_utilidad: presupuestoBase.porcentaje_utilidad || 0,
      plazo: presupuestoBase.plazo || 0,
      ppto_base: presupuestoBase.ppto_base || 0,
      ppto_oferta: presupuestoBase.ppto_oferta || 0,
      total_presupuesto: presupuestoBase.total_presupuesto || 0,
      es_inmutable: false,
      es_activo: false,
      fecha_creacion: new Date().toISOString(),
    } as Partial<Presupuesto>);

    // 5. Obtener y clonar todos los títulos
    const titulosBase = await this.tituloRepository.obtenerPorPresupuesto(id_presupuesto_base);
    const mapaTitulosViejosANuevos = new Map<string, string>(); // id_titulo_viejo -> id_titulo_nuevo

    // Clonar títulos en orden jerárquico (para mantener relaciones padre-hijo y orden correcto)
    const titulosOrdenados = this.ordenarTitulosJerarquicamente(titulosBase);
    
    for (const tituloBase of titulosOrdenados) {
      const id_titulo_nuevo = await TituloModel.generateNextId();
      const id_titulo_padre_nuevo = tituloBase.id_titulo_padre
        ? mapaTitulosViejosANuevos.get(tituloBase.id_titulo_padre) || null
        : null;

      await this.tituloRepository.create({
        id_titulo: id_titulo_nuevo,
        id_presupuesto: id_presupuesto_nuevo,
        id_proyecto: presupuestoBase.id_proyecto,
        id_titulo_padre: id_titulo_padre_nuevo,
        nivel: tituloBase.nivel,
        numero_item: tituloBase.numero_item,
        descripcion: tituloBase.descripcion,
        tipo: tituloBase.tipo,
        orden: tituloBase.orden,
        total_parcial: tituloBase.total_parcial || 0,
      } as Partial<Titulo>);

      mapaTitulosViejosANuevos.set(tituloBase.id_titulo, id_titulo_nuevo);
    }

    // 6. Obtener y clonar todas las partidas
    const partidasBase = await this.partidaRepository.obtenerPorPresupuesto(id_presupuesto_base);
    const mapaPartidasViejasANuevas = new Map<string, string>(); // id_partida_vieja -> id_partida_nueva

    console.log(`[VersionadoPresupuestoService] Clonando ${partidasBase.length} partidas del presupuesto ${id_presupuesto_base}`);

    // Clonar partidas en orden jerárquico (respeta orden dentro de cada título y subpartidas)
    // Pasar títulos ordenados para respetar el orden jerárquico de los títulos
    const partidasOrdenadas = this.ordenarPartidasJerarquicamente(partidasBase, titulosOrdenados);

    for (const partidaBase of partidasOrdenadas) {
      const id_partida_nueva = await PartidaModel.generateNextId();
      const id_titulo_nuevo = mapaTitulosViejosANuevos.get(partidaBase.id_titulo);
      const id_partida_padre_nueva = partidaBase.id_partida_padre
        ? mapaPartidasViejasANuevas.get(partidaBase.id_partida_padre) || null
        : null;

      if (!id_titulo_nuevo) {
        throw new Error(`No se encontró el título nuevo para la partida ${partidaBase.id_partida}`);
      }

      await this.partidaRepository.create({
        id_partida: id_partida_nueva,
        id_presupuesto: id_presupuesto_nuevo,
        id_proyecto: presupuestoBase.id_proyecto,
        id_titulo: id_titulo_nuevo,
        id_partida_padre: id_partida_padre_nueva,
        nivel_partida: partidaBase.nivel_partida,
        numero_item: partidaBase.numero_item,
        descripcion: partidaBase.descripcion,
        unidad_medida: partidaBase.unidad_medida,
        metrado: partidaBase.metrado,
        precio_unitario: partidaBase.precio_unitario,
        parcial_partida: partidaBase.parcial_partida,
        orden: partidaBase.orden,
        estado: partidaBase.estado,
      } as Partial<Partida>);

      mapaPartidasViejasANuevas.set(partidaBase.id_partida, id_partida_nueva);
    }

    // 7. Obtener y clonar todos los PrecioRecursoPresupuesto
    const preciosBase = await this.precioRecursoPresupuestoRepository.obtenerPorPresupuesto(id_presupuesto_base);
    const mapaPreciosViejosANuevos = new Map<string, string>(); // id_precio_recurso_viejo -> id_precio_recurso_nuevo

    for (const precioBase of preciosBase) {
      const id_precio_recurso_nuevo = await PrecioRecursoPresupuestoModel.generateNextId();
      
      await this.precioRecursoPresupuestoRepository.create({
        id_precio_recurso: id_precio_recurso_nuevo,
        id_presupuesto: id_presupuesto_nuevo,
        recurso_id: precioBase.recurso_id,
        codigo_recurso: precioBase.codigo_recurso,
        descripcion: precioBase.descripcion,
        unidad: precioBase.unidad,
        tipo_recurso: precioBase.tipo_recurso,
        precio: precioBase.precio,
        fecha_actualizacion: precioBase.fecha_actualizacion,
        usuario_actualizo: precioBase.usuario_actualizo,
      } as Partial<PrecioRecursoPresupuesto>);

      mapaPreciosViejosANuevos.set(precioBase.id_precio_recurso, id_precio_recurso_nuevo);
    }

    // 8. Obtener y clonar todos los APUs con sus recursos
    const apusBase = await this.apuRepository.obtenerPorPresupuesto(id_presupuesto_base);

    console.log(`[VersionadoPresupuestoService] Clonando ${apusBase.length} APUs del presupuesto ${id_presupuesto_base}`);
    console.log(`[VersionadoPresupuestoService] Partidas clonadas: ${mapaPartidasViejasANuevas.size}`);

    // ✅ FILTRAR: Si hay múltiples APUs para la misma partida, tomar solo el primero
    const apusPorPartida = new Map<string, Apu[]>();
    for (const apu of apusBase) {
      if (!apusPorPartida.has(apu.id_partida)) {
        apusPorPartida.set(apu.id_partida, []);
      }
      apusPorPartida.get(apu.id_partida)!.push(apu);
    }

    // Detectar y loguear partidas con múltiples APUs
    const partidasConMultiplesApus: Array<{ id_partida: string; cantidad: number; apus: string[] }> = [];
    for (const [id_partida, apus] of apusPorPartida.entries()) {
      if (apus.length > 1) {
        partidasConMultiplesApus.push({
          id_partida,
          cantidad: apus.length,
          apus: apus.map(a => a.id_apu)
        });
      }
    }

    if (partidasConMultiplesApus.length > 0) {
      console.warn(`[VersionadoPresupuestoService] ⚠️  Se encontraron ${partidasConMultiplesApus.length} partidas con múltiples APUs. Se tomará solo el primero de cada partida.`, {
        partidas_afectadas: partidasConMultiplesApus,
        accion: 'Se procesará solo el primer APU de cada partida',
        recomendacion: 'Revisar integridad de datos en el presupuesto base'
      });
    }

    // Crear lista de APUs únicos (solo el primero de cada partida)
    const apusUnicos = Array.from(apusPorPartida.values())
      .map(apus => apus[0])
      .filter((apu): apu is NonNullable<typeof apu> => apu !== undefined);

    // Verificar integridad de referencias antes de proceder
    let apusConReferenciasRotas = 0;
    for (const apuBase of apusUnicos) {
      if (!mapaPartidasViejasANuevas.has(apuBase.id_partida)) {
        apusConReferenciasRotas++;
      }
    }

    if (apusConReferenciasRotas > 0) {
      console.warn(`[VersionadoPresupuestoService] ⚠️  Se encontraron ${apusConReferenciasRotas} APUs con referencias rotas a partidas no existentes`);
    }

    let apusCreados = 0;
    let apusOmitidos = 0;
    const partidasProcesadas = new Set<string>();

    for (const apuBase of apusUnicos) {
      const id_apu_nuevo = await ApuModel.generateNextId();
      const id_partida_nueva = mapaPartidasViejasANuevas.get(apuBase.id_partida);

      // ✅ VALIDACIÓN 1: Referencia rota (partida no existe en el mapa)
      if (!id_partida_nueva) {
        console.error(
          `[VersionadoPresupuestoService] ❌ APU ${apuBase.id_apu} OMITIDO - Referencia rota:`,
          {
            problema: 'APU apunta a partida que no existe en el presupuesto base',
            id_apu_original: apuBase.id_apu,
            id_partida_original: apuBase.id_partida,
            id_presupuesto_base: id_presupuesto_base,
            id_presupuesto_nuevo: id_presupuesto_nuevo,
            accion: 'APU omitido en la clonación',
            causa_posible: 'La partida fue eliminada pero el APU no se actualizó'
          }
        );
        apusOmitidos++;
        continue;
      }

      // ✅ VALIDACIÓN 2: Ya se procesó esta partida (duplicado en el mismo proceso)
      if (partidasProcesadas.has(id_partida_nueva)) {
        console.warn(
          `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - Partida ya procesada:`,
          {
            problema: 'Ya se procesó un APU para esta partida en esta clonación',
            id_apu_duplicado: apuBase.id_apu,
            id_partida: id_partida_nueva,
            id_presupuesto_base: id_presupuesto_base,
            accion: 'APU duplicado omitido'
          }
        );
        apusOmitidos++;
        continue;
      }

      // ✅ VALIDACIÓN 3: APU huérfano (ya existe en la base de datos)
      const apuExistente = await this.apuRepository.obtenerPorPartida(id_partida_nueva);
      if (apuExistente) {
        console.warn(
          `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - APU huérfano detectado:`,
          {
            problema: 'Ya existe un APU para esta partida en la base de datos',
            id_partida: id_partida_nueva,
            id_apu_original: apuBase.id_apu,
            id_apu_existente: apuExistente.id_apu,
            id_presupuesto_existente: apuExistente.id_presupuesto,
            id_presupuesto_base: id_presupuesto_base,
            id_presupuesto_nuevo: id_presupuesto_nuevo,
            accion: 'APU huérfano omitido para evitar error de clave duplicada',
            causa_posible: 'APU de clonación anterior fallida o datos inconsistentes'
          }
        );
        apusOmitidos++;
        continue;
      }

      // Marcar esta partida como procesada
      partidasProcesadas.add(id_partida_nueva);

      // Clonar recursos del APU generando nuevos IDs y actualizando referencias a precios y subpartidas
      const recursosClonados = apuBase.recursos.map((recurso) => {
        // Actualizar id_precio_recurso para que apunte al precio clonado del nuevo presupuesto
        const id_precio_recurso_nuevo = recurso.id_precio_recurso
          ? mapaPreciosViejosANuevos.get(recurso.id_precio_recurso) || null
          : null;

        // Actualizar id_partida_subpartida para que apunte a la partida subpartida clonada
        const id_partida_subpartida_nuevo = recurso.id_partida_subpartida
          ? mapaPartidasViejasANuevas.get(recurso.id_partida_subpartida) || null
          : null;

        return {
          id_recurso_apu: `RAPU${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          recurso_id: recurso.recurso_id,
          codigo_recurso: recurso.codigo_recurso,
          descripcion: recurso.descripcion,
          unidad_medida: recurso.unidad_medida,
          tipo_recurso: recurso.tipo_recurso,
          id_precio_recurso: id_precio_recurso_nuevo,
          cantidad: recurso.cantidad,
          desperdicio_porcentaje: recurso.desperdicio_porcentaje,
          cantidad_con_desperdicio: recurso.cantidad_con_desperdicio,
          parcial: recurso.parcial,
          orden: recurso.orden,
          cuadrilla: recurso.cuadrilla,
          // Campos de precio override
          tiene_precio_override: recurso.tiene_precio_override,
          precio_override: recurso.precio_override,
          // Campos de subpartida (actualizar ID a la partida clonada)
          id_partida_subpartida: id_partida_subpartida_nuevo,
          precio_unitario_subpartida: recurso.precio_unitario_subpartida,
        };
      });

      try {
        await this.apuRepository.create({
          id_apu: id_apu_nuevo,
          id_presupuesto: id_presupuesto_nuevo,
          id_proyecto: presupuestoBase.id_proyecto,
          id_partida: id_partida_nueva,
          rendimiento: apuBase.rendimiento,
          jornada: apuBase.jornada,
          recursos: recursosClonados as any, // El repositorio convertirá estos datos a RecursoApu
          costo_materiales: apuBase.costo_materiales || 0,
          costo_mano_obra: apuBase.costo_mano_obra || 0,
          costo_equipos: apuBase.costo_equipos || 0,
          costo_subcontratos: apuBase.costo_subcontratos || 0,
          costo_directo: apuBase.costo_directo || 0,
        } as Partial<Apu>);
        apusCreados++;
      } catch (error: any) {
        // Si es un error de clave duplicada, loguear y continuar
        if (error.code === 11000 || error.message?.includes('duplicate key')) {
          console.error(
            `[VersionadoPresupuestoService] ❌ APU ${id_apu_nuevo} OMITIDO - Error de clave duplicada:`,
            {
              problema: 'Error E11000 duplicate key al crear APU',
              id_apu_nuevo: id_apu_nuevo,
              id_partida: id_partida_nueva,
              id_presupuesto_base: id_presupuesto_base,
              id_presupuesto_nuevo: id_presupuesto_nuevo,
              error_code: error.code,
              error_message: error.message,
              accion: 'APU omitido para evitar fallo en clonación'
            }
          );
          apusOmitidos++;
          continue;
        }
        // Si es otro error, lanzarlo
        throw error;
      }
    }

    console.log(`[VersionadoPresupuestoService] ✅ Clonación de APUs completada: ${apusCreados} creados, ${apusOmitidos} omitidos de ${apusBase.length} totales (${apusUnicos.length} únicos después de filtrar duplicados)`);

    return nuevoPresupuesto;
    } catch (error) {
      // Si algo falla, hacer rollback eliminando todas las entidades creadas
      console.error(`[VersionadoPresupuestoService] Error al clonar versión, ejecutando rollback...`, error);
      
      if (id_presupuesto_nuevo) {
        try {
          console.log(`[VersionadoPresupuestoService] Eliminando presupuesto ${id_presupuesto_nuevo}...`);
          await PresupuestoModel.deleteOne({ id_presupuesto: id_presupuesto_nuevo });
          
          console.log(`[VersionadoPresupuestoService] Eliminando títulos del presupuesto ${id_presupuesto_nuevo}...`);
          await TituloModel.deleteMany({ id_presupuesto: id_presupuesto_nuevo });
          
          console.log(`[VersionadoPresupuestoService] Eliminando partidas del presupuesto ${id_presupuesto_nuevo}...`);
          await PartidaModel.deleteMany({ id_presupuesto: id_presupuesto_nuevo });
          
          console.log(`[VersionadoPresupuestoService] Eliminando precios de recursos del presupuesto ${id_presupuesto_nuevo}...`);
          await PrecioRecursoPresupuestoModel.deleteMany({ id_presupuesto: id_presupuesto_nuevo });
          
          console.log(`[VersionadoPresupuestoService] Eliminando APUs del presupuesto ${id_presupuesto_nuevo}...`);
          await ApuModel.deleteMany({ id_presupuesto: id_presupuesto_nuevo });
          
          console.log(`[VersionadoPresupuestoService] Rollback completado exitosamente`);
        } catch (rollbackError) {
          console.error(`[VersionadoPresupuestoService] Error durante el rollback:`, rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Pasar una versión de LICITACION a fase CONTRACTUAL
   * Ahora crea una aprobación en lugar de crear directamente el presupuesto contractual
   */
  async pasarAContractual(
    id_presupuesto_licitacion: string,
    usuario_solicitante_id: string,
    motivo?: string
  ): Promise<AprobacionPresupuesto> {
      // 1. Obtener la versión de licitación que se quiere pasar a contractual
      const versionLicitacion = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_licitacion);
      
      if (!versionLicitacion) {
        throw new Error('Presupuesto no encontrado');
      }
      
      if (versionLicitacion.es_padre) {
        throw new Error('No se puede pasar directamente un presupuesto padre a contractual. Debe seleccionar una versión.');
      }
      
      if (versionLicitacion.fase !== 'LICITACION') {
        throw new Error('Solo se pueden pasar a contractual presupuestos en fase LICITACION');
      }
      
      if (!versionLicitacion.id_grupo_version) {
        throw new Error('La versión no tiene un grupo de versión asignado');
      }
      
    // 2. Obtener el padre
    const presupuestosPadre = await PresupuestoModel.find({
      id_grupo_version: versionLicitacion.id_grupo_version,
      es_padre: true
    }).lean();
    
    if (!presupuestosPadre || presupuestosPadre.length === 0 || !presupuestosPadre[0]) {
      throw new Error('No se encontró el presupuesto padre');
    }
    
    const presupuestoPadre = presupuestosPadre[0];
    if (!presupuestoPadre.id_presupuesto) {
      throw new Error('El presupuesto padre no tiene id_presupuesto');
    }

    // 3. Verificar si ya existe una aprobación pendiente
    const aprobacionesExistentes = await this.aprobacionRepository.obtenerPorPresupuesto(presupuestoPadre.id_presupuesto);
    const aprobacionPendiente = aprobacionesExistentes.find(
      a => a.estado === 'PENDIENTE' && a.tipo_aprobacion === 'LICITACION_A_CONTRACTUAL'
    );
    
    if (aprobacionPendiente) {
      throw new Error('Ya existe una aprobación pendiente para este presupuesto');
    }

    // 4. Crear registro de aprobación
    const id_aprobacion = await AprobacionPresupuestoModel.generateNextId();
    const nuevaAprobacion = await this.aprobacionRepository.crear({
      id_aprobacion,
      id_presupuesto: presupuestoPadre.id_presupuesto,
      id_grupo_version: versionLicitacion.id_grupo_version,
      id_proyecto: versionLicitacion.id_proyecto,
      tipo_aprobacion: 'LICITACION_A_CONTRACTUAL',
      usuario_solicitante_id,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date().toISOString(),
      comentario_solicitud: motivo,
      version_presupuesto: versionLicitacion.version ?? undefined,
      monto_presupuesto: versionLicitacion.total_presupuesto
    });

    // 5. Actualizar el presupuesto padre con estado_aprobacion
    await this.presupuestoRepository.update(presupuestoPadre.id_presupuesto, {
      estado_aprobacion: {
        tipo: 'LICITACION_A_CONTRACTUAL',
        estado: 'PENDIENTE',
        id_aprobacion: id_aprobacion
      },
      estado: 'en_revision'
    } as Partial<Presupuesto>);

    console.log(`[VersionadoPresupuestoService] Aprobación creada: ${id_aprobacion} para presupuesto ${presupuestoPadre.id_presupuesto}`);
    
    return nuevaAprobacion;
  }

  /**
   * Enviar una versión META en estado borrador a aprobación
   * Crea una aprobación de tipo NUEVA_VERSION_META y cambia el estado a en_revision
   */
  async enviarVersionMetaAAprobacion(
    id_presupuesto_meta: string,
    usuario_solicitante_id: string,
    comentario?: string
  ): Promise<AprobacionPresupuesto> {
    // 1. Obtener la versión META que se quiere enviar a aprobación
    const versionMeta = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_meta);
    
    if (!versionMeta) {
      throw new Error('Presupuesto no encontrado');
    }
    
    if (versionMeta.es_padre) {
      throw new Error('No se puede enviar un presupuesto padre a aprobación. Debe seleccionar una versión.');
    }
    
    if (versionMeta.fase !== 'META') {
      throw new Error('Solo se pueden enviar a aprobación presupuestos en fase META');
    }
    
    // Verificar el estado directamente desde la base de datos para asegurar que obtenemos el estado real
    const versionMetaDesdeBD = await PresupuestoModel.findOne({
      id_presupuesto: id_presupuesto_meta
    }).lean();

    if (!versionMetaDesdeBD) {
      throw new Error('No se encontró la versión en la base de datos');
    }

    const estadoActual = versionMetaDesdeBD.estado;
    
    // Solo permitir enviar a aprobación versiones en estado borrador para NUEVA_VERSION_META
    // Las versiones rechazadas NO se pueden re-enviar (deben crear una nueva versión)
    // Las versiones aprobadas se oficializan con OFICIALIZAR_META (flujo diferente)
    if (estadoActual !== 'borrador') {
      const estadoStr = estadoActual || 'sin estado (null)';
      if (estadoActual === 'rechazado') {
        throw new Error('Las versiones rechazadas no se pueden re-enviar a aprobación. Debe crear una nueva versión desde una versión aprobada.');
      }
      throw new Error(`Solo se pueden enviar a aprobación (NUEVA_VERSION_META) versiones en estado borrador. El estado actual es: "${estadoStr}". Para versiones aprobadas, use el flujo de oficialización (OFICIALIZAR_META).`);
    }
    
    if (!versionMeta.id_grupo_version) {
      throw new Error('La versión no tiene un grupo de versión asignado');
    }
    
    // 2. Obtener el padre
    const presupuestosPadre = await PresupuestoModel.find({
      id_grupo_version: versionMeta.id_grupo_version,
      es_padre: true
    }).lean();
    
    if (!presupuestosPadre || presupuestosPadre.length === 0 || !presupuestosPadre[0]) {
      throw new Error('No se encontró el presupuesto padre');
    }
    
    const presupuestoPadre = presupuestosPadre[0];
    if (!presupuestoPadre.id_presupuesto) {
      throw new Error('El presupuesto padre no tiene id_presupuesto');
    }

    // 3. Verificar si ya existe una aprobación pendiente para esta versión
    const aprobacionesExistentes = await this.aprobacionRepository.obtenerPorPresupuesto(presupuestoPadre.id_presupuesto);
    const aprobacionPendiente = aprobacionesExistentes.find(
      a => a.estado === 'PENDIENTE' && 
           a.tipo_aprobacion === 'NUEVA_VERSION_META' &&
           a.version_presupuesto === versionMeta.version
    );
    
    if (aprobacionPendiente) {
      throw new Error('Ya existe una aprobación pendiente para esta versión');
    }

    // 4. Crear registro de aprobación
    const id_aprobacion = await AprobacionPresupuestoModel.generateNextId();
    const nuevaAprobacion = await this.aprobacionRepository.crear({
      id_aprobacion,
      id_presupuesto: presupuestoPadre.id_presupuesto,
      id_grupo_version: versionMeta.id_grupo_version,
      id_proyecto: versionMeta.id_proyecto,
      tipo_aprobacion: 'NUEVA_VERSION_META',
      usuario_solicitante_id,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date().toISOString(),
      comentario_solicitud: comentario,
      version_presupuesto: versionMeta.version ?? undefined,
      monto_presupuesto: versionMeta.total_presupuesto
    });

    // 5. Actualizar el estado de la versión a en_revision
    await this.presupuestoRepository.update(id_presupuesto_meta, {
      estado: 'en_revision',
      estado_aprobacion: {
        tipo: 'NUEVA_VERSION_META',
        estado: 'PENDIENTE',
        id_aprobacion: id_aprobacion
      }
    } as Partial<Presupuesto>);

    console.log(`[VersionadoPresupuestoService] Aprobación creada: ${id_aprobacion} para versión META ${id_presupuesto_meta}`);
    
    return nuevaAprobacion;
  }

  /**
   * Enviar una versión META aprobada a oficialización (poner en vigencia)
   * Solo la versión más alta aprobada puede ser oficializada
   * Crea una aprobación de tipo OFICIALIZAR_META y cambia el estado a en_revision
   */
  async enviarVersionMetaAOficializacion(
    id_presupuesto_meta: string,
    usuario_solicitante_id: string,
    comentario?: string
  ): Promise<AprobacionPresupuesto> {
    // 1. Obtener la versión META que se quiere oficializar
    const versionMeta = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_meta);
    
    if (!versionMeta) {
      throw new Error('Presupuesto no encontrado');
    }
    
    if (versionMeta.es_padre) {
      throw new Error('No se puede oficializar un presupuesto padre. Debe seleccionar una versión.');
    }
    
    if (versionMeta.fase !== 'META') {
      throw new Error('Solo se pueden oficializar presupuestos en fase META');
    }
    
    if (!versionMeta.id_grupo_version) {
      throw new Error('La versión no tiene un grupo de versión asignado');
    }

    if (!versionMeta.version) {
      throw new Error('La versión no tiene número de versión asignado');
    }

    // 2. Verificar el estado directamente desde la base de datos para asegurar que obtenemos el estado real
    const versionMetaDesdeBD = await PresupuestoModel.findOne({
      id_presupuesto: id_presupuesto_meta
    }).lean();

    if (!versionMetaDesdeBD) {
      throw new Error('No se encontró la versión en la base de datos');
    }

    const estadoActual = versionMetaDesdeBD.estado;
    
    // Validar que el estado sea 'aprobado'
    if (estadoActual !== 'aprobado') {
      const estadoStr = estadoActual || 'sin estado (null)';
      throw new Error(`Solo se pueden oficializar versiones en estado aprobado. El estado actual es: "${estadoStr}"`);
    }

    // 3. Validar que sea la versión más alta aprobada
    const todasVersionesAprobadas = await PresupuestoModel.find({
      id_grupo_version: versionMeta.id_grupo_version,
      fase: 'META',
      estado: { $in: ['aprobado', 'vigente'] }
    })
      .sort({ version: -1 })
      .lean();

    if (todasVersionesAprobadas.length === 0) {
      throw new Error('No se encontraron versiones aprobadas');
    }

    const versionMasAlta = todasVersionesAprobadas[0];
    if (!versionMasAlta.version || versionMasAlta.version !== versionMeta.version) {
      throw new Error(`Solo se puede oficializar la versión más alta aprobada. La versión más alta es V${versionMasAlta.version}, pero se intentó oficializar V${versionMeta.version}`);
    }

    if (versionMasAlta.estado === 'vigente') {
      throw new Error('Ya existe una versión vigente. No se puede oficializar otra versión.');
    }

    // 3. Obtener el padre
    const presupuestosPadre = await PresupuestoModel.find({
      id_grupo_version: versionMeta.id_grupo_version,
      es_padre: true
    }).lean();
    
    if (!presupuestosPadre || presupuestosPadre.length === 0 || !presupuestosPadre[0]) {
      throw new Error('No se encontró el presupuesto padre');
    }
    
    const presupuestoPadre = presupuestosPadre[0];
    if (!presupuestoPadre.id_presupuesto) {
      throw new Error('El presupuesto padre no tiene id_presupuesto');
    }

    // 4. Verificar si ya existe una aprobación pendiente para oficializar esta versión
    const aprobacionesExistentes = await this.aprobacionRepository.obtenerPorPresupuesto(presupuestoPadre.id_presupuesto);
    const aprobacionPendiente = aprobacionesExistentes.find(
      a => a.estado === 'PENDIENTE' && 
           a.tipo_aprobacion === 'OFICIALIZAR_META' &&
           a.version_presupuesto === versionMeta.version
    );
    
    if (aprobacionPendiente) {
      throw new Error('Ya existe una solicitud pendiente para oficializar esta versión');
    }

    // 5. Crear registro de aprobación
    const id_aprobacion = await AprobacionPresupuestoModel.generateNextId();
    const nuevaAprobacion = await this.aprobacionRepository.crear({
      id_aprobacion,
      id_presupuesto: presupuestoPadre.id_presupuesto,
      id_grupo_version: versionMeta.id_grupo_version,
      id_proyecto: versionMeta.id_proyecto,
      tipo_aprobacion: 'OFICIALIZAR_META',
      usuario_solicitante_id,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date().toISOString(),
      comentario_solicitud: comentario,
      version_presupuesto: versionMeta.version,
      monto_presupuesto: versionMeta.total_presupuesto
    });

    // 6. Actualizar el estado de la versión a en_revision
    await this.presupuestoRepository.update(id_presupuesto_meta, {
      estado: 'en_revision',
      estado_aprobacion: {
        tipo: 'OFICIALIZAR_META',
        estado: 'PENDIENTE',
        id_aprobacion: id_aprobacion
      }
    } as Partial<Presupuesto>);

    console.log(`[VersionadoPresupuestoService] Aprobación de oficialización creada: ${id_aprobacion} para versión META ${id_presupuesto_meta} (V${versionMeta.version})`);
    
    return nuevaAprobacion;
  }

  /**
   * Método privado: Crea el presupuesto contractual desde una versión de licitación
   * Este método contiene la lógica original de pasarAContractual
   * Se llama cuando se aprueba la solicitud
   */
  async crearPresupuestoContractualDesdeLicitacion(
    id_presupuesto_licitacion: string,
    motivo?: string
  ): Promise<Presupuesto> {
    let id_presupuesto_contractual: string | undefined;
    
    try {
      // 1. Obtener la versión de licitación
      const versionLicitacion = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_licitacion);
      
      if (!versionLicitacion) {
        throw new Error('Presupuesto no encontrado');
      }
      
      if (!versionLicitacion.id_grupo_version) {
        throw new Error('La versión no tiene un grupo de versión asignado');
      }
      
      // 2. Obtener el padre
      const presupuestosPadre = await PresupuestoModel.find({
        id_grupo_version: versionLicitacion.id_grupo_version,
        es_padre: true
      }).lean();
      
      if (!presupuestosPadre || presupuestosPadre.length === 0 || !presupuestosPadre[0]) {
        throw new Error('No se encontró el presupuesto padre');
      }
      
      const presupuestoPadre = presupuestosPadre[0];
      if (!presupuestoPadre.id_presupuesto) {
        throw new Error('El presupuesto padre no tiene id_presupuesto');
      }
      
      console.log(`[VersionadoPresupuestoService] Clonando presupuesto ${id_presupuesto_licitacion} a fase CONTRACTUAL...`);
      
      // 3. Crear el nuevo presupuesto CONTRACTUAL
      id_presupuesto_contractual = await PresupuestoModel.generateNextId();
      const descripcionCompleta = motivo 
        ? `Basado en V${versionLicitacion.version} de Licitación. Motivo: ${motivo}`
        : `Basado en V${versionLicitacion.version} de Licitación`;
      
      const nuevoPresupuestoContractual = await this.presupuestoRepository.create({
        id_presupuesto: id_presupuesto_contractual,
        id_proyecto: versionLicitacion.id_proyecto,
        nombre_presupuesto: versionLicitacion.nombre_presupuesto,
        id_grupo_version: versionLicitacion.id_grupo_version,
        fase: 'CONTRACTUAL',
        version: 1,
        es_padre: false,
        id_presupuesto_base: id_presupuesto_licitacion,
        descripcion_version: descripcionCompleta,
        costo_directo: versionLicitacion.costo_directo,
        monto_igv: versionLicitacion.monto_igv,
        monto_utilidad: versionLicitacion.monto_utilidad,
        parcial_presupuesto: versionLicitacion.parcial_presupuesto,
        observaciones: versionLicitacion.observaciones,
        porcentaje_igv: versionLicitacion.porcentaje_igv,
        porcentaje_utilidad: versionLicitacion.porcentaje_utilidad,
        plazo: versionLicitacion.plazo,
        ppto_base: versionLicitacion.ppto_base,
        ppto_oferta: versionLicitacion.ppto_oferta,
        total_presupuesto: versionLicitacion.total_presupuesto,
        es_inmutable: false,
        es_activo: true,
        fecha_creacion: new Date().toISOString()
      } as Partial<Presupuesto>);
      
      console.log(`[VersionadoPresupuestoService] Presupuesto contractual creado: ${id_presupuesto_contractual}`);
      
      // 4. Clonar precios de recursos
      const preciosBase = await this.precioRecursoPresupuestoRepository.obtenerPorPresupuesto(id_presupuesto_licitacion);
      const mapaPreciosViejosANuevos = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${preciosBase.length} precios de recursos...`);
      for (const precioBase of preciosBase) {
        const id_precio_recurso_nuevo = await PrecioRecursoPresupuestoModel.generateNextId();
        await this.precioRecursoPresupuestoRepository.create({
          ...precioBase,
          id_precio_recurso: id_precio_recurso_nuevo,
          id_presupuesto: id_presupuesto_contractual,
          _id: undefined,
        } as Partial<PrecioRecursoPresupuesto>);
        mapaPreciosViejosANuevos.set(precioBase.id_precio_recurso, id_precio_recurso_nuevo);
      }
      
      // 5. Clonar títulos
      const titulosBase = await this.tituloRepository.obtenerPorPresupuesto(id_presupuesto_licitacion);
      const mapaTitulosViejosANuevos = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${titulosBase.length} títulos...`);
      // Ordenar títulos jerárquicamente antes de clonar
      const titulosOrdenadosLicitacion = this.ordenarTitulosJerarquicamente(titulosBase);
      for (const tituloBase of titulosOrdenadosLicitacion) {
        const id_titulo_nuevo = await TituloModel.generateNextId();
        const id_titulo_padre_nuevo = tituloBase.id_titulo_padre 
          ? mapaTitulosViejosANuevos.get(tituloBase.id_titulo_padre) || null
          : null;
        
        await this.tituloRepository.create({
          ...tituloBase,
          id_titulo: id_titulo_nuevo,
          id_presupuesto: id_presupuesto_contractual,
          id_titulo_padre: id_titulo_padre_nuevo,
          _id: undefined,
        } as Partial<Titulo>);
        
        mapaTitulosViejosANuevos.set(tituloBase.id_titulo, id_titulo_nuevo);
      }
      
      // 6. Clonar partidas
      const partidasBase = await this.partidaRepository.obtenerPorPresupuesto(id_presupuesto_licitacion);
      const mapaPartidasViejasANuevas = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${partidasBase.length} partidas...`);
      // Ordenar partidas jerárquicamente antes de clonar (pasar títulos ordenados para respetar su orden)
      const partidasOrdenadasLicitacion = this.ordenarPartidasJerarquicamente(partidasBase, titulosOrdenadosLicitacion);
      for (const partidaBase of partidasOrdenadasLicitacion) {
        const id_partida_nueva = await PartidaModel.generateNextId();
        const id_titulo_nuevo = partidaBase.id_titulo 
          ? mapaTitulosViejosANuevos.get(partidaBase.id_titulo) || null
          : null;
        
        await this.partidaRepository.create({
          ...partidaBase,
          id_partida: id_partida_nueva,
          id_presupuesto: id_presupuesto_contractual,
          id_titulo: id_titulo_nuevo,
          _id: undefined,
        } as Partial<Partida>);
        
        mapaPartidasViejasANuevas.set(partidaBase.id_partida, id_partida_nueva);
      }
      
      // 7. Clonar APUs
      const apusBase = await this.apuRepository.obtenerPorPresupuesto(id_presupuesto_licitacion);
      
      console.log(`[VersionadoPresupuestoService] Clonando ${apusBase.length} APUs del presupuesto ${id_presupuesto_licitacion} a CONTRACTUAL...`);

      // ✅ FILTRAR: Si hay múltiples APUs para la misma partida, tomar solo el primero
      const apusPorPartida = new Map<string, Apu[]>();
      for (const apu of apusBase) {
        if (!apusPorPartida.has(apu.id_partida)) {
          apusPorPartida.set(apu.id_partida, []);
        }
        apusPorPartida.get(apu.id_partida)!.push(apu);
      }

      // Detectar y loguear partidas con múltiples APUs
      const partidasConMultiplesApus: Array<{ id_partida: string; cantidad: number; apus: string[] }> = [];
      for (const [id_partida, apus] of apusPorPartida.entries()) {
        if (apus.length > 1) {
          partidasConMultiplesApus.push({
            id_partida,
            cantidad: apus.length,
            apus: apus.map(a => a.id_apu)
          });
        }
      }

      if (partidasConMultiplesApus.length > 0) {
        console.warn(`[VersionadoPresupuestoService] ⚠️  Se encontraron ${partidasConMultiplesApus.length} partidas con múltiples APUs. Se tomará solo el primero de cada partida.`, {
          partidas_afectadas: partidasConMultiplesApus,
          accion: 'Se procesará solo el primer APU de cada partida',
          recomendacion: 'Revisar integridad de datos en el presupuesto base'
        });
      }

      // Crear lista de APUs únicos (solo el primero de cada partida)
      const apusUnicos = Array.from(apusPorPartida.values())
        .map(apus => apus[0])
        .filter((apu): apu is NonNullable<typeof apu> => apu !== undefined);

      let apusCreados = 0;
      let apusOmitidos = 0;
      const partidasProcesadas = new Set<string>();

      for (const apuBase of apusUnicos) {
        const id_apu_nuevo = await ApuModel.generateNextId();
        const id_partida_nueva = mapaPartidasViejasANuevas.get(apuBase.id_partida);

        // ✅ VALIDACIÓN 1: Referencia rota (partida no existe en el mapa)
        if (!id_partida_nueva) {
          console.error(
            `[VersionadoPresupuestoService] ❌ APU ${apuBase.id_apu} OMITIDO - Referencia rota:`,
            {
              problema: 'APU apunta a partida que no existe en el presupuesto base',
              id_apu_original: apuBase.id_apu,
              id_partida_original: apuBase.id_partida,
              id_presupuesto_base: id_presupuesto_licitacion,
              id_presupuesto_nuevo: id_presupuesto_contractual,
              accion: 'APU omitido en la clonación',
              causa_posible: 'La partida fue eliminada pero el APU no se actualizó'
            }
          );
          apusOmitidos++;
          continue;
        }

        // ✅ VALIDACIÓN 2: Ya se procesó esta partida (duplicado en el mismo proceso)
        if (partidasProcesadas.has(id_partida_nueva)) {
          console.warn(
            `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - Partida ya procesada:`,
            {
              problema: 'Ya se procesó un APU para esta partida en esta clonación',
              id_apu_duplicado: apuBase.id_apu,
              id_partida: id_partida_nueva,
              id_presupuesto_base: id_presupuesto_licitacion,
              accion: 'APU duplicado omitido'
            }
          );
          apusOmitidos++;
          continue;
        }

        // ✅ VALIDACIÓN 3: APU huérfano (ya existe en la base de datos)
        const apuExistente = await this.apuRepository.obtenerPorPartida(id_partida_nueva);
        if (apuExistente) {
          console.warn(
            `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - APU huérfano detectado:`,
            {
              problema: 'Ya existe un APU para esta partida en la base de datos',
              id_partida: id_partida_nueva,
              id_apu_original: apuBase.id_apu,
              id_apu_existente: apuExistente.id_apu,
              id_presupuesto_existente: apuExistente.id_presupuesto,
              id_presupuesto_base: id_presupuesto_licitacion,
              id_presupuesto_nuevo: id_presupuesto_contractual,
              accion: 'APU huérfano omitido para evitar error de clave duplicada',
              causa_posible: 'APU de clonación anterior fallida o datos inconsistentes'
            }
          );
          apusOmitidos++;
          continue;
        }

        // Marcar esta partida como procesada
        partidasProcesadas.add(id_partida_nueva);

        const recursosClonados = apuBase.recursos.map((recurso) => {
          const id_precio_recurso_nuevo = recurso.id_precio_recurso
            ? mapaPreciosViejosANuevos.get(recurso.id_precio_recurso) || null
            : null;

          // Actualizar id_partida_subpartida para que apunte a la partida subpartida clonada
          const id_partida_subpartida_nuevo = recurso.id_partida_subpartida
            ? mapaPartidasViejasANuevas.get(recurso.id_partida_subpartida) || null
            : null;
          
          return {
            id_recurso_apu: `RAPU${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            recurso_id: recurso.recurso_id,
            codigo_recurso: recurso.codigo_recurso,
            descripcion: recurso.descripcion,
            unidad_medida: recurso.unidad_medida,
            tipo_recurso: recurso.tipo_recurso,
            id_precio_recurso: id_precio_recurso_nuevo,
            cantidad: recurso.cantidad,
            desperdicio_porcentaje: recurso.desperdicio_porcentaje,
            cantidad_con_desperdicio: recurso.cantidad_con_desperdicio,
            parcial: recurso.parcial,
            orden: recurso.orden,
            cuadrilla: recurso.cuadrilla,
            // Campos de precio override
            tiene_precio_override: recurso.tiene_precio_override,
            precio_override: recurso.precio_override,
            // Campos de subpartida (actualizar ID a la partida clonada)
            id_partida_subpartida: id_partida_subpartida_nuevo,
            precio_unitario_subpartida: recurso.precio_unitario_subpartida,
          };
        });
        
        try {
          await this.apuRepository.create({
            id_apu: id_apu_nuevo,
            id_presupuesto: id_presupuesto_contractual,
            id_proyecto: versionLicitacion.id_proyecto,
            id_partida: id_partida_nueva,
            rendimiento: apuBase.rendimiento,
            jornada: apuBase.jornada,
            recursos: recursosClonados as any,
            costo_materiales: apuBase.costo_materiales || 0,
            costo_mano_obra: apuBase.costo_mano_obra || 0,
            costo_equipos: apuBase.costo_equipos || 0,
            costo_subcontratos: apuBase.costo_subcontratos || 0,
            costo_directo: apuBase.costo_directo || 0,
          } as Partial<Apu>);
          apusCreados++;
        } catch (error: any) {
          // Si es un error de clave duplicada, loguear y continuar
          if (error.code === 11000 || error.message?.includes('duplicate key')) {
            console.error(
              `[VersionadoPresupuestoService] ❌ APU ${id_apu_nuevo} OMITIDO - Error de clave duplicada:`,
              {
                problema: 'Error E11000 duplicate key al crear APU',
                id_apu_nuevo: id_apu_nuevo,
                id_partida: id_partida_nueva,
                id_presupuesto_base: id_presupuesto_licitacion,
                id_presupuesto_nuevo: id_presupuesto_contractual,
                error_code: error.code,
                error_message: error.message,
                accion: 'APU omitido para evitar fallo en clonación'
              }
            );
            apusOmitidos++;
            continue;
          }
          // Si es otro error, lanzarlo
          throw error;
        }
      }

      console.log(`[VersionadoPresupuestoService] ✅ Clonación de APUs completada: ${apusCreados} creados, ${apusOmitidos} omitidos de ${apusBase.length} totales (${apusUnicos.length} únicos después de filtrar duplicados)`);
      
      console.log(`[VersionadoPresupuestoService] Clonado completado exitosamente`);
      
      // 8. Actualizar el padre a fase CONTRACTUAL
      const idPresupuestoPadre = presupuestoPadre.id_presupuesto as string;
      await this.presupuestoRepository.update(idPresupuestoPadre, {
        fase: 'CONTRACTUAL',
        id_presupuesto_licitacion: id_presupuesto_licitacion,
        version_licitacion_aprobada: versionLicitacion.version ?? undefined,
        descripcion_version: motivo || undefined
      } as Partial<Presupuesto>);
      
      console.log(`[VersionadoPresupuestoService] Padre actualizado a fase CONTRACTUAL`);
      
      return nuevoPresupuestoContractual;
      
    } catch (error) {
      console.error('[VersionadoPresupuestoService] Error al crear presupuesto contractual:', error);
      
      // Rollback
      if (id_presupuesto_contractual) {
        try {
          console.log(`[VersionadoPresupuestoService] Iniciando rollback...`);
          await PresupuestoModel.deleteOne({ id_presupuesto: id_presupuesto_contractual });
          await TituloModel.deleteMany({ id_presupuesto: id_presupuesto_contractual });
          await PartidaModel.deleteMany({ id_presupuesto: id_presupuesto_contractual });
          await PrecioRecursoPresupuestoModel.deleteMany({ id_presupuesto: id_presupuesto_contractual });
          await ApuModel.deleteMany({ id_presupuesto: id_presupuesto_contractual });
          console.log(`[VersionadoPresupuestoService] Rollback completado exitosamente`);
        } catch (rollbackError) {
          console.error(`[VersionadoPresupuestoService] Error durante el rollback:`, rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Crea un presupuesto META clonando una versión contractual.
   * Cambia la fase del padre a META.
   */
  async crearPresupuestoMetaDesdeContractual(
    id_presupuesto_contractual: string,
    motivo?: string
  ): Promise<Presupuesto> {
    let id_presupuesto_meta: string | undefined;
    
    try {
      // 1. Obtener la versión contractual
      const versionContractual = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto_contractual);
      
      if (!versionContractual) {
        throw new Error('Presupuesto no encontrado');
      }
      
      if (versionContractual.fase !== 'CONTRACTUAL') {
        throw new Error('Solo se pueden crear presupuestos Meta desde versiones en fase CONTRACTUAL');
      }
      
      if (!versionContractual.id_grupo_version) {
        throw new Error('La versión no tiene un grupo de versión asignado');
      }
      
      // 2. Obtener el padre
      const presupuestosPadre = await PresupuestoModel.find({
        id_grupo_version: versionContractual.id_grupo_version,
        es_padre: true
      }).lean();
      
      if (!presupuestosPadre || presupuestosPadre.length === 0 || !presupuestosPadre[0]) {
        throw new Error('No se encontró el presupuesto padre');
      }
      
      const presupuestoPadre = presupuestosPadre[0];
      if (!presupuestoPadre.id_presupuesto) {
        throw new Error('El presupuesto padre no tiene id_presupuesto');
      }

      // 3. Verificar si ya existe una versión Meta
      const versionesMeta = await PresupuestoModel.find({
        id_grupo_version: versionContractual.id_grupo_version,
        fase: 'META'
      }).lean();

      if (versionesMeta.length > 0) {
        throw new Error('Ya existe una versión Meta para este presupuesto');
      }
      
      console.log(`[VersionadoPresupuestoService] Clonando presupuesto ${id_presupuesto_contractual} a fase META...`);
      
      // 4. Crear el nuevo presupuesto META
      id_presupuesto_meta = await PresupuestoModel.generateNextId();
      const descripcionCompleta = motivo 
        ? `Basado en V${versionContractual.version} de Contractual. Motivo: ${motivo}`
        : `Basado en V${versionContractual.version} de Contractual`;
      
      const nuevoPresupuestoMeta = await this.presupuestoRepository.create({
        id_presupuesto: id_presupuesto_meta,
        id_proyecto: versionContractual.id_proyecto,
        nombre_presupuesto: versionContractual.nombre_presupuesto,
        id_grupo_version: versionContractual.id_grupo_version,
        fase: 'META',
        version: 1, // Primera versión META siempre es V1
        es_padre: false,
        id_presupuesto_base: id_presupuesto_contractual,
        descripcion_version: descripcionCompleta,
        costo_directo: versionContractual.costo_directo,
        monto_igv: versionContractual.monto_igv,
        monto_utilidad: versionContractual.monto_utilidad,
        parcial_presupuesto: versionContractual.parcial_presupuesto,
        observaciones: versionContractual.observaciones,
        porcentaje_igv: versionContractual.porcentaje_igv,
        porcentaje_utilidad: versionContractual.porcentaje_utilidad,
        plazo: versionContractual.plazo,
        ppto_base: versionContractual.ppto_base,
        ppto_oferta: versionContractual.ppto_oferta,
        total_presupuesto: versionContractual.total_presupuesto,
        es_inmutable: false,
        es_activo: true,
        estado: 'aprobado', // La primera versión META (V1) se crea como aprobada para aparecer en "Aprobadas"
        fecha_creacion: new Date().toISOString()
      } as Partial<Presupuesto>);
      
      console.log(`[VersionadoPresupuestoService] Presupuesto Meta creado: ${id_presupuesto_meta}`);
      
      // 5. Clonar precios de recursos
      const preciosBase = await this.precioRecursoPresupuestoRepository.obtenerPorPresupuesto(id_presupuesto_contractual);
      const mapaPreciosViejosANuevos = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${preciosBase.length} precios de recursos...`);
      for (const precioBase of preciosBase) {
        const id_precio_recurso_nuevo = await PrecioRecursoPresupuestoModel.generateNextId();
        await this.precioRecursoPresupuestoRepository.create({
          ...precioBase,
          id_precio_recurso: id_precio_recurso_nuevo,
          id_presupuesto: id_presupuesto_meta,
          _id: undefined,
        } as Partial<PrecioRecursoPresupuesto>);
        mapaPreciosViejosANuevos.set(precioBase.id_precio_recurso, id_precio_recurso_nuevo);
      }
      
      // 6. Clonar títulos
      const titulosBase = await this.tituloRepository.obtenerPorPresupuesto(id_presupuesto_contractual);
      const mapaTitulosViejosANuevos = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${titulosBase.length} títulos...`);
      // Ordenar títulos jerárquicamente antes de clonar
      const titulosOrdenados = this.ordenarTitulosJerarquicamente(titulosBase);
      for (const tituloBase of titulosOrdenados) {
        const id_titulo_nuevo = await TituloModel.generateNextId();
        const id_titulo_padre_nuevo = tituloBase.id_titulo_padre 
          ? mapaTitulosViejosANuevos.get(tituloBase.id_titulo_padre) || null
          : null;
        
        await this.tituloRepository.create({
          ...tituloBase,
          id_titulo: id_titulo_nuevo,
          id_presupuesto: id_presupuesto_meta,
          id_titulo_padre: id_titulo_padre_nuevo,
          _id: undefined,
        } as Partial<Titulo>);
        
        mapaTitulosViejosANuevos.set(tituloBase.id_titulo, id_titulo_nuevo);
      }
      
      // 7. Clonar partidas
      const partidasBase = await this.partidaRepository.obtenerPorPresupuesto(id_presupuesto_contractual);
      const mapaPartidasViejasANuevas = new Map<string, string>();
      
      console.log(`[VersionadoPresupuestoService] Clonando ${partidasBase.length} partidas...`);
      // Ordenar partidas jerárquicamente antes de clonar (pasar títulos ordenados para respetar su orden)
      const partidasOrdenadas = this.ordenarPartidasJerarquicamente(partidasBase, titulosOrdenados);
      for (const partidaBase of partidasOrdenadas) {
        const id_partida_nueva = await PartidaModel.generateNextId();
        const id_titulo_nuevo = partidaBase.id_titulo 
          ? mapaTitulosViejosANuevos.get(partidaBase.id_titulo) || null
          : null;
        
        await this.partidaRepository.create({
          ...partidaBase,
          id_partida: id_partida_nueva,
          id_presupuesto: id_presupuesto_meta,
          id_titulo: id_titulo_nuevo,
          _id: undefined,
        } as Partial<Partida>);
        
        mapaPartidasViejasANuevas.set(partidaBase.id_partida, id_partida_nueva);
      }
      
      // 8. Clonar APUs
      const apusBase = await this.apuRepository.obtenerPorPresupuesto(id_presupuesto_contractual);
      
      console.log(`[VersionadoPresupuestoService] Clonando ${apusBase.length} APUs del presupuesto ${id_presupuesto_contractual} a META...`);

      // ✅ FILTRAR: Si hay múltiples APUs para la misma partida, tomar solo el primero
      const apusPorPartida = new Map<string, Apu[]>();
      for (const apu of apusBase) {
        if (!apusPorPartida.has(apu.id_partida)) {
          apusPorPartida.set(apu.id_partida, []);
        }
        apusPorPartida.get(apu.id_partida)!.push(apu);
      }

      // Detectar y loguear partidas con múltiples APUs
      const partidasConMultiplesApus: Array<{ id_partida: string; cantidad: number; apus: string[] }> = [];
      for (const [id_partida, apus] of apusPorPartida.entries()) {
        if (apus.length > 1) {
          partidasConMultiplesApus.push({
            id_partida,
            cantidad: apus.length,
            apus: apus.map(a => a.id_apu)
          });
        }
      }

      if (partidasConMultiplesApus.length > 0) {
        console.warn(`[VersionadoPresupuestoService] ⚠️  Se encontraron ${partidasConMultiplesApus.length} partidas con múltiples APUs. Se tomará solo el primero de cada partida.`, {
          partidas_afectadas: partidasConMultiplesApus,
          accion: 'Se procesará solo el primer APU de cada partida',
          recomendacion: 'Revisar integridad de datos en el presupuesto base'
        });
      }

      // Crear lista de APUs únicos (solo el primero de cada partida)
      const apusUnicos = Array.from(apusPorPartida.values())
        .map(apus => apus[0])
        .filter((apu): apu is NonNullable<typeof apu> => apu !== undefined);

      let apusCreados = 0;
      let apusOmitidos = 0;
      const partidasProcesadas = new Set<string>();

      for (const apuBase of apusUnicos) {
        const id_apu_nuevo = await ApuModel.generateNextId();
        const id_partida_nueva = mapaPartidasViejasANuevas.get(apuBase.id_partida);

        // ✅ VALIDACIÓN 1: Referencia rota (partida no existe en el mapa)
        if (!id_partida_nueva) {
          console.error(
            `[VersionadoPresupuestoService] ❌ APU ${apuBase.id_apu} OMITIDO - Referencia rota:`,
            {
              problema: 'APU apunta a partida que no existe en el presupuesto base',
              id_apu_original: apuBase.id_apu,
              id_partida_original: apuBase.id_partida,
              id_presupuesto_base: id_presupuesto_contractual,
              id_presupuesto_nuevo: id_presupuesto_meta,
              accion: 'APU omitido en la clonación',
              causa_posible: 'La partida fue eliminada pero el APU no se actualizó'
            }
          );
          apusOmitidos++;
          continue;
        }

        // ✅ VALIDACIÓN 2: Ya se procesó esta partida (duplicado en el mismo proceso)
        if (partidasProcesadas.has(id_partida_nueva)) {
          console.warn(
            `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - Partida ya procesada:`,
            {
              problema: 'Ya se procesó un APU para esta partida en esta clonación',
              id_apu_duplicado: apuBase.id_apu,
              id_partida: id_partida_nueva,
              id_presupuesto_base: id_presupuesto_contractual,
              accion: 'APU duplicado omitido'
            }
          );
          apusOmitidos++;
          continue;
        }

        // ✅ VALIDACIÓN 3: APU huérfano (ya existe en la base de datos)
        const apuExistente = await this.apuRepository.obtenerPorPartida(id_partida_nueva);
        if (apuExistente) {
          console.warn(
            `[VersionadoPresupuestoService] ⚠️  APU ${apuBase.id_apu} OMITIDO - APU huérfano detectado:`,
            {
              problema: 'Ya existe un APU para esta partida en la base de datos',
              id_partida: id_partida_nueva,
              id_apu_original: apuBase.id_apu,
              id_apu_existente: apuExistente.id_apu,
              id_presupuesto_existente: apuExistente.id_presupuesto,
              id_presupuesto_base: id_presupuesto_contractual,
              id_presupuesto_nuevo: id_presupuesto_meta,
              accion: 'APU huérfano omitido para evitar error de clave duplicada',
              causa_posible: 'APU de clonación anterior fallida o datos inconsistentes'
            }
          );
          apusOmitidos++;
          continue;
        }

        // Marcar esta partida como procesada
        partidasProcesadas.add(id_partida_nueva);

        const recursosClonados = apuBase.recursos.map((recurso) => {
          const id_precio_recurso_nuevo = recurso.id_precio_recurso
            ? mapaPreciosViejosANuevos.get(recurso.id_precio_recurso) || null
            : null;

          // Actualizar id_partida_subpartida para que apunte a la partida subpartida clonada
          const id_partida_subpartida_nuevo = recurso.id_partida_subpartida
            ? mapaPartidasViejasANuevas.get(recurso.id_partida_subpartida) || null
            : null;
          
          return {
            id_recurso_apu: `RAPU${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            recurso_id: recurso.recurso_id,
            codigo_recurso: recurso.codigo_recurso,
            descripcion: recurso.descripcion,
            unidad_medida: recurso.unidad_medida,
            tipo_recurso: recurso.tipo_recurso,
            id_precio_recurso: id_precio_recurso_nuevo,
            cantidad: recurso.cantidad,
            desperdicio_porcentaje: recurso.desperdicio_porcentaje,
            cantidad_con_desperdicio: recurso.cantidad_con_desperdicio,
            parcial: recurso.parcial,
            orden: recurso.orden,
            cuadrilla: recurso.cuadrilla,
            // Campos de precio override
            tiene_precio_override: recurso.tiene_precio_override,
            precio_override: recurso.precio_override,
            // Campos de subpartida (actualizar ID a la partida clonada)
            id_partida_subpartida: id_partida_subpartida_nuevo,
            precio_unitario_subpartida: recurso.precio_unitario_subpartida,
          };
        });
        
        try {
          await this.apuRepository.create({
            id_apu: id_apu_nuevo,
            id_presupuesto: id_presupuesto_meta,
            id_proyecto: versionContractual.id_proyecto,
            id_partida: id_partida_nueva,
            rendimiento: apuBase.rendimiento,
            jornada: apuBase.jornada,
            recursos: recursosClonados as any,
            costo_materiales: apuBase.costo_materiales || 0,
            costo_mano_obra: apuBase.costo_mano_obra || 0,
            costo_equipos: apuBase.costo_equipos || 0,
            costo_subcontratos: apuBase.costo_subcontratos || 0,
            costo_directo: apuBase.costo_directo || 0,
          } as Partial<Apu>);
          apusCreados++;
        } catch (error: any) {
          // Si es un error de clave duplicada, loguear y continuar
          if (error.code === 11000 || error.message?.includes('duplicate key')) {
            console.error(
              `[VersionadoPresupuestoService] ❌ APU ${id_apu_nuevo} OMITIDO - Error de clave duplicada:`,
              {
                problema: 'Error E11000 duplicate key al crear APU',
                id_apu_nuevo: id_apu_nuevo,
                id_partida: id_partida_nueva,
                id_presupuesto_base: id_presupuesto_contractual,
                id_presupuesto_nuevo: id_presupuesto_meta,
                error_code: error.code,
                error_message: error.message,
                accion: 'APU omitido para evitar fallo en clonación'
              }
            );
            apusOmitidos++;
            continue;
          }
          // Si es otro error, lanzarlo
          throw error;
        }
      }

      console.log(`[VersionadoPresupuestoService] ✅ Clonación de APUs completada: ${apusCreados} creados, ${apusOmitidos} omitidos de ${apusBase.length} totales (${apusUnicos.length} únicos después de filtrar duplicados)`);
      
      console.log(`[VersionadoPresupuestoService] Clonado completado exitosamente`);
      
      // 9. Actualizar el padre a fase META
      const idPresupuestoPadre = presupuestoPadre.id_presupuesto as string;
      await this.presupuestoRepository.update(idPresupuestoPadre, {
        fase: 'META',
        id_presupuesto_contractual: id_presupuesto_contractual,
        version_contractual_aprobada: versionContractual.version,
        descripcion_version: motivo || undefined
      } as Partial<Presupuesto>);
      
      console.log(`[VersionadoPresupuestoService] Padre actualizado a fase META`);
      
      return nuevoPresupuestoMeta;
      
    } catch (error) {
      console.error('[VersionadoPresupuestoService] Error al crear presupuesto Meta:', error);
      
      // Rollback
      if (id_presupuesto_meta) {
        try {
          console.log(`[VersionadoPresupuestoService] Iniciando rollback...`);
          await PresupuestoModel.deleteOne({ id_presupuesto: id_presupuesto_meta });
          await TituloModel.deleteMany({ id_presupuesto: id_presupuesto_meta });
          await PartidaModel.deleteMany({ id_presupuesto: id_presupuesto_meta });
          await PrecioRecursoPresupuestoModel.deleteMany({ id_presupuesto: id_presupuesto_meta });
          await ApuModel.deleteMany({ id_presupuesto: id_presupuesto_meta });
          console.log(`[VersionadoPresupuestoService] Rollback completado exitosamente`);
        } catch (rollbackError) {
          console.error(`[VersionadoPresupuestoService] Error durante el rollback:`, rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Actualiza el presupuesto padre y propaga cambios a todos los hijos
   * Recalcula total_presupuesto para todos los hijos que tengan parcial_presupuesto > 0
   */
  async actualizarPresupuestoPadre(
    id_presupuesto: string,
    data: {
      nombre_presupuesto?: string;
      porcentaje_igv?: number;
      porcentaje_utilidad?: number;
    }
  ): Promise<Presupuesto> {
    const presupuesto = await this.presupuestoRepository.obtenerPorIdPresupuesto(id_presupuesto);
    
    if (!presupuesto) {
      throw new Error('Presupuesto no encontrado');
    }
    
    if (!presupuesto.es_padre || presupuesto.version !== null) {
      throw new Error('Solo se pueden actualizar presupuestos padre');
    }
    
    // Actualizar el padre
    const datosActualizacion: Partial<Presupuesto> = {};
    if (data.nombre_presupuesto !== undefined) {
      datosActualizacion.nombre_presupuesto = data.nombre_presupuesto;
    }
    if (data.porcentaje_igv !== undefined) {
      datosActualizacion.porcentaje_igv = data.porcentaje_igv;
    }
    if (data.porcentaje_utilidad !== undefined) {
      datosActualizacion.porcentaje_utilidad = data.porcentaje_utilidad;
    }
    
    // Si el padre tiene parcial_presupuesto > 0 y se cambian porcentajes, recalcular total_presupuesto
    if (presupuesto.parcial_presupuesto > 0 && (data.porcentaje_igv !== undefined || data.porcentaje_utilidad !== undefined)) {
      const porcentajeIGV = data.porcentaje_igv ?? presupuesto.porcentaje_igv ?? 0;
      const porcentajeUtilidad = data.porcentaje_utilidad ?? presupuesto.porcentaje_utilidad ?? 0;
      
      const montoIGV = Math.round((presupuesto.parcial_presupuesto * porcentajeIGV / 100) * 100) / 100;
      const montoUtilidad = Math.round((presupuesto.parcial_presupuesto * porcentajeUtilidad / 100) * 100) / 100;
      const totalPresupuesto = Math.round((presupuesto.parcial_presupuesto + montoIGV + montoUtilidad) * 100) / 100;
      
      datosActualizacion.monto_igv = montoIGV;
      datosActualizacion.monto_utilidad = montoUtilidad;
      datosActualizacion.total_presupuesto = totalPresupuesto;
    }
    
    const padreActualizado = await this.presupuestoRepository.update(id_presupuesto, datosActualizacion);
    if (!padreActualizado) {
      throw new Error('Error al actualizar el presupuesto padre');
    }
    
    // Obtener todos los hijos (versiones) del padre
    const hijos = await this.presupuestoRepository.obtenerPorProyecto(presupuesto.id_proyecto);
    const versionesHijas = hijos.filter(h => 
      h.id_grupo_version === presupuesto.id_grupo_version && 
      h.version !== null && 
      !h.es_padre
    );
    
    // Actualizar cada versión hija con el nombre y los nuevos porcentajes
    for (const version of versionesHijas) {
      const datosVersion: Partial<Presupuesto> = {};
      
      // Propagar el nombre también (son el mismo presupuesto, solo versiones)
      if (data.nombre_presupuesto !== undefined) {
        datosVersion.nombre_presupuesto = data.nombre_presupuesto;
      }
      
      if (data.porcentaje_igv !== undefined) {
        datosVersion.porcentaje_igv = data.porcentaje_igv;
      }
      if (data.porcentaje_utilidad !== undefined) {
        datosVersion.porcentaje_utilidad = data.porcentaje_utilidad;
      }
      
      // Si la versión tiene parcial_presupuesto > 0, recalcular total_presupuesto
      if (version.parcial_presupuesto > 0) {
        const porcentajeIGV = data.porcentaje_igv ?? version.porcentaje_igv;
        const porcentajeUtilidad = data.porcentaje_utilidad ?? version.porcentaje_utilidad;
        
        // Calcular: IGV y utilidad sobre el parcial
        const montoIGV = Math.round((version.parcial_presupuesto * porcentajeIGV / 100) * 100) / 100;
        const montoUtilidad = Math.round((version.parcial_presupuesto * porcentajeUtilidad / 100) * 100) / 100;
        const totalPresupuesto = Math.round((version.parcial_presupuesto + montoIGV + montoUtilidad) * 100) / 100;
        
        datosVersion.monto_igv = montoIGV;
        datosVersion.monto_utilidad = montoUtilidad;
        datosVersion.total_presupuesto = totalPresupuesto;
      }
      
      await this.presupuestoRepository.update(version.id_presupuesto, datosVersion);
    }
    
    return padreActualizado;
  }
}

