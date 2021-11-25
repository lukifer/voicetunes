import connect, { DatabaseConnection, SQLQuery, sql } from '@databases/sqlite';
import knex, { Knex } from "knex";

import config from "./config";

let sqliteKnex: Knex = null;
let db: DatabaseConnection = null

export function knexConnect(filename: string = config.PATH_DATABASE): Knex {
  if (!sqliteKnex) sqliteKnex = knex({
    client: "sqlite3",
    connection: { filename },
    useNullAsDefault: true,
  });
  return sqliteKnex;
}

export function dbConnect(filename: string | undefined = config.PATH_DATABASE) {
  if (!db) db = filename ? connect(filename) : connect(); // empty string = in-memory db
  return db;
}

export function dbClose() {
  db?.dispose();
}

export const dbQuery = async (query: SQLQuery) => dbConnect().query(query);
export const dbRawValue = (fragment: string) => sql.__dangerous__rawValue(fragment);
export const dbRaw = async (query: string) => dbQuery(sql`${dbRawValue(query)}`);
