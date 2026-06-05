import { z } from 'zod';

/** kebab-case identifier used for all cross-references between data files */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'ids must be kebab-case (lowercase letters, digits, dashes)');

/**
 * Dates may arrive as JS Date objects (js-yaml parses unquoted `2026-06-05`)
 * or as strings. Normalize to a 'YYYY-MM-DD' string.
 */
export const dateSchema = z.union([z.date(), z.string()]).transform((v, ctx) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    ctx.addIssue({ code: 'custom', message: `invalid date "${s}", expected YYYY-MM-DD` });
    return z.NEVER;
  }
  return s;
});

export const PlayerSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  avatar: z.string().optional(),
  color: z.string().optional(),
});

export const GroupSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  members: z.array(idSchema).min(1),
  description: z.string().optional(),
});

export const FactionSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
});

export const GameSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1),
  factions: z.array(FactionSchema).optional(),
  bggId: z.number().int().optional(),
  minPlayers: z.number().int().optional(),
  maxPlayers: z.number().int().optional(),
});

export const SessionPlayerSchema = z.strictObject({
  player: idSchema,
  faction: idSchema.optional(),
  score: z.number().optional(),
  winner: z.boolean().default(false),
});

export const SessionSchema = z.strictObject({
  date: dateSchema,
  game: idSchema,
  group: idSchema,
  location: z.string().optional(),
  notes: z.string().optional(),
  players: z.array(SessionPlayerSchema).min(1),
});

export const ManualBadgeSchema = z.strictObject({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  player: idSchema,
  session: z.string().optional(),
  date: dateSchema.optional(),
});

export type Player = z.infer<typeof PlayerSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type Game = z.infer<typeof GameSchema>;
export type SessionPlayer = z.infer<typeof SessionPlayerSchema>;
/** A play session; `id` is derived from the YAML filename. */
export type Session = z.infer<typeof SessionSchema> & { id: string };
export type ManualBadge = z.infer<typeof ManualBadgeSchema>;
