import { Request, Response } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { orm } from "../shared/db/orm.js";
import { handleError } from "../shared/http/handleError.js";
import { logger } from "../shared/logger.js";
import { Pedido } from "../pedido/pedido.entity.mysql.js";
import { Pago } from "./pago.entity.mysql.js";

const em = orm.em;

const mp = new MercadoPagoConfig({
  accessToken: process.env.SELLER_ACCESS_TOKEN!,
});

// Estados desde los que se puede pagar un pedido
const ESTADOS_PAGABLES: Pedido["estado"][] = ["pendiente", "confirmado"];

export async function crearPreferencia(req: Request, res: Response) {
  try {
    const pedidoId = Number(req.params.pedidoId);
    const pedido = await em.findOneOrFail(
      Pedido,
      { id: pedidoId },
      { populate: ["items.mueble", "pago"] },
    );

    // Solo el dueño del pedido puede pagarlo
    if (pedido.usuario.id !== req.user!.id) {
      return res
        .status(403)
        .json({ message: "No podés pagar un pedido ajeno" });
    }

    if (!ESTADOS_PAGABLES.includes(pedido.estado)) {
      return res.status(400).json({
        message: `No se puede pagar un pedido en estado '${pedido.estado}'`,
      });
    }

    const preference = new Preference(mp);

    const response = await preference.create({
      body: {
        items: pedido.items.getItems().map((item) => ({
          id: String(item.id),
          title: item.mueble.etiqueta,
          quantity: item.cantidad,
          // Precio guardado al crear el pedido, no el precio actual del mueble,
          // para que lo cobrado coincida con pedido.total
          unit_price: Number(item.subtotal) / item.cantidad,
        })),
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pedidos`,
          failure: `${process.env.FRONTEND_URL}/carrito`,
          pending: `${process.env.FRONTEND_URL}/pedidos`,
        },
        notification_url: `${process.env.BACKEND_URL}/api/pagos/webhook`,
        external_reference: String(pedidoId),
      },
    });

    // Un solo Pago por pedido: si se reintenta, se reutiliza el existente
    if (pedido.pago) {
      pedido.pago.importe = pedido.total;
    } else {
      pedido.pago = em.create(Pago, {
        metodoPago: "mercadopago",
        importe: pedido.total,
      });
    }
    await em.flush();

    res.status(201).json({
      message: "Preferencia creada",
      checkoutUrl: response.init_point,
      preferenceId: response.id,
    });
  } catch (error: any) {
    logger.error("Error MP", error?.cause ?? error);
    handleError(res, error, "Error al crear la preferencia de pago");
  }
}

export async function webhook(req: Request, res: Response) {
  try {
    const { type, data } = req.body ?? {};

    if (type !== "payment" || !data?.id) {
      return res.status(200).send();
    }

    // Consultamos el pago a MercadoPago: no se confía en el body recibido
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(data.id)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SELLER_ACCESS_TOKEN}`,
        },
      },
    );
    if (!mpResponse.ok) {
      logger.error(
        `Webhook MP: no se pudo consultar el pago ${data.id} (${mpResponse.status})`,
      );
      // 502 hace que MercadoPago reintente la notificación más tarde
      return res.status(502).send();
    }
    const payment = await mpResponse.json();

    if (payment.status !== "approved") {
      return res.status(200).send();
    }

    const pedidoId = Number(payment.external_reference);
    const pedido = await em.findOne(Pedido, { id: pedidoId });
    if (!pedido) {
      logger.warn(`Webhook MP: pedido ${payment.external_reference} no existe`);
      return res.status(200).send();
    }

    if (pedido.estado === "pagado") {
      return res.status(200).send(); // notificación repetida
    }

    if (!ESTADOS_PAGABLES.includes(pedido.estado)) {
      // Ej: el pedido se canceló (y se devolvió el stock) pero el pago entró igual
      logger.warn(
        `Webhook MP: pago aprobado para el pedido ${pedido.id} en estado '${pedido.estado}', requiere revisión manual`,
      );
      return res.status(200).send();
    }

    const montoPagado = Number(payment.transaction_amount);
    if (!(montoPagado + 0.01 >= Number(pedido.total))) {
      logger.warn(
        `Webhook MP: el pago ${data.id} (${montoPagado}) no cubre el total del pedido ${pedido.id} (${pedido.total})`,
      );
      return res.status(200).send();
    }

    pedido.estado = "pagado";
    await em.flush();

    res.status(200).send();
  } catch (error) {
    handleError(res, error, "Error al procesar el webhook de pago");
  }
}
