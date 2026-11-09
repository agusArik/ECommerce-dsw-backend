import {
	Cascade,
	Collection,
	Entity,
	OneToMany,
	Property,
} from '@mikro-orm/core';
import { Mueble } from '../mueble/mueble.entity.mysql.js';
import { BaseEntity } from '../shared/db/baseEntity.entity.mysql.js';

@Entity()
export class Material extends BaseEntity {
	@Property({ unique: true })
	nroMaterial!: string;

	@Property()
	nombre!: string;

	@OneToMany(() => Mueble, (mueble) => mueble.material, {
		cascade: [Cascade.PERSIST], // sin REMOVE: no borra muebles en cascada
	})
	muebles = new Collection<Mueble>(this);
}
