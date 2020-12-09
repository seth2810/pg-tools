import type { BindingValue } from './binding.node';

export type FunctionalValue<P> = (params: P) => BindingValue;

export class FunctionalNode<P> {
  constructor(readonly value: FunctionalValue<P>) {}
}
