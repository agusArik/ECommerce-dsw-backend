import { Router } from "express";
import {
  add,
  findAll,
  findOne,
  remove,
  sanitizeCategoriaInput,
  sanitizeCategoriaPatchInput,
  update,
} from "./categoria.controller.js";
import { requireRole, verifyToken } from "../auth/auth.middleware.js";

export const categoriaRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Categorias
 *   description: Gestión de categorías de muebles
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Categoria:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         descripcion:
 *           type: string
 *     CategoriaInput:
 *       type: object
 *       required: [nombre, descripcion]
 *       properties:
 *         nombre:
 *           type: string
 *           minLength: 2
 *         descripcion:
 *           type: string
 *           minLength: 5
 *           maxLength: 255
 */

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Obtener todas las categorías
 *     tags: [Categorias]
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Categoria'
 *   post:
 *     summary: Crear una categoría
 *     tags: [Categorias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoriaInput'
 *     responses:
 *       201:
 *         description: Categoría creada
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token requerido
 */

/**
 * @swagger
 * /api/categorias/{id}:
 *   get:
 *     summary: Obtener una categoría por ID
 *     tags: [Categorias]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Categoria'
 *       404:
 *         description: Categoría no encontrada
 *   put:
 *     summary: Actualizar una categoría completa
 *     tags: [Categorias]
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
 *             $ref: '#/components/schemas/CategoriaInput'
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       401:
 *         description: Token requerido
 *   patch:
 *     summary: Actualizar una categoría parcialmente
 *     tags: [Categorias]
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
 *             $ref: '#/components/schemas/CategoriaInput'
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       401:
 *         description: Token requerido
 *   delete:
 *     summary: Eliminar una categoría
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoría eliminada
 *       401:
 *         description: Token requerido
 */

// Públicas
categoriaRouter.get("/", findAll);
categoriaRouter.get("/:id", findOne);

// Admin
const soloAdmin = [verifyToken, requireRole("admin")];
categoriaRouter.post("/", ...soloAdmin, sanitizeCategoriaInput, add);
categoriaRouter.put("/:id", ...soloAdmin, sanitizeCategoriaInput, update);
categoriaRouter.patch("/:id", ...soloAdmin, sanitizeCategoriaPatchInput, update);
categoriaRouter.delete("/:id", ...soloAdmin, remove);
