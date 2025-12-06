import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import http from 'http';
import { logger } from '../logging';
import { HealthCheckService } from '../health/HealthCheckService';
import { DatabaseHealthCheck } from '../health/DatabaseHealthCheck';

import { ConfigService } from './ConfigService';

const configService = ConfigService.getInstance();

const config = {
  port: configService.getServerPort(),
  host: "0.0.0.0",
  timeout: 600000,
  maxFileSize: 50 * 1024 * 1024,
  maxFiles: 100,
  allowedOrigins: [
    "https://velimaq.vercel.app",
    "https://appnufago.inacons.com.pe",
    "https://kapo-gestion.vercel.app",
    "https://inacons.vercel.app",
    "https://kapo-informes.vercel.app",
    "https://kapo-operaciones.vercel.app",
    "https://kapo-tareo-bakend-production.up.railway.app",
  ]
};

const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:") ||
      origin.startsWith("http://127.0.0.1:") || origin.startsWith("https://studio.apollographql.com") ||
      config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
};

export const createServer = (resolvers: any, typeDefs: any): { app: Application; httpServer: http.Server; apolloServer: ApolloServer } => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json({ limit: `${config.maxFileSize}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${config.maxFileSize}mb` }));

  // Configurar Health Check Service
  const healthCheckService = new HealthCheckService();

  // Registrar health checks
  healthCheckService.register('database', new DatabaseHealthCheck());

  // Endpoint de health check
  app.get('/health', async (_, res) => {
    try {
      const result = await healthCheckService.checkAll();
      const statusCode = result.overall === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        ...result,
        uptime: process.uptime(),
        config: {
          port: config.port,
          mode: configService.getDatabaseMode(),
          nodeEnv: configService.getNodeEnv()
        }
      });
    } catch (error) {
      logger.error('Error ejecutando health checks', { error: error instanceof Error ? error.message : String(error) });
      res.status(503).json({
        overall: 'unhealthy',
        error: 'Error ejecutando health checks',
        timestamp: new Date()
      });
    }
  });

  const httpServer = http.createServer({ maxHeaderSize: 128 * 1024 }, app);
  httpServer.timeout = config.timeout + 300000;
  httpServer.keepAliveTimeout = 120000;
  httpServer.headersTimeout = 125000;

  const apolloServer = new ApolloServer({
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    introspection: true,
    context: ({ req }) => ({ req, token: req.headers.authorization?.split(" ")[1] }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    formatError: (error) => {
      logger.error("GraphQL Error", {
        error: error.message,
        extensions: error.extensions,
        path: error.path
      });
      return error.toJSON();
    },
  });

  return { app, httpServer, apolloServer };
};

export const startServer = async (app: Application, httpServer: http.Server, apolloServer: ApolloServer): Promise<void> => {
  await apolloServer.start();

  // Usar dynamic import para el middleware ES Module
  // @ts-expect-error - dynamic import de ES Module .js
  const { default: graphqlUploadExpress } = await import('graphql-upload/graphqlUploadExpress.js');
  app.use(graphqlUploadExpress({ maxFileSize: config.maxFileSize, maxFiles: config.maxFiles }));
  apolloServer.applyMiddleware({ app: app as any, path: "/graphql", cors: false });

  logger.info(`Servidor iniciando`, {
    host: config.host,
    port: config.port,
    mode: configService.getDatabaseMode()
  });

  httpServer.listen(config.port, config.host, () => {
    logger.info(`GraphQL disponible`, {
      url: `http://${config.host}:${config.port}${apolloServer.graphqlPath}`
    });
    if (process.env['NODE_ENV'] !== 'production') {
      logger.info(`GraphQL Playground disponible`, {
        url: `http://localhost:${config.port}${apolloServer.graphqlPath}`
      });
    }
  });
};

