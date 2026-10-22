import { z } from "zod";
import { COUNTRIES, MAX_PER_ORDER } from "./config";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const reservationSchema = z.object({
  slug: text(1, 80),
  ticketTypeId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(MAX_PER_ORDER),
  name: text(2, 80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(120)),
  // Numéro WhatsApp international : chiffres, espaces, + au début
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9]{8,15}$/)),
  country: z.enum(COUNTRIES),
  promo: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v ? v : undefined)),
  terms: z.literal("on"),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
