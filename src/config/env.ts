import { z } from "zod";

const envSchema = z.object({
  PACKAGE_NAME: z.string().min(1),
  MENTRAOS_API_KEY: z.string().min(1),
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  MENTRA_INTERNAL_PORT: z.string().default("3099").transform((val) => parseInt(val, 10)),
  DEBUG: z.string().default("false").transform((val) => val === "true" || val === "1"),
});

const env = envSchema.parse(process.env);

export const config = {
  packageName: env.PACKAGE_NAME,
  apiKey: env.MENTRAOS_API_KEY,
  port: env.PORT,
  internalPort: env.MENTRA_INTERNAL_PORT,
  debug: env.DEBUG,
};

export function debugLog(...args: any[]) {
  if (config.debug) console.log("[DEBUG]", ...args);
}
