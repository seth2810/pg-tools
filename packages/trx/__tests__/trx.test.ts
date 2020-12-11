import { DatabaseError } from 'pg-protocol';
import { MessageName } from 'pg-protocol/dist/messages';
import { withTransaction } from '../src';
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
  const executeQuery = jest.fn(
    async (tx: PgClient): Promise<any> =>
      tx.query('insert into users (id) values (1) returning *'),
  );

  beforeEach(() => {
    client.query.mockClear();
    executeQuery.mockClear();
  });

  describe('withTransaction', () => {
    const executeTransaction = (options?: TransactionOptions) =>
      withTransaction(client, executeQuery, { maxRetries: 0, ...options });

    const mkDatabaseError = (code: string): DatabaseError => {
      const error = new DatabaseError('', 0, MessageName.error);
      return Object.assign(error, { code });
    };

    const deadlockDetectedError = new DatabaseError('', 0, MessageName.error);
    deadlockDetectedError.code = '40P01';

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

      await expect(executeTransaction).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(1);
    });

    test.each([mkDatabaseError('40P01'), mkDatabaseError('40001')])(
      'should retry queries up to max retries times that throws retryable errors (%j)',
      async (error) => {
        executeQuery.mockRejectedValue(error);

        await expect(executeTransaction({ maxRetries: 1 })).rejects.toThrow();

        expect(executeQuery).toBeCalledTimes(2);
      },
    );

    test('should retry queries that throws retryable errors up to two times by default', async () => {
      executeQuery.mockRejectedValue(mkDatabaseError('40P01'));

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
      executeQuery.mockRejectedValue(mkDatabaseError('40P01'));

      await expect(
        executeTransaction({ maxRetries: 1, shouldRetry: () => false }),
      ).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(1);
    });

    test('should retry queries up to max retries times if should retry predicate returns true', async () => {
      executeQuery.mockRejectedValueOnce(new Error('Boom!'));

      await expect(
        executeTransaction({ maxRetries: 1, shouldRetry: () => true }),
      ).rejects.toThrow();

      expect(executeQuery).toBeCalledTimes(2);
    });
  });

  // describe('withSavepoint', () => {
  //   it('throws an error if called with a client', async () => {
  //     await expect(
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       withSavepoint(client as any, () => query(client, sql`SELECT 1`)),
  //     ).rejects.toThrowError(
  //       'SAVEPOINT can only be used in transaction blocks',
  //     );
  //   });
  //   it('throws an error if called outside a transaction', async () => {
  //     await expect(
  //       withSavepoint(client, () => query(client, sql`SELECT 1`)),
  //     ).rejects.toThrowError(
  //       'SAVEPOINT can only be used in transaction blocks',
  //     );
  //   });

  //   it('returns the value from the function', async () => {
  //     await expect(
  //       withTransaction(client, (tx) => withSavepoint(tx, async () => 'foo')),
  //     ).resolves.toBe('foo');
  //   });

  //   it('does not blow up if throwing a non-Error', async () => {
  //     await expect(
  //       withTransaction(client, (tx) =>
  //         withSavepoint(tx, async () => {
  //           throw null;
  //         }),
  //       ),
  //     ).rejects.toBeNull();
  //   });

  //   it('rolls back the savepoint if an error is thrown', async () => {
  //     await withTransaction(client, async (tx) => {
  //       await insertPet(tx);
  //       await withSavepoint(tx, async (tx) => {
  //         await insertPet(tx);
  //         throw new Error('Boom!');
  //       })
  //         .then(() => {
  //           throw new Error('Should not happen!');
  //         })
  //         .catch((err) => {
  //           expect(err.message).toBe('Boom!');
  //         });
  //     });
  //     expect(await getPetCount()).toBe(4);
  //   });

  //   it('rethrows an error after rolling back', async () => {
  //     await expect(
  //       withTransaction(client, async (tx) => {
  //         await insertPet(tx);
  //         await withSavepoint(tx, async (tx) => {
  //           await insertPet(tx);
  //           throw new Error('Boom!');
  //         });
  //       }),
  //     ).rejects.toThrowError(new Error('Boom!'));
  //     expect(await getPetCount()).toBe(3);
  //   });

  //   it('can be nested (catch on 1st level)', async () => {
  //     await withTransaction(client, async (tx) => {
  //       await insertPet(tx);
  //       await withSavepoint(tx, async (tx) => {
  //         await insertPet(tx);
  //         await withSavepoint(tx, async (tx) => {
  //           await insertPet(tx);
  //           throw new Error('Boom!');
  //         });
  //       })
  //         .then(() => {
  //           throw new Error('Should not happen!');
  //         })
  //         .catch((err) => {
  //           expect(err.message).toBe('Boom!');
  //         });
  //     });
  //     expect(await getPetCount()).toBe(4);
  //   });

  //   it('can be nested (catch on 2nd level)', async () => {
  //     await withTransaction(client, async (tx) => {
  //       await insertPet(tx);
  //       await withSavepoint(tx, async (tx) => {
  //         await insertPet(tx);
  //         await withSavepoint(tx, async (tx) => {
  //           await insertPet(tx);
  //           throw new Error('Boom!');
  //         })
  //           .then(() => {
  //             throw new Error('Should not happen!');
  //           })
  //           .catch((err) => {
  //             expect(err.message).toBe('Boom!');
  //           });
  //       });
  //     });
  //     expect(await getPetCount()).toBe(5);
  //   });

  //   it('can be nested (no catch)', async () => {
  //     await expect(
  //       withTransaction(client, async (tx) => {
  //         await insertPet(tx);
  //         await withSavepoint(tx, async (tx) => {
  //           await insertPet(tx);
  //           await withSavepoint(tx, async (tx) => {
  //             await insertPet(tx);
  //             throw new Error('Boom!');
  //           });
  //         });
  //       }),
  //     ).rejects.toThrowError('Boom!');
  //     expect(await getPetCount()).toBe(3);
  //   });
  // });
});
