import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { demoStyles as styles } from "./demoStyles";
import { gradeColor, isJumpExercise, type FormScore, type JumpMetrics } from "../lib/tracking";

type Props = {
  exerciseKey: string;
  isStatic: boolean;
  safeTop: number;
  safeBottom: number;
  readyLabel: string | null;
  formScore: FormScore | null;
  counter: number | null;
  jumpMetrics: JumpMetrics | null;
  analysisText: string | null;
  onBack: () => void;
  children?: React.ReactNode;
};

export default function TrackingOverlay({
  exerciseKey,
  isStatic,
  safeTop,
  safeBottom,
  readyLabel,
  formScore,
  counter,
  jumpMetrics,
  analysisText,
  onBack,
  children,
}: Props) {
  const jump = isJumpExercise(exerciseKey);
  const color = gradeColor(formScore?.grade);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {children}
      <TouchableOpacity
        style={[styles.backButton, { top: safeTop }]}
        onPress={onBack}
        activeOpacity={0.8}
        accessibilityLabel="Back to exercise selection"
      >
        <Text style={styles.backChevron}>‹</Text>
      </TouchableOpacity>
      {readyLabel ? (
        <View style={[styles.readyPill, { top: safeTop }]} pointerEvents="none">
          <Text style={styles.readyText}>{readyLabel}</Text>
        </View>
      ) : null}
      {analysisText ? (
        <View style={[styles.analysisLine, { top: safeTop + 56 }]} pointerEvents="none">
          <Text style={styles.analysisText} numberOfLines={3}>
            {analysisText}
          </Text>
        </View>
      ) : null}
      <View style={[styles.bottomCards, { bottom: safeBottom }]} pointerEvents="box-none">
        {jump ? (
          <>
            <View style={styles.gradeCard}>
              <Text style={styles.gradeLabel} numberOfLines={1}>
                Air time
              </Text>
              <Text style={[styles.gradeValue, { color: "#e5e7eb" }]} numberOfLines={1}>
                {jumpMetrics?.lastAirTimeSeconds != null
                  ? `${jumpMetrics.lastAirTimeSeconds.toFixed(2)} s`
                  : "—"}
              </Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={styles.gradeLabel} numberOfLines={1}>
                Jump height
              </Text>
              <Text style={styles.counterValue} numberOfLines={1}>
                {jumpMetrics?.lastHeightCm != null ? jumpMetrics.lastHeightCm.toFixed(1) : "—"}
              </Text>
              <Text style={styles.counterUnit}>cm</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.gradeCard}>
              <Text style={styles.gradeLabel} numberOfLines={1}>
                Last rep
              </Text>
              <Text style={[styles.gradeValue, { color }]} numberOfLines={1}>
                {formScore?.grade && formScore.grade !== "—" ? formScore.grade : "—"}
              </Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={styles.counterValue} numberOfLines={1}>
                {counter != null ? counter : "0"}
              </Text>
              <Text style={styles.counterUnit}>{isStatic ? "sec" : "rep(s)"}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
