import { z } from "zod";

const sentBy = { ts: z.number(), page: z.string() };

export const telemetryPayloadSchema = z.discriminatedUnion("evt", [
  z.object({
    evt: z.literal("asset-error"),
    tag: z.string(),
    url: z.string(),
    conn: z.string().optional(),
    ...sentBy,
  }),
  z.object({
    evt: z.literal("slow-asset"),
    kind: z.string(),
    url: z.string(),
    duration: z.number(),
    ttfb: z.number(),
    transfer: z.number().optional(),
    encoded: z.number().optional(),
    ...sentBy,
  }),
]);

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What a caller reports; reportTelemetry adds the timestamp and page. */
export type TelemetryReport = DistributiveOmit<TelemetryPayload, keyof typeof sentBy>;
