import { ident } from "pg-escape";
import { UmzugStorage } from "umzug";
import { ClientBase, Pool, PoolClient, QueryArrayResult } from "pg";

export interface PGStorageConfiguration {
  tableName: string;
  columnName: string;
}

const configDefaults: PGStorageConfiguration = {
  tableName: "schema_migration",
  columnName: "revision_id",
};

export class UmzugPgStorage implements UmzugStorage {
  private readonly db: ClientBase;
  private readonly config: PGStorageConfiguration;
  private tableCreated = false;

  constructor(
    db: ClientBase,
    partialConfig: Partial<PGStorageConfiguration> = {}
  ) {
    this.db = db;
    this.config = { ...configDefaults, ...partialConfig };
  }

  async executed(): Promise<string[]> {
    await this.createTable();
    const result: QueryArrayResult = await this.db.query({
      text: `
        SELECT ${ident(this.config.columnName)}
        FROM ${ident(this.config.tableName)}
        ORDER BY ${ident(this.config.columnName)} ASC`,
      rowMode: "array",
    });

    return result.rows.flat();
  }

  async logMigration(migrationName: string) {
    await this.createTable();
    await this.db.query({
      text: `
        INSERT INTO ${ident(this.config.tableName)}
          (${ident(this.config.columnName)})
          VALUES ($1)
          ON CONFLICT DO NOTHING`,
      values: [migrationName],
    });
  }

  async unlogMigration(migrationName: string): Promise<void> {
    await this.createTable();
    await this.db.query({
      text: `
        DELETE FROM ${ident(this.config.tableName)}
        WHERE ${ident(this.config.columnName)} = $1`,
      values: [migrationName],
    });
  }

  private async createTable(): Promise<void> {
    if (this.tableCreated) {
      return;
    }

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${ident(this.config.tableName)} (
        ${ident(this.config.columnName)} TEXT NOT NULL PRIMARY KEY UNIQUE
      )`);
    this.tableCreated = true;
  }
}

export async function migrateInTransaction<T>(
  db: Pool | ClientBase,
  cb: (db: ClientBase) => Promise<T>
): Promise<T> {
  let conn: ClientBase | PoolClient;
  if (db instanceof Pool) {
    conn = await db.connect();
  } else {
    conn = db;
  }

  try {
    await conn.query("BEGIN TRANSACTION");

    const result = await cb(conn);
    await conn.query("COMMIT");
    return result;
  } catch (e) {
    await conn.query("ROLLBACK");
    throw e;
  } finally {
    if (db instanceof Pool) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore release() does not exist on BaseClient
      conn.release();
    }
  }
}
