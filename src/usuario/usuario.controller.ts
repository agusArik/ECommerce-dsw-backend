import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { orm } from "../shared/db/orm.js";
import { handleError } from "../shared/http/handleError.js";
import { validate } from "../shared/validation/validateRequest.js";
import {
  RegistroSchema,
  UsuarioSchema,
  UsuarioSelfSchema,
} from "../shared/validation/zodSchemas.js";
import { Usuario } from "./usuario.entity.mysql.js";

const em = orm.em;

// Solo un admin puede cambiar rol y fondos. Para un cliente se usa un schema
// sin esos campos (Zod los descarta), así no puede hacerse admin a sí mismo.
function validateSegunRol(
  adminSchema: Parameters<typeof validate>[0],
  clienteSchema: Parameters<typeof validate>[0],
) {
  const validarAdmin = validate(adminSchema);
  const validarCliente = validate(clienteSchema);
  return (req: Request, res: Response, next: NextFunction) =>
    req.user?.rol === "admin"
      ? validarAdmin(req, res, next)
      : validarCliente(req, res, next);
}

export const sanitizeClientInput = validateSegunRol(
  UsuarioSchema,
  UsuarioSelfSchema,
);
export const sanitizeClientPatchInput = validateSegunRol(
  UsuarioSchema.partial(),
  UsuarioSelfSchema.partial(),
);
export const sanitizeRegistroInput = validate(RegistroSchema);

export async function findAll(req: Request, res: Response) {
  try {
    const usuarios = await em.find(
      Usuario,
      {},
      { populate: ["pedidos", "favoritos"] },
    );
    const safeUsuarios = usuarios.map(({ passwordHash: _, ...rest }) => rest);
    res.status(200).json({ message: "find all usuarios", data: safeUsuarios });
  } catch (error) {
    handleError(res, error, "Error al procesar el usuario");
  }
}

export async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const usuario = await em.findOneOrFail(
      Usuario,
      { id },
      { populate: ["pedidos", "favoritos"] },
    );
    const { passwordHash: _, ...safeData } = usuario;
    res.status(200).json({ message: "find one usuario", data: safeData });
  } catch (error) {
    handleError(res, error, "Error al procesar el usuario");
  }
}

export async function add(req: Request, res: Response) {
  try {
    const { contrasenia, ...rest } = req.body.validated; // no le pasa la contra en texto plano
    const passwordHash = await bcrypt.hash(contrasenia, 10); // encripta la misma contra

    const usuario = em.create(Usuario, {
      ...rest,
      passwordHash,
      rol: "cliente",
      fondos: 0,
    }); // añade la contra hasheada al cliente
    await em.flush();

    const { passwordHash: _, ...safeData } = usuario;
    res.status(201).json({
      message: "Usuario creado exitosamente",
      data: safeData,
    });
  } catch (error) {
    handleError(res, error, "Error al procesar el usuario");
  }
}

// En update, solo hasheamos si viene contrasenia en el body (PATCH puede no traerla):
export async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const usuario = await em.findOneOrFail(Usuario, { id });

    const { contrasenia, ...rest } = req.body.validated;
    const updates: any = { ...rest };

    if (contrasenia) {
      updates.passwordHash = await bcrypt.hash(contrasenia, 10);
    }

    em.assign(usuario, updates);
    await em.flush();

    const { passwordHash: _, ...safeData } = usuario as any;

    res.status(200).json({
      message: "Usuario actualizado exitosamente",
      data: safeData,
    });
  } catch (error) {
    handleError(res, error, "Error al procesar el usuario");
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const usuario = await em.findOneOrFail(Usuario, { id });
    // Si tiene pedidos la base rechaza el borrado (409): el historial se conserva
    await em.removeAndFlush(usuario);
    res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    handleError(res, error, "Error al eliminar el usuario");
  }
}

export async function perfil(req: Request, res: Response) {
  try {
    const usuario = await em.findOneOrFail(
      Usuario,
      { id: req.user!.id },
      { populate: ["pedidos", "favoritos"] },
    );

    const { passwordHash: _, ...safeData } = usuario;

    res.status(200).json({
      message: "Perfil obtenido",
      data: safeData,
    });
  } catch (error) {
    handleError(res, error, "Error al procesar el usuario");
  }
}
