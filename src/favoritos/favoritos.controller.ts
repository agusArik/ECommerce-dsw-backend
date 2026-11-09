import { Request, Response } from "express";
import { Usuario } from "../usuario/usuario.entity.mysql.js";
import { Mueble } from "../mueble/mueble.entity.mysql.js";
import { orm } from "../shared/db/orm.js";
import { Favorito } from "./favoritos.entity.mysql.js";
import { validate } from "../shared/validation/validateRequest.js";
import { FavoritoSchema } from "../shared/validation/zodSchemas.js";

const em = orm.em;

export const sanitizeFavoritoInput = validate(FavoritoSchema);

export async function addFavorito(req: Request, res: Response) {
  try {
    // Se usa el :id de la URL (ya validado por requireSelfOrAdmin), así un
    // admin agrega el favorito al usuario indicado y no a su propia cuenta.
    const usuarioId = Number.parseInt(req.params.id);
    const muebleId = Number(req.body.validated.mueble);

    const usuario = await em.findOneOrFail(Usuario, { id: usuarioId });
    const mueble = await em.findOne(Mueble, { id: muebleId, activo: true });
    if (!mueble) {
      return res.status(404).json({ message: "Mueble no encontrado" });
    }

    const existente = await em.findOne(Favorito, { usuario, mueble });
    if (existente) {
      return res
        .status(409)
        .json({ message: "El mueble ya está en favoritos", data: existente });
    }

    const favorito = em.create(Favorito, { usuario, mueble });

    await em.flush();
    res.status(201).json({ message: "Favorito agregado", data: favorito });
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res
      .status(500)
      .json({ message: "Error al agregar favorito", error: error.message });
  }
}

// GET /:id/favoritos/mueble/:idMueble
// Antes reutilizaba findOne de mueble, que leía req.params.id (el id del
// usuario) y devolvía el mueble equivocado.
export async function findFavoritoMueble(req: Request, res: Response) {
  try {
    const usuarioId = Number.parseInt(req.params.id);
    const muebleId = Number.parseInt(req.params.idMueble);

    const favorito = await em.findOne(
      Favorito,
      { usuario: usuarioId, mueble: muebleId },
      { populate: ["mueble.categoria", "mueble.material"] },
    );
    if (!favorito) {
      return res.status(404).json({ message: "Favorito no encontrado" });
    }

    res
      .status(200)
      .json({ message: "Mueble favorito encontrado", data: favorito.mueble });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al obtener favorito", error: error.message });
  }
}

export async function findAllFavoritos(req: Request, res: Response) {
  try {
    const idUsuario = Number.parseInt(req.params.id);
    const usuario = await em.findOneOrFail(Usuario, { id: idUsuario });
    const favoritos = await em.find(
      Favorito,
      { usuario: usuario },
      { populate: ["mueble"] },
    );
    res.status(200).json({ message: "Lista de favoritos", data: favoritos });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al listar favoritos", error: error.message });
  }
}

export async function removeFavorito(req: Request, res: Response) {
  try {
    const idSolicitado = Number.parseInt(req.params.id);
    const muebleId = Number.parseInt(req.params.muebleId);
    const esAdmin = req.user!.rol === "admin";

    const usuarioId = esAdmin ? idSolicitado : req.user!.id;

    // Se devuelve 403 explícito en vez de dejar que el findOneOrFail de bajo caiga en un 404
    if (!esAdmin && idSolicitado !== req.user!.id) {
      return res.status(403).json({
        message: "No podés eliminar favoritos de otra cuenta",
      });
    }

    const favorito = await em.findOneOrFail(Favorito, {
      usuario: usuarioId,
      mueble: muebleId,
    });

    await em.removeAndFlush(favorito);
    res.status(200).json({ message: "Favorito eliminado" });
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        message: "Favorito no encontrado",
      });
    }
    return res
      .status(500)
      .json({ message: "Error al eliminar favorito", error: error.message });
  }
}