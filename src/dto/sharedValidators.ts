import { z } from "zod";

export const email = () => z.string().email().min(3).max(99);
export const username = () =>
    z
        .string()
        .regex(/^[a-zA-Z0-9]*$/) // Only letters and numbers are allowed
        .min(3)
        .max(24);
export const validPassword = () => z.string().min(10).max(128);

// Since we are using prisma, we need to differentiate between undefined and null
// null means that the field may be SET to null (empty field)
// undefined means that the field will NOT be changed in the database
// So we can use this validator on any field which may be nullable in the DB
export const nullableString = (max?: number) =>
    z
        .string()
        .max(max || 128)
        .nullish()
        .transform((x) => (x && x.length > 0 ? x : null));

export const modelYear = () => z.coerce.number().min(1885).max(3000);
export const mileage = () => z.coerce.number().min(0);
export const url = () => z.string().url();
