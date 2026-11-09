import { Request, Response } from "express";
import { orm } from "../shared/db/orm.js";
import { handleError } from "../shared/http/handleError.js";
import { validate } from "../shared/validation/validateRequest.js";
import { MuebleSchema } from "../shared/validation/zodSchemas.js";
import { Mueble } from "./mueble.entity.mysql.js";

const em = orm.em;

export const sanitizeMuebleInput = validate(MuebleSchema);
export const sanitizeMueblePatchInput = validate(MuebleSchema.partial());

export async function findAll(req: Request, res: Response) {
  try {
    const mostrarTodos = req.query.inactivos === "true";
    const filtro = mostrarTodos ? {} : { activo: true };

    const muebles = await em.find(Mueble, filtro, {
      populate: ["categoria", "material"],
    });

    res
      .status(200)
      .json({ message: "Todos los muebles encontrados", data: muebles });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al cargar muebles", error: error.name });
  }
}

export async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const mueble = await em.findOne(
      Mueble,
      { id, activo: true },
      { populate: ["categoria", "material"] },
    );

    if (!mueble) {
      return res.status(404).json({ message: "Mueble no encontrado" });
    }

    res.status(200).json({ Message: "Mueble encontrado", data: mueble });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al cargar el mueble", error: error.name });
  }
}

export async function add(req: Request, res: Response) {
  try {
    const dto = req.body.validated;
    const mueble = em.create(Mueble, { ...dto, activo: true });

    await em.flush();
    res.status(201).json({ Message: "Mueble creado", data: mueble });
  } catch (error) {
    handleError(res, error, "Error al crear el mueble");
  }
}

export async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const dto = req.body.validated;

    const mueble = await em.findOneOrFail(
      Mueble,
      { id },
      { populate: ["categoria", "material"] },
    );
    em.assign(mueble, dto);

    await em.flush();
    await em.populate(mueble, ["categoria", "material"]);
    res.status(200).json({ Message: "Mueble actualizado", data: mueble });
  } catch (error) {
    handleError(res, error, "Error al actualizar el mueble");
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const mueble = await em.findOneOrFail(Mueble, { id });

    mueble.activo = false;
    await em.flush();

    res.status(200).json({
      Message: "Mueble dado de baja",
      data: mueble,
    });
  } catch (error) {
    handleError(res, error, "Error al dar de baja el mueble");
  }
}
