import { defineConfig } from "@mikro-orm/mysql";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  entities: ["dist/**/*.entity.mysql.js"],
  entitiesTs: ["src/**/*.entity.mysql.ts"],

  migrations: {
    path: "dist/src/migrations",
    pathTs: "src/migrations",
  },

  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  dbName: process.env.DB_NAME || "muebleria",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  type: "mysql",
  // clientUrl: process.env.DB_URL, // Ej: mysql://user:pass@host:port/db
  highlighter: new SqlHighlighter(),
  debug: !isProduction,
  schemaGenerator: {
    disableForeignKeys: !isProduction, // en desarrollo desactiva las FK al recrear el esquema
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },

  seeder: {
    defaultSeeder: process.env.DEFAULT_SEEDER,
    path: process.env.SEEDER_PATH,
    pathTs: process.env.SEEDER_PATH_TS,
  },
});
