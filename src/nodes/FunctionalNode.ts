import { FunctionalValue } from './types';

export class FunctionalNode<P> {
  constructor(readonly value: FunctionalValue<P>) {}
}
