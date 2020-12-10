export type Primitive = string | boolean | number;

export type BindingValue = Primitive | void | null | number[] | string[];

export interface FunctionalValue<Params> {
  (params: Params): BindingValue;
}
