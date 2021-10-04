import * as fs from "fs";
import sqlite3 from "sqlite3";
import knex from "knex";

export const rnd = (ceil: number) => Math.floor(ceil * Math.random());
export const between = (min: number, val: number, max: number) => Math.min(max, Math.max(min, val));
export const wait = (ms: number) => new Promise((resolve: () => void) => setTimeout(resolve, ms));
export const arrayWrap = (x: unknown) => Array.isArray(x) ? x : [ x ];
export const now = () => new Date().getTime();

export const readJson = (file: string) => fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, {encoding: "utf-8"}))
  : {};

let db = null
let sqliteKnex = null

export function dbConnect(filename: string) {
  if (!db) db = new sqlite3.Database(filename);
  if (!sqliteKnex) sqliteKnex = knex({
    client: "sqlite3",
    connection: { filename },
    useNullAsDefault: true,
  });
  return [db, sqliteKnex];
}

export const dbQuery = (sql: string, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err: Error, rows: unknown) => err ? reject(err) : resolve(rows))
);

export const dbExec = (sql: string) => {
  return new Promise(resolve => db.exec(sql, (err: Error) => {
    if(err) console.log(err)
    return resolve()
  }));
}
