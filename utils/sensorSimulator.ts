import type { InferencePayload } from "../types/database";
import baseInference from "../unseen_inference_output.json";

type Condition = "healthy" | "warning" | "faulty";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function jitter(value: number, percent: number): number {
  const p = percent / 100;
  const factor = 1 + (Math.random() * 2 - 1) * p;
  return value * factor;
}

function makeProb(condition: Condition, threshold: number): number {
  // healthy well below threshold, warning around threshold, faulty well above
  if (condition === "healthy")
    return clamp01(threshold * (0.2 + Math.random() * 0.4));
  if (condition === "warning")
    return clamp01(threshold * (0.9 + Math.random() * 0.4));
  return clamp01(Math.max(threshold + 0.3, 0.85 + Math.random() * 0.15));
}

/**
 * Generates SIMULATED data in the SAME shape as the inference JSON payload.
 * Values are generated around the base JSON's overall stats.
 */
export function genereateSimulatedData(
  condition: Condition = "healthy",
): InferencePayload {
  const base = baseInference as unknown as InferencePayload;

  const threshold = base.overall.probability_stats.threshold_used;
  const meanProb = makeProb(condition, threshold);

  const overallMean = jitter(
    base.overall.vibration_stats.mean,
    condition === "healthy" ? 10 : condition === "warning" ? 20 : 30,
  );
  const overallMin = Math.min(
    overallMean,
    jitter(base.overall.vibration_stats.min, 10),
  );
  const overallMax = Math.max(
    overallMean,
    jitter(base.overall.vibration_stats.max, 10),
  );

  const totalWindows = Math.min(60, base.windows.length);
  let predictedFaultyWindows = 0;

  const windows = base.windows.slice(0, totalWindows).map((w) => {
    const p = clamp01(jitter(meanProb, condition === "warning" ? 8 : 4));
    const predicted_label: 0 | 1 = p >= threshold ? 1 : 0;
    if (predicted_label === 1) predictedFaultyWindows += 1;

    const wMean = jitter(
      w.vibration_stats.mean,
      condition === "healthy" ? 8 : condition === "warning" ? 15 : 25,
    );
    const wMin = Math.min(wMean, jitter(w.vibration_stats.min, 10));
    const wMax = Math.max(wMean, jitter(w.vibration_stats.max, 10));

    return {
      ...w,
      vibration_stats: { mean: wMean, min: wMin, max: wMax },
      faulty_probability: p,
      predicted_label,
    };
  });

  const predictedHealthyWindows = totalWindows - predictedFaultyWindows;

  const minProb = clamp01(
    Math.min(...windows.map((w) => w.faulty_probability)),
  );
  const maxProb = clamp01(
    Math.max(...windows.map((w) => w.faulty_probability)),
  );

  return {
    generated_at: new Date().toISOString(),
    model_path: base.model_path,
    unseen_csv: base.unseen_csv,
    overall: {
      rows: base.overall.rows,
      vibration_stats: {
        mean: overallMean,
        min: overallMin,
        max: overallMax,
      },
      probability_stats: {
        mean_faulty_probability: meanProb,
        min_faulty_probability: minProb,
        max_faulty_probability: maxProb,
        threshold_used: threshold,
        total_windows: totalWindows,
        predicted_faulty_windows: predictedFaultyWindows,
        predicted_healthy_windows: predictedHealthyWindows,
      },
    },
    windows,
  };
}
