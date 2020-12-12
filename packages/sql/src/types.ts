import { BindingValue, Primitive } from './nodes';
import { InjectableQuery, CompositeQuery, QueryNodes } from './queries';

export type Placeholders = ReadonlyArray<BindingValue | InjectableQuery>;

export type QueryFactory<Result> = (nodes: QueryNodes) => Result;

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
    delimiter: string,
  ) => InjectableQuery;

  insert: <Patch extends Record<string, BindingValue>>(
    records: ReadonlyArray<Patch>,
    ...keys: ReadonlyArray<keyof Patch>
  ) => InjectableQuery;

  set: <Patch extends Record<string, BindingValue>>(
    patch: Patch,
    ...keys: ReadonlyArray<keyof Patch>
  ) => InjectableQuery;
}
