// ============================================================================
// LOGGER - Implementación simple de logging estructurado nativo
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Niveles de logging
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

/**
 * Configuración del Logger
 */
export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableFileLogging: boolean;
  logFilePath?: string;
  enableConsole: boolean;
}

/**
 * Colores ANSI para consola
 */
const ANSI_COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  GREEN: '\x1b[32m',
  GRAY: '\x1b[90m'
};

/**
 * Logger estructurado simple nativo
 * Sin dependencias externas, solo Node.js estándar
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logLevelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level || (process.env['NODE_ENV'] === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
      enableColors: config?.enableColors ?? (process.env['NODE_ENV'] !== 'production'),
      enableFileLogging: config?.enableFileLogging ?? false,
      logFilePath: config?.logFilePath || path.join(process.cwd(), 'logs', 'app.log'),
      enableConsole: config?.enableConsole ?? true
    };

    // Crear directorio de logs si no existe
    if (this.config.enableFileLogging && this.config.logFilePath) {
      const logDir = path.dirname(this.config.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Obtener instancia singleton del Logger
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Log de error
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Log de advertencia
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log de información
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log de debug
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Método principal de logging
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    // Verificar si el nivel de log es suficiente
    if (this.logLevelPriority[level] < this.logLevelPriority[this.config.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };

    // Formatear para consola
    if (this.config.enableConsole) {
      const consoleMessage = this.formatConsoleMessage(level, timestamp, message, meta);
      console.log(consoleMessage);
    }

    // Escribir a archivo
    if (this.config.enableFileLogging && this.config.logFilePath) {
      try {
        const fileMessage = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.config.logFilePath, fileMessage);
      } catch (error) {
        // Si falla escribir a archivo, solo loguear a consola
        console.error('Error escribiendo log a archivo:', error);
      }
    }
  }

  /**
   * Formatear mensaje para consola con colores
   */
  private formatConsoleMessage(
    level: LogLevel,
    timestamp: string,
    message: string,
    meta?: Record<string, any>
  ): string {
    let color = ANSI_COLORS.RESET;
    
    switch (level) {
      case LogLevel.ERROR:
        color = ANSI_COLORS.RED;
        break;
      case LogLevel.WARN:
        color = ANSI_COLORS.YELLOW;
        break;
      case LogLevel.INFO:
        color = ANSI_COLORS.BLUE;
        break;
      case LogLevel.DEBUG:
        color = ANSI_COLORS.GRAY;
        break;
    }

    const resetColor = this.config.enableColors ? ANSI_COLORS.RESET : '';
    const levelColor = this.config.enableColors ? color : '';
    
    const levelStr = `[${level}]`.padEnd(7);
    // Extraer solo hora:minutos:segundos del timestamp ISO
    const timestampStr = timestamp ? timestamp.split('T')[1]?.split('.')[0] || timestamp : new Date().toISOString().split('T')[1]?.split('.')[0] || '';
    
    let formatted = `${levelColor}${levelStr}${resetColor} ${timestampStr} ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      formatted += ` ${this.config.enableColors ? ANSI_COLORS.GRAY : ''}${JSON.stringify(meta)}${resetColor}`;
    }
    
    return formatted;
  }

  /**
   * Cambiar nivel de logging
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

