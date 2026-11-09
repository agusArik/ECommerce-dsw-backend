import { RequestContext } from "@mikro-orm/core";
import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./auth/auth.routes.js";
import { categoriaRouter } from "./categoria/categoria.routes.js";
import { descuentoRouter } from "./descuento/descuento.routes.js";
import { materialRouter } from "./material/material.routes.js";
import { muebleRouter } from "./mueble/mueble.routes.js";
import { pedidoRouter } from "./pedido/pedido.routes.js";
import { usuarioRouter } from "./usuario/usuario.routes.js";
import { pagoRouter } from "./pago/pago.routes.js";
import { orm } from "./shared/db/orm.js";
import { errorMiddleware } from "./shared/http/handleError.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    RequestContext.create(orm.em, next);
  });

  app.use(
    cors({
      origin: [
        "https://muebleria-ecommerce-dsw.netlify.app",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  // Detrás de un proxy (Render, Railway, etc.) hay que confiar en él para
  // que el rate limit vea la IP real del cliente y no la del proxy.
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
  }

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { message: "Demasiadas solicitudes, intenta más tarde" },
      // MercadoPago no debe quedar bloqueado por el límite
      skip: (req) => req.originalUrl.startsWith("/api/pagos/webhook"),
    }),
  );

  app.use(cookieParser());
  app.use(helmet());

  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Mueblería Ecommerce API",
        version: "1.0.0",
        description: "Documentación de la API de Mueblería",
      },
      contact: {
        name: "La Mueblería DSW",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Servidor Local",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ["./dist/src/**/*.routes.js"],
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  app.use("/api/clientes", usuarioRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/pedidos", pedidoRouter);
  app.use("/api/categorias", categoriaRouter);
  app.use("/api/materiales", materialRouter);
  app.use("/api/muebles", muebleRouter);
  app.use("/api/descuentos", descuentoRouter);
  app.use("/api/pagos", pagoRouter);

  app.use(errorMiddleware);

  return app;
}
