import "dotenv/config";
import "express-async-errors";
import "reflect-metadata";
import { createApp } from "./createApp.js";
import { syncSchema, updateSchema } from "./shared/db/orm.js";
import { logger } from "./shared/logger.js";

// Sin estos secretos el login y los pagos fallan recién en runtime;
// es mejor no arrancar y avisar de entrada.
const requiredEnv = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  logger.error(`Faltan variables de entorno: ${missingEnv.join(", ")}`);
  process.exit(1);
}
if (!process.env.SELLER_ACCESS_TOKEN) {
  logger.warn("SELLER_ACCESS_TOKEN no está definido: los pagos no funcionarán");
}

const app = createApp();
const port = process.env.PORT || 3000;

// Solo se borra y recrea la base cuando se pide explícitamente modo desarrollo.
// Si NODE_ENV falta o tiene otro valor, se usa updateSchema, que nunca borra datos.
if (process.env.NODE_ENV === "development") {
  await syncSchema();
} else {
  await updateSchema();
}

app
  .listen(port, () => {
    logger.info(`Listening on http://localhost:${port}/`);
  })
  .on("error", (error) => {
    logger.error("Error al iniciar el servidor", error);
  });
