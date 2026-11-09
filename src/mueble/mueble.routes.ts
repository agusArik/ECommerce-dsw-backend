import { Router } from "express";
import {
  add,
  findAll,
  findOne,
  remove,
  sanitizeMuebleInput,
  sanitizeMueblePatchInput,
  update,
} from "./mueble.controller.js";
import { requireRole, verifyToken } from "../auth/auth.middleware.js";

export const muebleRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Muebles
 *   description: Gestión de muebles
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Mueble:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         descripcion:
 *           type: string
 *         stock:
 *           type: integer
 *         etiqueta:
 *           type: string
 *         precio_unitario:
 *           type: number
 *         imagenes:
 *           type: string
 *         categoria_id:
 *           type: integer
 *         material_id:
 *           type: integer
 *     MuebleInput:
 *       type: object
 *       required: [descripcion, stock, etiqueta, precio_unitario, categoria_id, material_id]
 *       properties:
 *         descripcion:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *         stock:
 *           type: integer
 *           minimum: 0
 *         etiqueta:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         precio_unitario:
 *           type: number
 *           minimum: 0
 *         imagenes:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *             format: uri
 *         categoria:
 *           type: integer
 *         material:
 *           type: integer
 */

/**
 * @swagger
 * /api/muebles:
 *   post:
 *     summary: Crear mueble (admin)
 *     tags: [Muebles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MuebleInput'
 *     responses:
 *       201:
 *         description: Mueble creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Acceso denegado
 *   get:
 *     summary: Encontrar todos los muebles
 *     tags: [Muebles]
 *     security: []
 *     responses:
 *       200:
 *         description: Listado de muebles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Mueble'
 */

/**
 * @swagger
 * /api/muebles/{id}:
 *   get:
 *     summary: Obtener un mueble por ID
 *     tags: [Muebles]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mueble encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mueble'
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Mueble no encontrado
 *   put:
 *     summary: Actualizar un mueble completo
 *     tags: [Muebles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MuebleInput'
 *     responses:
 *       200:
 *         description: Mueble actualizado
 *       401:
 *         description: Token requerido
 *   patch:
 *     summary: Actualizar un mueble parcialmente
 *     tags: [Muebles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MuebleInput'
 *     responses:
 *       200:
 *         description: Mueble actualizado
 *       401:
 *         description: Token requerido
 *   delete:
 *     summary: Eliminar un mueble (solo admin)
 *     tags: [Muebles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mueble eliminado
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Acceso denegado
 */

// Públicas
muebleRouter.get("/", findAll);
muebleRouter.get("/:id", findOne);

// Admin
muebleRouter.post(
  "/",
  verifyToken,
  requireRole("admin"),
  sanitizeMuebleInput,
  add,
);
muebleRouter.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  sanitizeMuebleInput,
  update,
);
muebleRouter.patch(
  "/:id",
  verifyToken,
  requireRole("admin"),
  sanitizeMueblePatchInput,
  update,
);
muebleRouter.delete("/:id", verifyToken, requireRole("admin"), remove);
