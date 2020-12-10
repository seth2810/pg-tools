import { CompositeQueryBase } from './CompositeQueryBase';

import { PgClient } from './types';

export class CompositeQuery<Input, Output> extends CompositeQueryBase<Input, Output> {
  async execute(client: PgClient, data: Input) {
    return this.sendQuery(client, data);
  }
}
