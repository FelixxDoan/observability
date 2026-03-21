import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .transform((value) => value.toLowerCase());

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(54, "Name must be at most 54 characters");

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username is required")
  .max(54, "Username must be at most 54 characters")
  .regex(/^\S+$/, "Username must not contain spaces");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");