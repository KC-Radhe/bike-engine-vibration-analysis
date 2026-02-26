import React, { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { VibrationLog } from "../types/database";

/**
 * Legacy chart (kept for compatibility): plots from VibrationLog list.
 * Now horizontally scrolls when points exceed view width.
 */
export function VibrationChart({
  logs,
  type = "magnitude",
}: {
  logs: VibrationLog[];
  type?: "magnitude" | "frequency";
}) {
  const series = useMemo(() => {
    if (!logs || logs.length === 0) return [] as number[];
    const vals = logs
      .slice(0, 20)
      .reverse()
      .map((l) => (type === "frequency" ? l.frequency : l.magnitude));
    return vals;
  }, [logs, type]);

  const unit = type === "frequency" ? "Hz" : "g";
  const title =
    type === "frequency" ? "Frequency Trend" : "Vibration Magnitude Trend";

  return (
    <TrendChart
      title={title}
      unit={unit}
      color={type === "frequency" ? "#8b5cf6" : "#2563eb"}
      values={series}
      // y-axis auto
    />
  );
}

/**
 * Generic trend chart for plotting numeric values with gifted-charts.
 * - Horizontally scrolls if needed.
 * - X-axis labels are 0..N (N = values.length-1), plus ONE extra unit (padding).
 */
export function TrendChart({
  title,
  unit,
  color,
  values,
  mean,
  min,
  max,
  maxValue,
  noOfSections,
  yAxisLabelSuffix,
  zoomToData,
}: {
  title: string;
  unit: string;
  color: string;
  values: number[];
  mean?: number;
  min?: number;
  max?: number;
  maxValue?: number;
  noOfSections?: number;
  yAxisLabelSuffix?: string;
  zoomToData?: boolean;
}) {
  const screenWidth = Dimensions.get("window").width;

  if (!values || values.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>No data to display</Text>
      </View>
    );
  }

  // X-axis behavior:
  // - Keep a rigid origin at unit 0 (no plotted point at 0)
  // - Shift plotted points by +1 so values[0] is drawn at x=1, values[1] at x=2, ...
  // - Add ONE extra unit space at the end (padding label) so the curve doesn't end at the edge
  const data: any[] = [];

  if (values.length > 0) {
    // IMPORTANT:
    // Do NOT use NaN here – gifted-charts will pass it into SVG path and crash.
    // We still want:
    // - unit 0 present on x-axis
    // - plotted points shifted by +1 (values[0] appears at unit 1)
    // - ONE extra unit space at the end
    // We accomplish this by using hidden "padding" points with real numeric values.
    // This keeps SVG valid while visually behaving like empty units.

    const first = values[0];
    const last = values[values.length - 1];

    // Unit 0: hidden padding point
    data.push({
      value: first,
      label: "0",
      hideDataPoint: true,
    });

    // Units 1..N: actual points (shifted by +1)
    values.forEach((v, i) => {
      data.push({
        value: v,
        label: String(i + 1),
      });
    });

    // Unit N+1: trailing padding (exactly ONE unit space)
    data.push({
      value: last,
      label: String(values.length + 1),
      hideDataPoint: true,
    });
  }

  const spacing = 34;
  // Width: keep exactly ONE extra unit space at the end (we already add 1 padding label).
  // Avoid adding too much trailing blank space.
  const chartWidth = Math.max(screenWidth - 40, data.length * spacing + 10);

  const computedMin = Math.min(...values);
  const computedMax = Math.max(...values);
  const computedMean = values.reduce((a, b) => a + b, 0) / values.length;

  const shownMin = min ?? computedMin;
  const shownMax = max ?? computedMax;
  const shownMean = mean ?? computedMean;

  // ---------------- Y-axis scaling (zoom for more visible fluctuation) ----------------
  // GiftedCharts supports `yAxisOffset` to shift the axis baseline.
  // We compute a tight range around the data (with padding) so the curve doesn't look flat.
  const doZoom = zoomToData ?? true;

  const baseMin = shownMin;
  const baseMax = shownMax;
  const range = Math.max(0, baseMax - baseMin);

  // Fixed steps to make small variations visible (DO NOT change actual plot data):
  // - Fault probability: 0.0002 (4-decimal axis labels)
  // - Vibration magnitude: 0.05 (3-decimal axis labels)
  const step = (() => {
    if (!doZoom) return undefined;
    return unit !== "g" ? 0.0002 : 0.05;
  })();

  // Y-axis units start from MIN and reach up to MAX, aligned to the chosen step.
  // If range is ~0, expand slightly (still centered around the value) so fluctuation is visible.
  const safeStep = step ?? 0.1;
  const expand = doZoom && range < safeStep ? safeStep * 6 : 0;

  const rawMin = baseMin - expand / 2;
  const rawMax = baseMax + expand / 2;

  const zoomMin = Math.floor(rawMin / safeStep) * safeStep;
  const zoomMax = Math.ceil(rawMax / safeStep) * safeStep;
  const zoomRange = Math.max(zoomMax - zoomMin, safeStep * 4);

  // NOTE: `step` is declared above and used here.

  const sections = doZoom
    ? Math.max(4, Math.ceil(zoomRange / (step ?? 0.1)))
    : (noOfSections ?? 10);

  // GiftedCharts expects maxValue as "height range" above yAxisOffset.
  const yAxisOffset = doZoom ? zoomMin : undefined;
  const chartMaxValue = doZoom
    ? sections * (step ?? 0.1)
    : (maxValue ?? shownMax + 1);

  // Custom y-axis labels so users can actually SEE small fluctuations.
  const yAxisLabelTexts = doZoom
    ? Array.from({ length: sections + 1 }, (_, i) => {
        const v = zoomMin + i * (step ?? 0.1);
        if (unit !== "g") return v.toFixed(4);
        return v.toFixed(3);
      })
    : undefined;

  // Keep y-axis rigid while the chart scrolls:
  // - We render our own fixed y-axis labels column
  // - The LineChart is rendered without its own y-axis text
  // Slightly wider fixed y-axis column so last decimals don't get clipped.
  const yAxisWidth = unit !== "g" ? 78 : 66;
  const yAxisFontSize = unit !== "g" ? 11 : 11;
  const yAxisLabelsForRender = (yAxisLabelTexts ?? []).slice().reverse();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.statsRow}>
        <Text style={[styles.statValue, { color }]}>
          Mean: {unit !== "g" ? shownMean.toFixed(4) : shownMean.toFixed(2)}{" "}
          {unit}
        </Text>
        <Text style={styles.statValue}>
          Min: {unit !== "g" ? shownMin.toFixed(4) : shownMin.toFixed(2)} {unit}
        </Text>
        <Text style={styles.statValue}>
          Max: {unit !== "g" ? shownMax.toFixed(4) : shownMax.toFixed(2)} {unit}
        </Text>
      </View>

      <View style={styles.lineChartWrapper}>
        <View style={styles.chartRow}>
          {/* Fixed Y-axis */}
          <View style={[styles.yAxisFixed, { width: yAxisWidth, height: 160 }]}>
            {yAxisLabelsForRender.length > 0 ? (
              <View style={styles.yAxisLabelsCol}>
                {yAxisLabelsForRender.map((t, idx) => (
                  <Text
                    key={`${t}-${idx}`}
                    style={[
                      styles.yAxisLabel,
                      { fontSize: yAxisFontSize, width: yAxisWidth - 6 },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {t}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          {/* Scrollable plot area (x-axis + curve) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Keep plot fully left-aligned; y-axis is rigid and does not move.
            contentContainerStyle={{ paddingLeft: 0, paddingRight: 0 }}
          >
            <LineChart
              data={data}
              width={chartWidth}
              height={160}
              color={color}
              thickness={2}
              areaChart
              startFillColor={color}
              endFillColor={`${color}20`}
              startOpacity={0.35}
              endOpacity={0.08}
              curved
              spacing={spacing}
              // Make x-axis start exactly at unit 0 (rigid y-axis boundary)
              initialSpacing={0}
              yAxisOffset={yAxisOffset}
              maxValue={chartMaxValue}
              noOfSections={sections}
              // Hide built-in y-axis so it doesn't move with scroll
              yAxisLabelWidth={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: "transparent", width: 0 }}
              yAxisLabelSuffix={yAxisLabelSuffix ?? ""}
            />
          </ScrollView>
        </View>
      </View>

      <Text style={styles.infoText}>Showing {values.length} points</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  statValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 16,
  },
  lineChartWrapper: {
    overflow: "hidden",
    borderRadius: 16,
    marginLeft: -30,
    paddingLeft: -30,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxisFixed: {
    justifyContent: "center",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  yAxisLabelsCol: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  yAxisLabel: {
    color: "#64748b",
    textAlign: "right",
    fontWeight: "600",
    includeFontPadding: false,
  },
  infoText: {
    fontSize: 12,
    color: "#94a4b8",
    textAlign: "center",
    marginTop: 8,
  },
});
