import { QueryResult, QueryResultRow } from 'pg';

import { TextNode, BindingNode, FunctionalNode } from '../nodes';

type QueryNode<Params> = TextNode | BindingNode | FunctionalNode<Params>;

export type QueryNodes<Params> = ReadonlyArray<QueryNode<Params>>;

export type QueryParameter<P> = BindingNode | FunctionalNode<P>;

export interface PgClient {
  query: <
    R extends QueryResultRow = any,
    V extends any[] = any[],
  >(sql: string, values: V) => Promise<QueryResult<R>>
}
