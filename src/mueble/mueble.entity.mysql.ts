import {
	Cascade,
	Collection,
	Entity,
	ManyToOne,
	OneToMany,
	Property,
	Rel,
} from '@mikro-orm/core';
import { Categoria } from '../categoria/categoria.entity.mysql.js';
import { Favorito } from '../favoritos/favoritos.entity.mysql.js';
import { Item } from '../item/item.entity.mysql.js';
import { Material } from '../material/material.entity.mysql.js';
import { BaseEntity } from '../shared/db/baseEntity.entity.mysql.js';

@Entity()
export class Mueble extends BaseEntity {
	@Property()
	descripcion!: string;

	@Property()
	stock!: number;

	@Property()
	etiqueta!: string;

	@Property({ type: 'decimal', precision: 10, scale: 2 })
	precioUnitario!: number;

	@Property()
	imagenes!: string[]; // Array of image URLs or file paths

	@Property({ default: true })
	activo: boolean = true;

	@ManyToOne(() => Categoria)
	categoria!: Rel<Categoria>;

	@ManyToOne(() => Material)
	material!: Rel<Material>;

	// item es una entidad que representa una relacion con atributos
	// Sin REMOVE: los ítems son historial de pedidos y no deben borrarse con el mueble
	@OneToMany(() => Item, (item) => item.mueble, {
		cascade: [Cascade.PERSIST],
	})
	items? = new Collection<Item>(this);

	@OneToMany(() => Favorito, (favorito) => favorito.mueble, {
		cascade: [Cascade.REMOVE],
	})
	favoritos? = new Collection<Favorito>(this);
}
