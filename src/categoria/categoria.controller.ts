import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { handleError } from '../shared/http/handleError.js';
import { validate } from '../shared/validation/validateRequest.js';
import { CategoriaSchema } from '../shared/validation/zodSchemas.js';
import { Categoria } from './categoria.entity.mysql.js';

const em = orm.em;

export const sanitizeCategoriaInput = validate(CategoriaSchema);
export const sanitizeCategoriaPatchInput = validate(CategoriaSchema.partial());

export async function findAll(req: Request, res: Response) {
	try {
		const categorias = await em.find(Categoria, {});
		res
			.status(200)
			.json({ Message: 'Todos las categorias encontrados', data: categorias });
	} catch (error) {
		handleError(res, error, 'Error al cargar categorias');
	}
}

export async function findOne(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const categoria = await em.findOneOrFail(Categoria, { id });
		res.status(200).json({ Message: 'Categoria encontrada', data: categoria });
	} catch (error) {
		handleError(res, error, 'Error al cargar la categoria');
	}
}

export async function add(req: Request, res: Response) {
	try {
		const categoria = em.create(Categoria, req.body.validated);
		await em.flush();
		res.status(201).json({ Message: 'Categoria creada', data: categoria });
	} catch (error) {
		handleError(res, error, 'Error al crear la categoria');
	}
}

export async function update(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const categoria = await em.findOneOrFail(Categoria, { id });
		em.assign(categoria, req.body.validated);
		await em.flush();
		res.status(200).json({ Message: 'Categoria actualizada', data: categoria });
	} catch (error) {
		handleError(res, error, 'Error al actualizar la categoria');
	}
}

export async function remove(req: Request, res: Response) {
	try {
		const id = Number.parseInt(req.params.id);
		const categoria = await em.findOneOrFail(Categoria, { id });
		// Si tiene muebles asociados la base rechaza el borrado y se responde 409
		await em.removeAndFlush(categoria);
		res.status(200).json({ Message: 'Categoria eliminada', data: categoria });
	} catch (error) {
		handleError(res, error, 'Error al eliminar la categoria');
	}
}
