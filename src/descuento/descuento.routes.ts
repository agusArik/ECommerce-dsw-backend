import { Router } from 'express';
import {
	add,
	findAll,
	findOne,
	remove,
	sanitizeDescuentoInput,
	sanitizeDescuentoPatchInput,
	update,
} from './descuento.controller.js';
import { requireRole, verifyToken } from '../auth/auth.middleware.js';

export const descuentoRouter = Router();

// Todo el módulo es solo para admin: los códigos de descuento no deben ser públicos
descuentoRouter.use(verifyToken, requireRole('admin'));

descuentoRouter.get('/', findAll);
descuentoRouter.get('/:id', findOne);
descuentoRouter.post('/', sanitizeDescuentoInput, add);
descuentoRouter.put('/:id', sanitizeDescuentoInput, update);
descuentoRouter.patch('/:id', sanitizeDescuentoPatchInput, update);
descuentoRouter.delete('/:id', remove);
