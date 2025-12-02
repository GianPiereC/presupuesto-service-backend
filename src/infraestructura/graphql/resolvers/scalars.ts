import { GraphQLScalarType, Kind } from 'graphql';
// @ts-expect-error - graphql-upload no tiene tipos para .mjs
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';

// Resolver para el tipo DateTime
export const DateTimeResolver = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A custom scalar that handles dates',
  serialize(value: any): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new Error('Value is not an instance of Date: ' + value);
  },
  parseValue(value: any): Date {
    if (typeof value === 'string') {
      return new Date(value);
    }
    throw new Error('Value is not string: ' + value);
  },
  parseLiteral(ast: any): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('Can only parse strings to dates');
  },
});

// Resolver para el tipo JSON
export const JSONResolver = new GraphQLScalarType({
  name: 'JSON',
  description: 'A custom scalar that handles JSON data',
  serialize(value: any): any {
    return value;
  },
  parseValue(value: any): any {
    return value;
  },
  parseLiteral(ast: any): any {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return ast.values.map((v: any) => JSONResolver.parseLiteral(v));
      case Kind.OBJECT: {
        const obj: any = {};
        ast.fields.forEach((field: any) => {
          obj[field.name.value] = JSONResolver.parseLiteral(field.value);
        });
        return obj;
      }
      default:
        return null;
    }
  },
});

export const scalarResolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Upload: GraphQLUpload,
};

