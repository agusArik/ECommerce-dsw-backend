import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, it, expect, vi } from "vitest";

vi.mock("express-rate-limit", () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

import { createApp } from "../createApp.js";
import { orm } from "../shared/db/orm.js";
import { Usuario } from "../usuario/usuario.entity.mysql.js";
import { Mueble } from "../mueble/mueble.entity.mysql.js";
import { Pedido } from "../pedido/pedido.entity.mysql.js";
import { Item } from "../item/item.entity.mysql.js";
import { Categoria } from "../categoria/categoria.entity.mysql.js";
import { Material } from "../material/material.entity.mysql.js";

const em = orm.em.fork();

let contador = 0;
function emailUnico() {
  contador += 1;
  return `test.pedidos.${Date.now()}.${contador}@example.com`;
}

async function crearUsuario(rol: "cliente" | "admin" = "cliente") {
  const usuario = em.create(Usuario, {
    nombre: "Test",
    apellido: "Usuario",
    direccion: "Calle Falsa 123",
    telefono: "12345678",
    dni: `${Date.now()}`.slice(-8) + contador,
    usuario: `test_${Date.now()}_${contador++}`,
    email: emailUnico(),
    passwordHash: "hash-de-prueba-no-usado-en-login",
    rol,
    fondos: 0,
  });
  await em.persistAndFlush(usuario);
  return usuario;
}

async function crearCategoriaYMaterial() {
  const categoria = em.create(Categoria, {
    nombre: `categoria-test-${Date.now()}-${contador++}`,
    descripcion: "Categoría de prueba para integración de pedidos",
  });
  const material = em.create(Material, {
    nroMaterial: `material-test-${Date.now()}-${contador++}`,
    nombre: "Material de prueba",
  });
  await em.persistAndFlush([categoria, material]);
  return { categoria, material };
}

async function crearMueble(overrides: Partial<{
  stock: number;
  precioUnitario: number;
  activo: boolean;
}> = {}) {
  const { categoria, material } = await crearCategoriaYMaterial();

  const mueble = em.create(Mueble, {
    descripcion: "Mueble de prueba para integración de pedidos",
    stock: overrides.stock ?? 10,
    etiqueta: "test-mueble",
    precioUnitario: overrides.precioUnitario ?? 1000,
    imagenes: ["https://example.com/img.png"],
    activo: overrides.activo ?? true,
    categoria,
    material,
  } as any);
  await em.persistAndFlush(mueble);
  return mueble;
}

async function crearPedido(
  usuario: Usuario,
  estado: string,
  itemsDef: { mueble: Mueble; cantidad: number }[] = [],
) {
  const pedido = em.create(Pedido, {
    usuario,
    estado,
    fechaHora: new Date(),
    total: 0,
  } as any);

  let total = 0;
  for (const { mueble, cantidad } of itemsDef) {
    const subtotal = mueble.precioUnitario * cantidad;
    const item = em.create(Item, {
      mueble,
      cantidad,
      subtotal,
      pedido,
      estado: "pendiente",
    } as any);
    pedido.items.add(item);
    total += subtotal;
  }
  pedido.total = total;

  await em.persistAndFlush(pedido);
  return pedido;
}

function tokenPara(usuario: { id?: number; rol: string }) {
  if (usuario.id === undefined) {
    throw new Error(
      "No se puede generar un token para un usuario sin id persistido",
    );
  }
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET!,
  );
}

describe("Pedidos integration", () => {
  const app = createApp();

  it("GET /api/pedidos/admin sin token devuelve 401", async () => {
    const res = await request(app).get("/api/pedidos/admin");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Acceso denegado/);
  });

  it("GET /api/pedidos/admin con token de cliente devuelve 403", async () => {
    const token = jwt.sign({ id: 1, rol: "cliente" }, process.env.JWT_SECRET!);
    const res = await request(app)
      .get("/api/pedidos/admin")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Mala autorización/);
  });

  it("GET /api/pedidos/:clienteId sin token devuelve 401", async () => {
    const res = await request(app).get("/api/pedidos/1");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Acceso denegado/);
  });

  it("PATCH /api/pedidos/:pedidoId/estado con estado 'pagado' devuelve 400", async () => {
    const token = jwt.sign({ id: 1, rol: "admin" }, process.env.JWT_SECRET!);
    const res = await request(app)
      .patch("/api/pedidos/1/estado")
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "pagado" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/flujo de confirmación de pagos/);
  });

  it("PATCH /api/pedidos/:pedidoId/estado con transición inválida devuelve 400", async () => {
    const admin = await crearUsuario("admin");
    const pedido = await crearPedido(admin, "pendiente");
    const token = tokenPara(admin);
    const res = await request(app)
      .patch(`/api/pedidos/${pedido.id}/estado`)
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "entregado" }); // pendiente → entregado es inválido
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Transición de estado inválida/);
  });

  it("PATCH /api/pedidos/:pedidoId/estado sin token devuelve 401", async () => {
    const res = await request(app)
      .patch("/api/pedidos/1/estado")
      .send({ estado: "confirmado" });
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------
  // POST /api/pedidos — crearPedido
  // ---------------------------------------------------------------------
  describe("POST /api/pedidos", () => {
    it("sin token devuelve 401", async () => {
      const res = await request(app)
        .post("/api/pedidos")
        .send({ items: [{ mueble: 1, cantidad: 1 }] });
      expect(res.status).toBe(401);
    });

    it("crea el pedido correctamente sin enviar 'estado' en el body (regression: PedidoSchema no debe exigir estado)", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 5, precioUnitario: 1000 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 2 }] });

      expect(res.status).toBe(201);
      expect(res.body.data.estado).toBe("pendiente");
      expect(res.body.data.total).toBe(2000);
    });

    it("sin items en el body devuelve 400 de validación", async () => {
      const cliente = await crearUsuario("cliente");
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
    });

    it("con stock insuficiente devuelve 400", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 1, precioUnitario: 1000 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 5 }] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Stock insuficiente/);
    });

    it("con un mueble inactivo devuelve 400", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ activo: false });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 1 }] });

      expect(res.status).toBe(400);
    });
    it.todo(
      "con token de un usuario que ya no existe en la base, responde JSON con status 4xx/5xx controlado (requiere error handler global)",
    );
  });

  // ---------------------------------------------------------------------
  // GET /api/pedidos/pedido/:pedidoId — findPedidoById 
  // ---------------------------------------------------------------------
  describe("GET /api/pedidos/pedido/:pedidoId", () => {
    it("sin token devuelve 401", async () => {
      const res = await request(app).get("/api/pedidos/pedido/1");
      expect(res.status).toBe(401);
    });

    it("el dueño del pedido puede verlo (200)", async () => {
      const cliente = await crearUsuario("cliente");
      const pedido = await crearPedido(cliente, "pendiente");
      const token = tokenPara(cliente);

      const res = await request(app)
        .get(`/api/pedidos/pedido/${pedido.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(pedido.id);
    });

    it("un usuario NO puede ver el pedido de otro usuario (404, no 200 ni 500)", async () => {
      const dueño = await crearUsuario("cliente");
      const intruso = await crearUsuario("cliente");
      const pedido = await crearPedido(dueño, "pendiente");
      const tokenIntruso = tokenPara(intruso);

      const res = await request(app)
        .get(`/api/pedidos/pedido/${pedido.id}`)
        .set("Authorization", `Bearer ${tokenIntruso}`);

      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain(String(pedido.total));
    });

    it("pedido inexistente devuelve 404", async () => {
      const cliente = await crearUsuario("cliente");
      const token = tokenPara(cliente);

      const res = await request(app)
        .get("/api/pedidos/pedido/999999")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------
  // PATCH /api/pedidos/:pedidoId/cancelar — cancelarPedido
  // ---------------------------------------------------------------------
  describe("PATCH /api/pedidos/:pedidoId/cancelar", () => {
    it("sin token devuelve 401", async () => {
      const res = await request(app).patch("/api/pedidos/1/cancelar");
      expect(res.status).toBe(401);
    });

    it("el dueño puede cancelar un pedido pendiente y se repone el stock", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 3, precioUnitario: 500 });
      const stockOriginal = mueble.stock;
      const pedido = await crearPedido(cliente, "pendiente", [
        { mueble, cantidad: 2 },
      ]);
      const token = tokenPara(cliente);

      const res = await request(app)
        .patch(`/api/pedidos/${pedido.id}/cancelar`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.estado).toBe("cancelado");

      await em.refresh(mueble);
      expect(mueble.stock).toBe(stockOriginal + 2);
    });

    it("no se puede cancelar un pedido ajeno (403)", async () => {
      const dueño = await crearUsuario("cliente");
      const intruso = await crearUsuario("cliente");
      const pedido = await crearPedido(dueño, "pendiente");
      const tokenIntruso = tokenPara(intruso);

      const res = await request(app)
        .patch(`/api/pedidos/${pedido.id}/cancelar`)
        .set("Authorization", `Bearer ${tokenIntruso}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/pedido ajeno/);
    });

    it("no se puede cancelar un pedido ya enviado (400)", async () => {
      const cliente = await crearUsuario("cliente");
      const pedido = await crearPedido(cliente, "enviado");
      const token = tokenPara(cliente);

      const res = await request(app)
        .patch(`/api/pedidos/${pedido.id}/cancelar`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se puede cancelar/);
    });

    it("pedido inexistente devuelve 404", async () => {
      const cliente = await crearUsuario("cliente");
      const token = tokenPara(cliente);

      const res = await request(app)
        .patch("/api/pedidos/999999/cancelar")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------
  // Descuento real de stock al crear 
  // ---------------------------------------------------------------------
  describe("POST /api/pedidos — descuento de stock", () => {
    it("descuenta el stock del mueble al crear el pedido", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 5, precioUnitario: 1000 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 2 }] });

      expect(res.status).toBe(201);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(3);
    });

    it("no descuenta stock cuando el pedido falla por stock insuficiente", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 1, precioUnitario: 1000 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 5 }] });

      expect(res.status).toBe(400);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(1);
    });

    it("consolida cantidades repetidas del mismo mueble antes de descontar stock", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 10, precioUnitario: 100 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [
            { mueble: mueble.id, cantidad: 2 },
            { mueble: mueble.id, cantidad: 3 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.total).toBe(500); // (2 + 3) * 100

      await em.refresh(mueble);
      // Debe descontarse 5 en total (2+3), consolidado en un solo
      // UPDATE atómico, no dos descuentos parciales independientes.
      expect(mueble.stock).toBe(5);
    });

    it("con ítems repetidos, si la cantidad consolidada supera el stock, el pedido completo falla (ninguna línea se descuenta)", async () => {
      const cliente = await crearUsuario("cliente");
      // Individualmente cada línea (3 y 3) pasaría contra un stock de 5,
      // pero consolidadas (6) no. El pedido entero debe fallar.
      const mueble = await crearMueble({ stock: 5, precioUnitario: 100 });
      const token = tokenPara(cliente);

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [
            { mueble: mueble.id, cantidad: 3 },
            { mueble: mueble.id, cantidad: 3 },
          ],
        });

      expect(res.status).toBe(400);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(5);
    });
  });

  // ---------------------------------------------------------------------
  // Concurrencia / sobreventa
  // ---------------------------------------------------------------------
  describe("POST /api/pedidos — concurrencia y sobreventa", () => {
    it("con stock=1 y 2 solicitudes simultáneas, solo una tiene éxito y el stock nunca queda negativo", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 1, precioUnitario: 1000 });
      const token = tokenPara(cliente);

      const [r1, r2] = await Promise.all([
        request(app)
          .post("/api/pedidos")
          .set("Authorization", `Bearer ${token}`)
          .send({ items: [{ mueble: mueble.id, cantidad: 1 }] }),
        request(app)
          .post("/api/pedidos")
          .set("Authorization", `Bearer ${token}`)
          .send({ items: [{ mueble: mueble.id, cantidad: 1 }] }),
      ]);

      const estados = [r1.status, r2.status].sort((a, b) => a - b);
      expect(estados).toEqual([201, 400]);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(0);
    });

    it("con stock=3 y 6 solicitudes simultáneas, exactamente 3 tienen éxito y el stock final es 0 (nunca negativo)", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 3, precioUnitario: 500 });
      const token = tokenPara(cliente);

      const solicitudes = Array.from({ length: 6 }, () =>
        request(app)
          .post("/api/pedidos")
          .set("Authorization", `Bearer ${token}`)
          .send({ items: [{ mueble: mueble.id, cantidad: 1 }] }),
      );

      const respuestas = await Promise.all(solicitudes);
      const exitosas = respuestas.filter((r) => r.status === 201);
      const fallidas = respuestas.filter((r) => r.status === 400);

      expect(exitosas).toHaveLength(3);
      expect(fallidas).toHaveLength(3);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // Cancelación por admin (PATCH /:id/estado) y datos sensibles
  // ---------------------------------------------------------------------
  describe("Cancelación por admin y respuesta de creación", () => {
    it("el admin que cancela un pedido repone el stock", async () => {
      const cliente = await crearUsuario("cliente");
      const admin = await crearUsuario("admin");
      const mueble = await crearMueble({ stock: 5, precioUnitario: 300 });
      const tokenCliente = tokenPara(cliente);

      const resCrear = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${tokenCliente}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 3 }] });
      expect(resCrear.status).toBe(201);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(2);

      const res = await request(app)
        .patch(`/api/pedidos/${resCrear.body.data.id}/estado`)
        .set("Authorization", `Bearer ${tokenPara(admin)}`)
        .send({ estado: "cancelado" });

      expect(res.status).toBe(200);
      await em.refresh(mueble);
      expect(mueble.stock).toBe(5);
    });

    it("cambiar el estado de un pedido inexistente devuelve 404", async () => {
      const admin = await crearUsuario("admin");
      const res = await request(app)
        .patch("/api/pedidos/999999999/estado")
        .set("Authorization", `Bearer ${tokenPara(admin)}`)
        .send({ estado: "confirmado" });

      expect(res.status).toBe(404);
    });

    it("la respuesta de crear pedido no expone el passwordHash", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble();

      const res = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${tokenPara(cliente)}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 1 }] });

      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    });

    it("el filtro admin rechaza fechas o estados inválidos con 400", async () => {
      const admin = await crearUsuario("admin");
      const token = tokenPara(admin);

      const resFecha = await request(app)
        .get("/api/pedidos/admin?fechaDesde=no-es-fecha")
        .set("Authorization", `Bearer ${token}`);
      expect(resFecha.status).toBe(400);

      const resEstado = await request(app)
        .get("/api/pedidos/admin?estado=inventado")
        .set("Authorization", `Bearer ${token}`);
      expect(resEstado.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------
  // Ciclo completo: crear (descuenta) + cancelar (repone) sobre el
  // endpoint real, sin bypassear la lógica del controller
  // ---------------------------------------------------------------------
  describe("Ciclo completo crear + cancelar", () => {
    it("el stock final tras crear y cancelar es igual al stock original", async () => {
      const cliente = await crearUsuario("cliente");
      const mueble = await crearMueble({ stock: 4, precioUnitario: 700 });
      const stockOriginal = mueble.stock;
      const token = tokenPara(cliente);

      const resCrear = await request(app)
        .post("/api/pedidos")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ mueble: mueble.id, cantidad: 2 }] });

      expect(resCrear.status).toBe(201);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(stockOriginal - 2);

      const pedidoId = resCrear.body.data.id;
      const resCancelar = await request(app)
        .patch(`/api/pedidos/${pedidoId}/cancelar`)
        .set("Authorization", `Bearer ${token}`);

      expect(resCancelar.status).toBe(200);

      await em.refresh(mueble);
      expect(mueble.stock).toBe(stockOriginal);
    });
  });
});