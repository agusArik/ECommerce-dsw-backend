import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(64, "Se ha excedido el número máximo de caracteres")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número");

const RolSchema = z.enum(["cliente", "admin"]);

export type Rol = z.infer<typeof RolSchema>;

// crear un schema Zod para el body con el estado permitido.
export const EstadoPedidoSchema = z.enum([
  "pendiente",
  "confirmado",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
]);
export type estadoPedido = z.infer<typeof EstadoPedidoSchema>;

export const updateEstadoPedidoSchema = z.object({
  estado: EstadoPedidoSchema,
});

export const UsuarioSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  direccion: z.string(),
  telefono: z.string().min(8),
  dni: z.string().min(8),
  usuario: z.string().min(3),
  email: z.email(),
  contrasenia: PasswordSchema,
  rol: RolSchema,
  fondos: z.number().nonnegative(),
});

// Lo que un cliente puede editar de su propia cuenta: sin rol ni fondos.
export const UsuarioSelfSchema = UsuarioSchema.omit({ rol: true, fondos: true });

export const RegistroSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  direccion: z.string(),
  telefono: z.string().min(8),
  dni: z.string().min(8),
  usuario: z.string().min(3),
  email: z.email(),
  contrasenia: PasswordSchema,
});

export const LoginSchema = z.object({
  email: z.email(),
  contrasenia: PasswordSchema,
});

export const CategoriaSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().min(5).max(255),
});

export const MaterialSchema = z.object({
  nroMaterial: z.string().min(1),
  nombre: z.string().min(2),
});

export const MuebleSchema = z.object({
  descripcion: z.string().min(10).max(255), // la columna es varchar(255)
  stock: z.number().int().nonnegative(),
  etiqueta: z.string().min(2).max(50),
  precioUnitario: z.number().nonnegative(),
  imagenes: z.array(z.url()).min(1),
  categoria: z.number().int().positive(),
  material: z.number().int().positive(),
});

export const DescuentoSchema = z.object({
  codigo: z.string().min(2),
  tipo: z.enum(["Cantidad", "Monto"]),
  porcentaje: z.number().int().min(0).max(100), // la columna es int
  descripcion: z.string().min(5).max(255).optional(),
  fechaExpiracion: z.coerce.date().optional(), // acepta un string ISO del JSON
});

export const FavoritoSchema = z.object({
  mueble: z.number().int().positive(),
});

export const ItemInputSchema = z.object({
  mueble: z.number().int().positive(),
  cantidad: z.number().int().positive(),
});

export const PedidoSchema = z.object({
  items: z.array(ItemInputSchema).min(1, "Debe haber al menos un item"),
  pago: z.number().int().positive().optional(),
});
