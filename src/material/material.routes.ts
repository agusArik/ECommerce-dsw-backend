import { Router } from "express";
import {
  add,
  findAll,
  findOne,
  remove,
  update,
  sanitizeMaterialInput,
  sanitizeMaterialPatchInput,
} from "./material.controller.js";
import { requireRole, verifyToken } from "../auth/auth.middleware.js";

export const materialRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Materiales
 *   description: Gestión de materiales de muebles
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Material:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nroMaterial:
 *           type: string
 *         nombre:
 *           type: string
 *     MaterialInput:
 *       type: object
 *       required: [nroMaterial, nombre]
 *       properties:
 *         nroMaterial:
 *           type: string
 *           minLength: 1
 *         nombre:
 *           type: string
 *           minLength: 2
 */

/**
 * @swagger
 * /api/materiales:
 *   get:
 *     summary: Obtener todos los materiales
 *     tags: [Materiales]
 *     security: []
 *     responses:
 *       200:
 *         description: Lista de materiales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Material'
 *   post:
 *     summary: Crear un material
 *     tags: [Materiales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaterialInput'
 *     responses:
 *       201:
 *         description: Material creado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token requerido
 */

/**
 * @swagger
 * /api/materiales/{id}:
 *   get:
 *     summary: Obtener un material por ID
 *     tags: [Materiales]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Material encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Material'
 *       404:
 *         description: Material no encontrado
 *   put:
 *     summary: Actualizar un material completo
 *     tags: [Materiales]
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
 *             $ref: '#/components/schemas/MaterialInput'
 *     responses:
 *       200:
 *         description: Material actualizado
 *       401:
 *         description: Token requerido
 *   patch:
 *     summary: Actualizar un material parcialmente
 *     tags: [Materiales]
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
 *             $ref: '#/components/schemas/MaterialInput'
 *     responses:
 *       200:
 *         description: Material actualizado
 *       401:
 *         description: Token requerido
 *   delete:
 *     summary: Eliminar un material
 *     tags: [Materiales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Material eliminado
 *       401:
 *         description: Token requerido
 */

// Públicas
materialRouter.get("/", findAll);
materialRouter.get("/:id", findOne);

// Admin
const soloAdmin = [verifyToken, requireRole("admin")];
materialRouter.post("/", ...soloAdmin, sanitizeMaterialInput, add);
materialRouter.put("/:id", ...soloAdmin, sanitizeMaterialInput, update);
materialRouter.patch("/:id", ...soloAdmin, sanitizeMaterialPatchInput, update);
materialRouter.delete("/:id", ...soloAdmin, remove);
