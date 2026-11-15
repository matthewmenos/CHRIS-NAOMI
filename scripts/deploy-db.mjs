import env from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const { loadEnvConfig } = env;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local or .env, then retry.");
}

const schema = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
const statements = schema.split(";").map((statement) => statement.trim()).filter(Boolean);
const sql = neon(databaseUrl);

for (let index = 0; index < statements.length; index += 1) {
  try {
    await sql.query(statements[index]);
  } catch (error) {
    console.error(`Database schema statement ${index + 1} of ${statements.length} failed.`);
    throw error;
  }
}

console.log(`Applied ${statements.length} schema statements.`);
