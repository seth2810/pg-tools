import { DatabaseError } from 'pg-protocol';
import { MessageName } from 'pg-protocol/dist/messages';
import { withSavepoint, withTransaction } from '../src';
import {
  IsolationLevel,
  AccessMode,
  PgClient,
  TransactionOptions,
} from '../src/types';

describe('trx', () => {
  const client = {
    query: jest.fn(),
  };
  const executeQuery = jest.fn();
  const mkDatabaseError = (code: string): DatabaseError => {
    const error = new DatabaseError('', 0, MessageName.error);
    return Object.assign(error, { code });
  };

  const serializationError = mkDatabaseError('40001');
  const deadlockDetectedError = mkDatabaseError('40P01');
  const noActiveSqlTransactionError = mkDatabaseError('25P01');

  beforeEach(() => {
    client.query.mockReset();
    executeQuery.mockReset();
    executeQuery.mockImplementation(
      async (tx: PgClient): Promise<any> =>
        tx.query('insert into users (id) values (1) returning *'),
    );
  });

  describe('withTransaction', () => {
    const executeTransaction = (options?: TransactionOptions) =>
      withTransaction(client, executeQuery, { maxRetries: 0, ...options });

    test('should reject when isolation level is not valid', async () => {
      await expect(
        executeTransaction({ isolationLevel: 'Invalid' as any }),
      ).rejects.toThrowError(new TypeError('Invalid isolation level: Invalid'));
    });

    test('should reject when access mode is not valid', async () => {
      await expect(
        executeTransaction({ accessMode: 'Invalid' as any }),
      ).rejects.toThrowError(new TypeError('Invalid access mode: Invalid'));
    });

    test.each([null, String(1), 1.5])(
      'should reject when max retries is not an integer',
      async (value) => {
        await expect(
          executeTransaction({ maxRetries: value as any }),
        ).rejects.toThrowError(new TypeError('maxRetries must be an integer'));
      },
    );

    test('should reject when max retries is negative integer', async () => {
      await expect(executeTransaction({ maxRetries: -1 })).rejects.toThrowError(
        new TypeError('maxRetries must be a non-negative'),
      );
    });

    test('should reject when should retry is not a function', async () => {
      await expect(
        executeTransaction({ shouldRetry: null as any }),
      ).rejects.toThrowError(new TypeError('shouldRetry must be a function'));
    });

    describe('should begin transaction with required isolation level and access mode before run queries', () => {
      describe.each([
        [IsolationLevel.Default, ''],
        [IsolationLevel.ReadCommitted, 'ISOLATION LEVEL READ COMMITTED'],
        [IsolationLevel.RepeatableRead, 'ISOLATION LEVEL REPEATABLE READ'],
        [IsolationLevel.Serializable, 'ISOLATION LEVEL SERIALIZABLE'],
      ])('%s', (isolationLevel, isolationLevelResult) => {
        test.each([
          [AccessMode.Default, ''],
          [AccessMode.ReadWrite, 'READ WRITE'],
          [AccessMode.ReadOnly, 'READ ONLY'],
        ])('%s', async (accessMode, accessModeResult) => {
          await executeTransaction({ isolationLevel, accessMode });

          const expectedStatement = [
            'BEGIN',
            isolationLevelResult,
            accessModeResult,
          ]
            .filter(Boolean)
            .join(' ');

          expect(client.query).toHaveBeenNthCalledWith(1, expectedStatement);
        });
      });
    });

    test('should begin transaction without isolation level if it is not passed', async () => {
      await executeTransaction({ accessMode: AccessMode.ReadOnly });

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN READ ONLY');
    });

    test('should begin transaction without access mode if it is not passed', async () => {
      await executeTransaction({
        isolationLevel: IsolationLevel.ReadCommitted,
      });

      expect(client.query).toHaveBeenNthCalledWith(
        1,
        'BEGIN ISOLATION LEVEL READ COMMITTED',
      );
    });

    test('should execute query after begin transaction', async () => {
      await executeTransaction();

      expect(client.query).toHaveBeenNthCalledWith(
        2,
        'insert into users (id) values (1) returning *',
      );
    });

    test('should rollback transaction if query throws an error', async () => {
      const error = new Error('Boom!');

      executeQuery.mockImplementationOnce(() => {
        throw error;
      });

      await expect(executeTransaction()).rejects.toThrowError(error);

      expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    });

    test('should rollback transaction if query rejects with an error', async () => {
      const error = new Error('Boom!');

      executeQuery.mockRejectedValueOnce(error);

      await expect(executeTransaction).rejects.toThrowError(error);

      expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    });

    test('should commit transaction after query execution', async () => {
      await executeTransaction();

      expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    });

    test('should pass value returned by query', async () => {
      const result = { id: 1, name: 'John' };

      executeQuery.mockResolvedValueOnce(result);

      await expect(executeTransaction()).resolves.toEqual(result);
    });

    test('should not retry query if max retries is zero', async () => {
      executeQuery.mockRejectedValueOnce(new Error('Boom!'));

      await expect(executeTransaction()).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(1);
    });

    test.each([[serializationError], [deadlockDetectedError]])(
      'should retry queries up to max retries times that throws retryable errors (%j)',
      async (error: DatabaseError) => {
        executeQuery.mockRejectedValue(error);

        await expect(executeTransaction({ maxRetries: 1 })).rejects.toThrow();

        expect(executeQuery).toBeCalledTimes(2);
      },
    );

    test('should retry queries that throws retryable errors up to two times by default', async () => {
      executeQuery.mockRejectedValue(serializationError);

      await expect(
        executeTransaction({ maxRetries: undefined }),
      ).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(3);
    });

    test('should not retry queries that throws non-retryable errors', async () => {
      executeQuery.mockRejectedValueOnce(new Error('Boom!'));

      await expect(executeTransaction({ maxRetries: 1 })).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(1);
    });

    test('should not retry queries if should retry predicate returns false', async () => {
      executeQuery.mockRejectedValueOnce(mkDatabaseError('40P01'));

      await expect(
        executeTransaction({ maxRetries: 1, shouldRetry: () => false }),
      ).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(1);
    });

    test('should retry queries up to max retries times if should retry predicate returns true', async () => {
      executeQuery.mockRejectedValue(new Error('Boom!'));

      await expect(
        executeTransaction({ maxRetries: 1, shouldRetry: () => true }),
      ).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(2);
    });
  });

  describe('withSavepoint', () => {
    const executeSavepoint = () => withSavepoint(client, executeQuery);

    test('should create savepoint before run queries', async () => {
      await executeSavepoint();

      expect(client.query).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/^SAVEPOINT .+_savepoint$/),
      );
    });

    test('should execute query after create savepoint', async () => {
      await executeSavepoint();

      expect(client.query).toHaveBeenNthCalledWith(
        2,
        'insert into users (id) values (1) returning *',
      );
    });

    test('should rollback savepoint if query throws an error', async () => {
      const error = new Error('Boom!');

      executeQuery.mockImplementationOnce(() => {
        throw error;
      });

      await expect(executeSavepoint()).rejects.toThrowError(error);

      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(
          /^ROLLBACK TO SAVEPOINT .+_savepoint; RELEASE SAVEPOINT .+_savepoint$/,
        ),
      );
    });

    test('should rollback savepoint if query rejects with an error', async () => {
      const error = new Error('Boom!');

      executeQuery.mockRejectedValueOnce(error);

      await expect(executeSavepoint()).rejects.toThrowError(error);

      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(
          /^ROLLBACK TO SAVEPOINT .+_savepoint; RELEASE SAVEPOINT .+_savepoint$/,
        ),
      );
    });

    test('should not rollback savepoint if query rejects with error that cant be rolled back', async () => {
      executeQuery.mockRejectedValueOnce(noActiveSqlTransactionError);

      await expect(executeSavepoint()).rejects.toThrowError(
        noActiveSqlTransactionError,
      );

      expect(client.query).not.toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(
          /^ROLLBACK TO SAVEPOINT .+_savepoint; RELEASE SAVEPOINT .+_savepoint$/,
        ),
      );
    });

    test('should release savepoint after query execution', async () => {
      await executeSavepoint();

      expect(client.query).toHaveBeenNthCalledWith(
        3,
        expect.stringMatching(/^RELEASE SAVEPOINT .+_savepoint$/),
      );
    });

    test('should pass value returned by query', async () => {
      const result = { id: 1, name: 'John' };

      executeQuery.mockResolvedValueOnce(result);

      await expect(executeSavepoint()).resolves.toEqual(result);
    });
  });
});
