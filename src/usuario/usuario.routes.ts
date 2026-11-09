import { Router } from "express";
import {
  requireRole,
  requireSelfOrAdmin,
  verifyToken,
} from "../auth/auth.middleware.js";
import {
  addFavorito,
  findAllFavoritos,
  findFavoritoMueble,
  removeFavorito,
  sanitizeFavoritoInput,
} from "../favoritos/favoritos.controller.js";
import {
  add,
  findAll,
  findOne,
  remove,
  sanitizeClientInput,
  sanitizeClientPatchInput,
  perfil,
  update,
  sanitizeRegistroInput,
} from "./usuario.controller.js";

export const usuarioRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios y favoritos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         email:
 *           type: string
 *         telefono:
 *           type: string
 *         direccion:
 *           type: string
 *         rol:
 *           type: string
 *           enum: [cliente, admin]
 *         fondos:
 *           type: number
 *     UsuarioInput:
 *       type: object
 *       required: [nombre, apellido, direccion, telefono, dni, usuario, email, contrasenia, rol, fondos]
 *       properties:
 *         nombre:
 *           type: string
 *           minLength: 2
 *         apellido:
 *           type: string
 *           minLength: 2
 *         direccion:
 *           type: string
 *         telefono:
 *           type: string
 *           minLength: 8
 *         dni:
 *           type: string
 *           minLength: 8
 *         usuario:
 *           type: string
 *           minLength: 3
 *         email:
 *           type: string
 *           format: email
 *         contrasenia:
 *           type: string
 *           minLength: 8
 *           maxLength: 64
 *         rol:
 *           type: string
 *           enum: [cliente, admin]
 *         fondos:
 *           type: number
 */

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Usuarios]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 *   get:
 *     summary: Obtener todos los usuarios (solo admin)
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Acceso denegado
 */

/**
 * @swagger
 * /api/clientes/perfil:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token requerido
 */

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualizar un usuario completo
 *     tags: [Usuarios]
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
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       401:
 *         description: Token requerido
 *   patch:
 *     summary: Actualizar un usuario parcialmente
 *     tags: [Usuarios]
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
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       401:
 *         description: Token requerido
 *   delete:
 *     summary: Eliminar un usuario (solo admin)
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Acceso denegado
 */

/**
 * @swagger
 * /api/clientes/{id}/favoritos:
 *   get:
 *     summary: Obtener favoritos del usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de favoritos
 *       401:
 *         description: Token requerido
 *   post:
 *     summary: Agregar un mueble a favoritos
 *     tags: [Usuarios]
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
 *             type: object
 *             required: [muebleId]
 *             properties:
 *               muebleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Favorito agregado
 *       401:
 *         description: Token requerido
 */

/**
 * @swagger
 * /api/clientes/{id}/favoritos/{muebleId}:
 *   delete:
 *     summary: Eliminar un mueble de favoritos
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: muebleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Favorito eliminado
 *       401:
 *         description: Token requerido
 */

/**
 * @swagger
 * /api/clientes/{id}/favoritos/mueble/{idMueble}:
 *   get:
 *     summary: Obtener un mueble específico de favoritos
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: idMueble
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mueble encontrado
 *       401:
 *         description: Token requerido
 */

usuarioRouter.get(
  "/:id/favoritos/",
  verifyToken,
  requireSelfOrAdmin,
  findAllFavoritos,
);
usuarioRouter.get(
  "/:id/favoritos/mueble/:idMueble",
  verifyToken,
  requireSelfOrAdmin,
  findFavoritoMueble,
);
usuarioRouter.post(
  "/:id/favoritos/",
  verifyToken,
  requireSelfOrAdmin,
  sanitizeFavoritoInput,
  addFavorito,
);
usuarioRouter.delete(
  "/:id/favoritos/:muebleId",
  verifyToken,
  requireSelfOrAdmin,
  removeFavorito,
);

// CRUD independiente: /api/clientes
// CRUD — registro público, resto protegido
usuarioRouter.post("/", sanitizeRegistroInput, add); // público: registro
usuarioRouter.get("/", verifyToken, requireRole("admin"), findAll); // solo admin
usuarioRouter.get("/perfil", verifyToken, perfil);
usuarioRouter.get("/:id", verifyToken, requireSelfOrAdmin, findOne); // autenticado
usuarioRouter.put(
  "/:id",
  verifyToken,
  requireSelfOrAdmin,
  sanitizeClientInput,
  update,
); // autenticado
usuarioRouter.patch(
  "/:id",
  verifyToken,
  requireSelfOrAdmin,
  sanitizeClientPatchInput,
  update,
); // autenticado
usuarioRouter.delete("/:id", verifyToken, requireRole("admin"), remove);