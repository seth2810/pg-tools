import type { Binding } from './nodes/types';
import { InjectableQuery } from './queries/injectable.query';

export type Placeholders = Array<Binding | InjectableQuery>;
