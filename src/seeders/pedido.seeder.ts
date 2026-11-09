import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { Pedido } from "../pedido/pedido.entity.mysql.js";
import { Usuario } from "../usuario/usuario.entity.mysql.js";
import { Mueble } from "../mueble/mueble.entity.mysql.js";
import { Item } from "../item/item.entity.mysql.js";

export class PedidoSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const usuarios = await em.find(Usuario, {});
    const muebles = await em.find(Mueble, {});

    const pedidos = [
      {
        usuario: "gokuson",
        estado: "pendiente",
        fechaHora: new Date("2026-05-10"),
        items: [
          {
            mueble: "Cama de roble con cabecera",
            cantidad: 1,
          },
        ],
      },
      {
        usuario: "juanperez",
        estado: "confirmado",
        fechaHora: new Date("2026-06-11"),
        items: [
          {
            mueble: "Mesa de noche minimalista",
            cantidad: 2,
          },
          {
            mueble: "Lámpara de pie con base metálica y pantalla de tela",
            cantidad: 1,
          },
        ],
      },
      {
        usuario: "luffy",
        estado: "pagado",
        fechaHora: new Date("2026-07-1"),
        items: [
          {
            mueble: "Mesa de comedor de roble macizo para 6 personas",
            cantidad: 1,
          },
        ],
      },
      {
        usuario: "vegeta_saiyan",
        estado: "enviado",
        fechaHora: new Date("2026-07-2"),
        items: [
          {
            mueble: "Silla ergonómica tapizada con soporte lumbar ajustable",
            cantidad: 4,
          },
        ],
      },
      {
        usuario: "gokuson",
        estado: "entregado",
        fechaHora: new Date("2026-07-4"),
        items: [
          {
            mueble: "Biblioteca modular adaptable a distintos espacios",
            cantidad: 1,
          },
          {
            mueble: "Mesa de noche minimalista",
            cantidad: 2,
          },
        ],
      },
      {
        usuario: "juanperez",
        estado: "cancelado",
        fechaHora: new Date("2026-07-9"),
        items: [
          {
            mueble:
              "Sillón reclinable de cuero sintético con apoyapiés extensible",
            cantidad: 1,
          },
        ],
      },
    ] as const;

    for (const p of pedidos) {
      const usuario = usuarios.find((u) => u.usuario === p.usuario);

      if (!usuario) {
        throw new Error(`No existe el usuario ${p.usuario}`);
      }

      const existe = await em.findOne(Pedido, {
        usuario: usuario.id,
        fechaHora: p.fechaHora,
      });

      if (existe) {
        continue;
      }

      const pedido = new Pedido();

      pedido.usuario = usuario;
      pedido.estado = p.estado;
      pedido.fechaHora = p.fechaHora;

      let total = 0;

      // Crear items y calcular el total del pedido sin zod
      for (const itemData of p.items) {
        const mueble = muebles.find((m) => m.descripcion === itemData.mueble);

        if (!mueble) {
          throw new Error(`No existe el mueble ${itemData.mueble}`);
        }

        const subtotal = itemData.cantidad * mueble.precioUnitario;

        const item = em.create(Item, {
          pedido,
          mueble,
          cantidad: itemData.cantidad,
          subtotal,
          estado: "pendiente",
        });

        pedido.items.add(item);

        total += subtotal;
      }

      pedido.total = total;

      em.persist(pedido);
    }

    await em.flush();

    console.log("Pedidos creados");
  }
}
