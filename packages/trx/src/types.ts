import { QueryResultRow, QueryResult } from 'pg';

/**
 * The isolation level to use within a transaction.
 *
 * See
 * {@link https://www.postgresql.org/docs/current/transaction-iso.html Transaction isolation}
 * in the PostgreSQL manual for more information.
 */
export enum IsolationLevel {
  /**
   * The default isolation level, determined by PostgreSQL's per-connection
   * `default_transaction_isolation` variable. By default, it corresponds to
   * `ReadCommitted`.
   */
  Default = 'DEFAULT',
  Serializable = 'SERIALIZABLE',
  RepeatableRead = 'REPEATABLE READ',
  ReadCommitted = 'READ COMMITTED',
}

/**
 * The access mode to use within a transaction.
 *
 * See
 * {@link https://www.postgresql.org/docs/current/sql-set-transaction.html SET TRANSACTION}
 * in the PostgreSQL manual for more information.
 */
export enum AccessMode {
  /**
   * The default access mode, determined by PostgreSQL's per-connection
   * `default_transaction_read_only` variable. By default, it corresponds to
   * `ReadWrite`.
   */
  Default = 'DEFAULT',
  ReadWrite = 'READ WRITE',
  ReadOnly = 'READ ONLY',
}

export interface TransactionOptions {
  /**
   * The access mode of the transaction. It may be either:
   *
   * - `AccessMode.Default`
   * - `AccessMode.ReadWrite`
   * - `AccessMode.ReadOnly`
   *
   * See
   * {@link https://www.postgresql.org/docs/current/sql-set-transaction.html SET TRANSACTION}
   * in the PostgreSQL manual for more information.
   */
  accessMode?: AccessMode;
  /**
   * The isolation level of the transaction. It may be either:
   *
   * - `IsolationLevel.Default`
   * - `IsolationLevel.Serializable`
   * - `IsolationLevel.RepeatableRead`
   * - `IsolationLevel.ReadCommitted`
   *
   * See
   * {@link https://www.postgresql.org/docs/current/transaction-iso.html Transaction isolation}
   * in the PostgreSQL manual for more information.
   */
  isolationLevel?: IsolationLevel;
  /**
   * The maximum number of times to retry the transaction. Defaults to 2.
   */
  maxRetries?: number;
  /**
   * Whether to retry the transaction in case of an error. By default,
   * PostgreSQL errors codes `40001` (serialization failure) and `40P01`
   * (deadlock detected) are considered to be retryable.
   */
  shouldRetry?: ShouldRetryPredicate;
}

export interface ShouldRetryPredicate {
  (error: Error): boolean;
}

export interface PgClient {
  query<R extends QueryResultRow = any, I extends any[] = any[]>(
    text: string,
    values?: I,
  ): Promise<QueryResult<R>>;
}
