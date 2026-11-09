import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, it, expect, vi } from "vitest";

vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

import { createApp } from "../createApp.js";
import { orm } from "../shared/db/orm.js";
import { Usuario } from "./usuario.entity.mysql.js";
import { Categoria } from "../categoria/categoria.entity.mysql.js";

const em = orm.em.fork();
let contador = 0;

async function crearUsuario(rol: "cliente" | "admin" = "cliente") {
  contador += 1;
  const sufijo = `${Date.now()}${contador}`;
  const usuario = em.create(Usuario, {
    nombre: "Test",
    apellido: "Usuario",
    direccion: "Calle Falsa 123",
    telefono: "12345678",
    dni: sufijo.slice(-10),
    usuario: `test_usr_${sufijo}`,
    email: `test.usuarios.${sufijo}@example.com`,
    passwordHash: "hash-de-prueba",
    rol,
    fondos: 0,
  });
  await em.persistAndFlush(usuario);
  return usuario;
}

function tokenPara(usuario: Usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET!);
}

describe("Usuarios: edición de rol y fondos", () => {
  const app = createApp();

  it("un cliente NO puede cambiar su propio rol ni sus fondos", async () => {
    const cliente = await crearUsuario("cliente");

    const res = await request(app)
      .patch(`/api/clientes/${cliente.id}`)
      .set("Authorization", `Bearer ${tokenPara(cliente)}`)
      .send({ rol: "admin", fondos: 999999, nombre: "Nuevo" });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe("Nuevo");
    expect(res.body.data.passwordHash).toBeUndefined();

    await em.refresh(cliente);
    expect(cliente.rol).toBe("cliente");
    expect(cliente.fondos).toBe(0);
  });

  it("un admin sí puede cambiar el rol de un usuario", async () => {
    const cliente = await crearUsuario("cliente");
    const admin = await crearUsuario("admin");

    const res = await request(app)
      .patch(`/api/clientes/${cliente.id}`)
      .set("Authorization", `Bearer ${tokenPara(admin)}`)
      .send({ rol: "admin" });

    expect(res.status).toBe(200);
    await em.refresh(cliente);
    expect(cliente.rol).toBe("admin");
  });

  it("el admin puede borrar un usuario sin pedidos y recibe respuesta", async () => {
    const cliente = await crearUsuario("cliente");
    const admin = await crearUsuario("admin");

    const res = await request(app)
      .delete(`/api/clientes/${cliente.id}`)
      .set("Authorization", `Bearer ${tokenPara(admin)}`);

    expect(res.status).toBe(200);
  });
});

describe("Catálogo: rutas de escritura protegidas", () => {
  const app = createApp();

  it("crear una categoría sin token devuelve 401", async () => {
    const res = await request(app)
      .post("/api/categorias")
      .send({ nombre: "Hackeada", descripcion: "No debería crearse" });
    expect(res.status).toBe(401);
  });

  it("borrar un material con token de cliente devuelve 403", async () => {
    const cliente = await crearUsuario("cliente");
    const res = await request(app)
      .delete("/api/materiales/1")
      .set("Authorization", `Bearer ${tokenPara(cliente)}`);
    expect(res.status).toBe(403);
  });

  it("listar descuentos sin token devuelve 401", async () => {
    const res = await request(app).get("/api/descuentos");
    expect(res.status).toBe(401);
  });

  it("las categorías siguen siendo públicas para leer", async () => {
    const res = await request(app).get("/api/categorias");
    expect(res.status).toBe(200);
  });

  it("un admin crea y borra una categoría (201 y 200)", async () => {
    const admin = await crearUsuario("admin");
    const token = tokenPara(admin);

    const resCrear = await request(app)
      .post("/api/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: `cat-test-${Date.now()}`,
        descripcion: "Categoría creada por el test",
      });
    expect(resCrear.status).toBe(201);

    const resBorrar = await request(app)
      .delete(`/api/categorias/${resCrear.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(resBorrar.status).toBe(200);
    expect(
      await em.fork().findOne(Categoria, { id: resCrear.body.data.id }),
    ).toBeNull();
  });

  it("un admin crea un descuento con fecha de expiración en formato ISO", async () => {
    const admin = await crearUsuario("admin");

    const res = await request(app)
      .post("/api/descuentos")
      .set("Authorization", `Bearer ${tokenPara(admin)}`)
      .send({
        codigo: "PROMO10",
        tipo: "Monto",
        porcentaje: 10,
        fechaExpiracion: "2030-01-01T00:00:00.000Z",
      });

    expect(res.status).toBe(201);
  });

  it("buscar una categoría inexistente devuelve 404", async () => {
    const res = await request(app).get("/api/categorias/999999999");
    expect(res.status).toBe(404);
  });
});
