import { PgQuery, QueryNodes } from './types';
import { getQueryText, getQueryValues } from './utils';

export class InjectableQuery implements PgQuery {
  constructor(readonly nodes: QueryNodes) {
  }

  get text() {
    return getQueryText(this.nodes);
  }

  get values() {
    return getQueryValues(this.nodes);
  }
}
