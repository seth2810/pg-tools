export type BindingValue = void | null | boolean | number | string | number[] | string[];

export class BindingNode {
  constructor(readonly value: BindingValue) {}
}
