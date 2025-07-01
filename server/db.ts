import * as schema from "@shared/schema";
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('./local-database.sqlite');
export const db = drizzle(sqlite, { schema });
export const pool = sqlite;