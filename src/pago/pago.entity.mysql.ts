import { Collection, Entity, OneToMany, Property } from "@mikro-orm/core";
import { Pedido } from "../pedido/pedido.entity.mysql.js";
import { BaseEntity } from "../shared/db/baseEntity.entity.mysql.js";

@Entity()
export class Pago extends BaseEntity {
  @Property()
  metodoPago!: string;

  @Property({ type: "decimal", precision: 10, scale: 2 })
  importe!: number;

  @OneToMany(() => Pedido, (pedido) => pedido.pago)
  pedidos = new Collection<Pedido>(this);
}
