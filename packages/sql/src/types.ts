import { BindingValue, FunctionalValue, Primitive } from './nodes';
import {
  InjectableQuery,
  CompositeQuery,
  CompositeQueryWithClient,
  QueryNodes,
} from './queries';

type Placeholder<Input> =
  | BindingValue
  | FunctionalValue<Input>
  | InjectableQuery<Input>;

export type Placeholders<Input> = ReadonlyArray<Placeholder<Input>>;

export type QueryFactory<Input, Result> = (nodes: QueryNodes<Input>) => Result;

interface PgqtlCommonMethods {
  inject: <Input extends any = void, Output extends any = void>(
    strings: TemplateStringsArray,
    ...placeholders: Placeholders<Input>
  ) => InjectableQuery<Input, Output>;

  raw: (value: Primitive) => InjectableQuery<void, void>;

  join: <Input extends any = void, Output extends any = void>(
    queries: ReadonlyArray<InjectableQuery<Input, Output>>,
    separator: 'and' | 'or',
  ) => InjectableQuery<Input, Output>;
}

export interface PgqtlInstance extends PgqtlCommonMethods {
  <Output extends any = void, Input extends any = void>(
    strings: TemplateStringsArray,
    ...placeholders: Placeholders<Input>
  ): CompositeQuery<Input, Output>;
}

export interface PgqtlInstanceWithClient extends PgqtlCommonMethods {
  <Output extends any = void, Input extends any = void>(
    strings: TemplateStringsArray,
    ...placeholders: Placeholders<Input>
  ): CompositeQueryWithClient<Input, Output>;
}
