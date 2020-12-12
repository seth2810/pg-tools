import { nanoid } from 'nanoid';
import { DatabaseError } from 'pg-protocol';

import {
  TransactionOptions,
  IsolationLevel,
  AccessMode,
  ShouldRetryPredicate,
  PgClient,
} from './types';

const deadlockDetected = '40P01';
const serializationFailure = '40001';
const noActiveSqlTransaction = '25P01';

const getIsolationLevel = (
  isolationLevel: IsolationLevel = IsolationLevel.Default,
): string => {
  switch (isolationLevel) {
    case IsolationLevel.Default:
      return '';
    case IsolationLevel.ReadCommitted:
      return ' ISOLATION LEVEL READ COMMITTED';
    case IsolationLevel.RepeatableRead:
      return ' ISOLATION LEVEL REPEATABLE READ';
    case IsolationLevel.Serializable:
      return ' ISOLATION LEVEL SERIALIZABLE';
    default:
      throw new TypeError(`Invalid isolation level: ${isolationLevel}`);
  }
};

const getAccessMode = (accessMode: AccessMode = AccessMode.Default): string => {
  switch (accessMode) {
    case AccessMode.Default:
      return '';
    case AccessMode.ReadWrite:
      return ' READ WRITE';
    case AccessMode.ReadOnly:
      return ' READ ONLY';
    default:
      throw new TypeError(`Invalid access mode: ${accessMode}`);
  }
};

const getBeginStatement = (
  isolationLevel?: IsolationLevel,
  accessMode?: AccessMode,
): string => {
  return `BEGIN${getIsolationLevel(isolationLevel)}${getAccessMode(
    accessMode,
  )}`;
};

const isRetryableError: ShouldRetryPredicate = (error: Error) => {
  if (error instanceof DatabaseError) {
    const { code } = error;
    return code === serializationFailure || code === deadlockDetected;
  }

  return false;
};

const getShouldRetry = (
  shouldRetry: ShouldRetryPredicate = isRetryableError,
): ShouldRetryPredicate => {
  if (typeof shouldRetry !== 'function') {
    throw new TypeError(`shouldRetry must be a function`);
  }

  return shouldRetry;
};

const getMaxRetries = (maxRetries: number = 2): number => {
  if (Number.isInteger(maxRetries) === false) {
    throw new TypeError(`maxRetries must be an integer`);
  }

  if (maxRetries < 0) {
    throw new TypeError(`maxRetries must be a non-negative`);
  }

  return maxRetries;
};

async function performTransaction<Result, Client extends PgClient>(
  tx: Client,
  beginStatement: string,
  queries: (tx: Client) => PromiseLike<Result>,
  shouldRetry: ShouldRetryPredicate,
  maxRetries: number,
): Promise<Result> {
  try {
    await tx.query(beginStatement);
    const result = await queries(tx);
    await tx.query('COMMIT');
    return result;
  } catch (error) {
    await tx.query('ROLLBACK');

    if (maxRetries > 0 && shouldRetry(error)) {
      return performTransaction(
        tx,
        beginStatement,
        queries,
        shouldRetry,
        maxRetries - 1,
      );
    }

    throw error;
  }
}

/**
 * Execute a set of queries within a transaction.
 *
 * Start a transaction and execute a set of queries within it.
 * If the function does not throw an error, the transaction is committed.
 *
 * If the function throws a non-retryable error, the transaction is rolled back and the error is rethrown.
 *
 * If the function throws a retryable error, the transaction is rolled back and
 * retried up to 2 or `maxRetries` times. By default, PostgreSQL errors codes
 * `40001` (serialization failure) and `40P01` (deadlock detected) are
 * considered to be retryable, but you may customize the behavior by supplying
 * a custom `shouldRetry` predicate.
 *
 * You may also configure the access mode mode and isolation level of the
 * transaction by supplying the `accessMode` and `isolationLevel` options,
 * respectively.
 */
export async function withTransaction<Result, Client extends PgClient>(
  client: Client,
  queries: (tx: Client) => PromiseLike<Result>,
  options: TransactionOptions = {},
): Promise<Result> {
  const beginStatement = getBeginStatement(
    options.isolationLevel,
    options.accessMode,
  );
  const shouldRetry = getShouldRetry(options.shouldRetry);
  const maxRetries = getMaxRetries(options.maxRetries);

  return performTransaction(
    client,
    beginStatement,
    queries,
    shouldRetry,
    maxRetries,
  );
}

/**
 * Execute a set of queries within a
 * {@link https://www.postgresql.org/docs/current/sql-savepoint.html savepoint}.
 *
 * Start a savepoint and execute a set of queries within it. If the function
 * does not throw an error, the savepoint is released.
 *
 * If the function throws any kind of error, the savepoint is rolled back and
 * the error is rethrown.
 *
 * May only be used within a transaction.
 */
export async function withSavepoint<Result, Client extends PgClient>(
  tx: Client,
  queries: (tx: Client) => PromiseLike<Result>,
): Promise<Result> {
  const txId = nanoid();
  const savePoint = `${txId}_savepoint`;

  try {
    await tx.query(`SAVEPOINT ${savePoint}`);
    const result = await queries(tx);
    await tx.query(`RELEASE SAVEPOINT ${savePoint}`);
    return result;
  } catch (error) {
    const cantBeRolledBack =
      error instanceof DatabaseError && error.code === noActiveSqlTransaction;

    if (!cantBeRolledBack) {
      await tx.query(
        `ROLLBACK TO SAVEPOINT ${savePoint}; RELEASE SAVEPOINT ${savePoint}`,
      );
    }

    throw error;
  }
}

export { IsolationLevel, AccessMode };
