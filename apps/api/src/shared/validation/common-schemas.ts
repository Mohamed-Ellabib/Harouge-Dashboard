import { z } from "zod";

export const mongoObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "This field is required");

export const optionalTrimmedStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Expected a valid ISO date string");

export function enumSchema<TValue extends string>(
  values: readonly [TValue, ...TValue[]],
  message = "Invalid enum value"
) {
  return z.enum(values, { error: message });
}
