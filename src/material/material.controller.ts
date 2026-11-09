import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { handleError } from '../shared/http/handleError.js';
import { validate } from '../shared/validation/validateRequest.js';
import { MaterialSchema } from '../shared/validation/zodSchemas.js';
import { Material } from './material.entity.mysql.js';

const em = orm.em;

export const sanitizeMaterialInput = validate(MaterialSchema);
export const sanitizeMaterialPatchInput = validate(MaterialSchema.partial());

export async function findAll(req: Request, res: Response) {
	try {
		const materiales = await em.find(Material, {});
		res
			.status(200)
			.json({ Message: 'Todos los materiales encontrados', data: materiales });
	} catch (error) {
		handleError(res, error, 'Error al cargar materiales');
	}
}

export async function findOne(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const material = await em.findOneOrFail(Material, { id });
		res.status(200).json({ Message: 'Material encontrado', data: material });
	} catch (error) {
		handleError(res, error, 'Error al cargar el material');
	}
}

export async function add(req: Request, res: Response) {
	try {
		const material = em.create(Material, req.body.validated);
		await em.flush();
		res.status(201).json({ Message: 'Material creado', data: material });
	} catch (error) {
		handleError(res, error, 'Error al crear el material');
	}
}

export async function update(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const material = await em.findOneOrFail(Material, { id });
		em.assign(material, req.body.validated);
		await em.flush();
		res.status(200).json({ Message: 'Material actualizado', data: material });
	} catch (error) {
		handleError(res, error, 'Error al actualizar el material');
	}
}

export async function remove(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const material = await em.findOneOrFail(Material, { id });
		// Si tiene muebles asociados la base rechaza el borrado y se responde 409
		await em.removeAndFlush(material);
		res.status(200).json({ Message: 'Material eliminado', data: material });
	} catch (error) {
		handleError(res, error, 'Error al eliminar el material');
	}
}
