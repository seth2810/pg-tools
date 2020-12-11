import { BindingValue, Primitive } from './nodes';
import { InjectableQuery, CompositeQuery, QueryNodes } from './queries';

export type Placeholders = ReadonlyArray<BindingValue | InjectableQuery>;

export type QueryFactory<Result> = (nodes: QueryNodes) => Result;

type JoinSeparator = 'and' | 'or';

export interface SqlInstance {
  (
    strings: TemplateStringsArray,
    ...placeholders: Placeholders
  ): CompositeQuery;

  inject: (
    strings: TemplateStringsArray,
    ...placeholders: Placeholders
  ) => InjectableQuery;

  raw: (value: Primitive) => InjectableQuery;

  join: (
    queries: ReadonlyArray<InjectableQuery>,
    separator: JoinSeparator,
  ) => InjectableQuery;
}
