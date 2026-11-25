import "server-only";
import mtfSamplesData from "@/data/mtf-samples.json";
import { mtfSamplesSchema, type MtfChartSamples } from "@/lib/lens/mtf-samples-schema";

const samples = mtfSamplesSchema.parse(mtfSamplesData);

export function getMtfSamples(lensId: string, imageId: string): MtfChartSamples | undefined {
  return samples[lensId]?.[imageId];
}
