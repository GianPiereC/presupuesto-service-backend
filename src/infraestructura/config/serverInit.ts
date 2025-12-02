import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import path from 'path';
import { createServer, startServer } from './server';
import { connectDatabase } from './database';
import { verifyGCPConnection } from './googleCloudStorage';
import { ResolverFactory } from '../graphql/resolvers/ResolverFactory';
import { logger } from '../logging';

export const initializeServer = async (): Promise<void> => {
  await connectDatabase();
  await verifyGCPConnection();
  
  // Resolver ruta de schemas GraphQL de forma robusta
  // En desarrollo usa src/, en producción compilada usa dist/
  const schemasPath = process.env['NODE_ENV'] === 'production'
    ? path.join(process.cwd(), 'dist/infraestructura/graphql/schemas/**/*.graphql')
    : path.join(process.cwd(), 'src/infraestructura/graphql/schemas/**/*.graphql');
  
  const typesArray = loadFilesSync(schemasPath, { ignoreIndex: true });
  const typeDefs = mergeTypeDefs(typesArray);
  const resolvers = mergeResolvers(ResolverFactory.createResolvers() as unknown as Parameters<typeof mergeResolvers>[0]);

  const { app, httpServer, apolloServer } = createServer(resolvers, typeDefs);
  await startServer(app, httpServer, apolloServer);
  logger.info('Servidor iniciado');
};

