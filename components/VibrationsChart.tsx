import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { VibrationLog } from "../types/database";

interface VibrationChartProps {
  logs: VibrationLog[];
  type?: "magnitude" | "frequency";
}

export function VibrationChart({
  logs,
  type = "magnitude",
}: VibrationChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 40;

  if (!logs || logs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vibration Trend</Text>
        <Text style={styles.emptyText}>No data to display</Text>
      </View>
    );
  }

  const chartData = logs
    .slice(0, 20)
    .reverse()
    .map((log, index) => ({
      value: type === "frequency" ? log.frequency : log.magnitude,
      label: `${index + 1}`,
    }));

  const yValues = chartData.map((d) => d.value);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const chartColor = type === "frequency" ? "#8b5cf6" : "#2563eb";
  const chartInfo =
    type === "frequency"
      ? { title: "Frequency Trend", unit: "Hz" }
      : { title: "Vibration Magnitude Trend", unit: "m/s²" };

  const latestValue = chartData[chartData.length - 1]?.value || 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{chartInfo.title}</Text>

      <View style={styles.statsRow}>
        <Text style={[styles.statValue, { color: chartColor }]}>
          Current: {latestValue.toFixed(2)} {chartInfo.unit}
        </Text>
        <Text style={styles.statValue}>
          Min: {minY.toFixed(2)} {chartInfo.unit}
        </Text>
        <Text style={styles.statValue}>
          Max: {maxY.toFixed(2)} {chartInfo.unit}
        </Text>
      </View>

      <View style={styles.lineChartWrapper}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={150}
          color={chartColor}
          thickness={2}
          areaChart
          startFillColor={chartColor}
          endFillColor={`${chartColor}20`}
          startOpacity={0.4}
          endOpacity={0.1}
          curved
          maxValue={maxY + 1}
        />
      </View>

      <Text style={styles.infoText}>
        Showing last {chartData.length} readings
      </Text>
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
  },
  infoText: {
    fontSize: 12,
    color: "#94a4b8",
    textAlign: "center",
    marginTop: 8,
  },
});
