import { z } from 'zod'

export const dumpConfigSchema = z.object({
  classQid: z.string().regex(/^Q\d+$/, 'Must be a valid QID (e.g., Q3305213)'),
  radius: z.number().int().min(1).max(3).default(2),
  maxInstances: z.number().int().min(1).max(100000).default(10000),
  language: z.string().min(2).max(10).default('en'),
  includeSubclasses: z.boolean().default(true),
})

export type DumpConfigInput = z.infer<typeof dumpConfigSchema>

export const startJobSchema = z.object({
  config: dumpConfigSchema,
})

export const progressQuerySchema = z.object({
  id: z.string().uuid(),
})

export const downloadQuerySchema = z.object({
  id: z.string().uuid(),
  format: z.enum(['nt', 'ttl']),
})
