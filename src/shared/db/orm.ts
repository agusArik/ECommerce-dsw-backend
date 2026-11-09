import { MikroORM } from "@mikro-orm/core";

export const orm = await MikroORM.init();

// Borra y recrea todas las tablas. Solo para desarrollo local.
export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();
  await generator.dropSchema();
  await generator.createSchema();
};

// Aplica cambios de esquema sin borrar datos.
export const updateSchema = async () => {
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
};
