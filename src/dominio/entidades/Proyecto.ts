/**
 * Entidad de dominio: Proyecto
 */
export class Proyecto {
  constructor(
    public readonly id_proyecto: string,
    public readonly id_usuario: string,
    public id_infraestructura: string,
    public nombre_proyecto: string,
    public id_departamento: string,
    public id_provincia: string,
    public id_distrito: string,
    public id_localidad: string | null,
    public total_proyecto: number | null,
    public estado: string,
    public readonly fecha_creacion: string,
    public fecha_ultimo_calculo: string | null,
    public cliente: string,
    public empresa: string,
    public plazo: number,
    public ppto_base: number,
    public ppto_oferta: number,
    public jornada: number
  ) {}
}

