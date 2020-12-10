import {
  CompositeQuery, CompositeQueryWithClient,
  QueryNodes, PgClient,
} from './queries';
import * as commonMethods from './commonMethods';
import { createQueryFactory } from './createQueryFactory';
import { PgqtlInstance, PgqtlInstanceWithClient } from './types';

const createDefaultInstance = (): PgqtlInstance => {
  const instance = createQueryFactory(
    <Input, Output>(
      nodes: QueryNodes<Input>,
    ) => new CompositeQuery<Input, Output>(nodes),
  );

  return Object.assign(instance, commonMethods);
};

export const createInstance = (client: PgClient): PgqtlInstanceWithClient => {
  const instance = createQueryFactory(
    <Input, Output>(
      nodes: QueryNodes<Input>,
    ) => new CompositeQueryWithClient<Input, Output>(nodes, client),
  );

  return Object.assign(instance, commonMethods);
};

export default createDefaultInstance();
