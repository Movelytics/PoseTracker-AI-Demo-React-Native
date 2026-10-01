import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  PoseTrackerProvider,
  usePoseTracker,
  WebViewPoseView,
  type CounterEvent,
  type JumpHeightEvent,
  type JumpSummaryEvent,
  type PostureEvent,
} from "@pose-tracker/react-native-pose-estimation";
import { POSETRACKER_TOKEN } from "@env";
import BrandHeader from "../components/BrandHeader";
import ExerciseStage from "../components/ExerciseStage";
import HeightForm from "../components/HeightForm";
import ModeHome from "../components/ModeHome";
import PoseFigure from "../components/PoseFigure";
import TrackingOverlay from "../components/TrackingOverlay";
import { demoStyles as styles } from "../components/demoStyles";
import { getExerciseInfo, type ExerciseInfo } from "../lib/exerciseEngine";
import {
  analysisSentence,
  computeHeightCm,
  formatReady,
  requiresUserHeight,
  type FormScore,
  type HeightUnit,
  type JumpMetrics,
  type TrackingMode,
} from "../lib/tracking";

const HOME_COPY =
  "We help mobile apps use real-time pose estimation.\nBuilt by developers, for developers.\n\nYou can test our tech on this app ⬇️";

function safeTopInset(): number {
  if (Platform.OS === "android") {
    const bar = typeof RNStatusBar.currentHeight === "number" ? RNStatusBar.currentHeight : 24;
    return bar + 12;
  }
  return 50;
}

type Props = { onExit: () => void };

export default function SdkFlow({ onExit }: Props) {
  const token = POSETRACKER_TOKEN?.trim() ? POSETRACKER_TOKEN.trim() : undefined;
  return (
    <PoseTrackerProvider apiToken={token} engine="v4" options={{ locale: "en" }}>
      <SdkSession onExit={onExit} />
    </PoseTrackerProvider>
  );
}

function SdkSession({ onExit }: Props) {
  const { width } = useWindowDimensions();
  const small = width < 380;
  const safeTop = safeTopInset();
  const safeBottom = Platform.OS === "android" ? 24 : 34;
  const bootAt = useRef(Date.now());
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [awaitingHeight, setAwaitingHeight] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  const [lastFormScore, setLastFormScore] = useState<FormScore | null>(null);
  const [jumpMetrics, setJumpMetrics] = useState<JumpMetrics | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [postureReady, setPostureReady] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFeetInput, setHeightFeetInput] = useState("");
  const [heightInchesInput, setHeightInchesInput] = useState("");
  const [userHeightCm, setUserHeightCm] = useState<number | null>(null);
  const [readyMs, setReadyMs] = useState<number | null>(null);

  const onCounter = useCallback((event: CounterEvent) => {
    setCounter(event.count);
    if (event.formScore) {
      setLastFormScore({
        score: event.formScore.score,
        avg_score: event.formScore.average,
        grade: event.formScore.grade,
      });
    }
    const sentence = analysisSentence(event.analysis);
    if (sentence) setAnalysisText(sentence);
  }, []);

  const onPosture = useCallback((event: PostureEvent) => {
    setPostureReady(event.ready);
  }, []);

  const onJumpHeight = useCallback((event: JumpHeightEvent) => {
    setJumpMetrics((prev) => ({
      ...prev,
      lastHeightCm: event.jumpHeightCm,
      lastAirTimeSeconds: event.airTimeSeconds ?? prev?.lastAirTimeSeconds,
    }));
  }, []);

  const onJumpSummary = useCallback((event: JumpSummaryEvent) => {
    setJumpMetrics((prev) => ({
      ...prev,
      lastHeightCm: event.maxJumpHeight,
    }));
  }, []);

  const { status, mode: engineMode, preload, startExercise, stopExercise } = usePoseTracker({
    onCounter,
    onPosture,
    onJumpHeight,
    onJumpSummary,
    onFormScore: (event) => {
      setLastFormScore({ score: event.score, avg_score: event.average, grade: event.grade });
    },
  });

  useEffect(() => {
    void preload().catch(() => {});
  }, [preload]);

  useEffect(() => {
    if (status === "ready" && readyMs == null) {
      setReadyMs(Date.now() - bootAt.current);
    }
  }, [status, readyMs]);

  const exerciseOptions = useMemo(
    () => (userHeightCm != null ? { userHeightCm } : undefined),
    [userHeightCm]
  );

  useEffect(() => {
    if (!trackingStarted || !selectedExercise || status !== "ready" || engineMode !== "full-engine") {
      return;
    }
    try {
      startExercise(selectedExercise, exerciseOptions);
    } catch (err) {
      console.warn("[PoseTracker] startExercise failed", err);
    }
    return () => stopExercise();
  }, [trackingStarted, selectedExercise, status, engineMode, startExercise, stopExercise, exerciseOptions]);

  const ensureCamera = useCallback(async (): Promise<boolean> => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response?.granted) return true;
    Alert.alert(
      "Camera required",
      "Camera access is required for real-time tracking. You can enable it in your device settings if you previously denied access.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings().catch(() => {}) },
      ]
    );
    return false;
  }, [permission?.granted, requestPermission]);

  const heightValue = useMemo(
    () => computeHeightCm(heightUnit, heightCmInput, heightFeetInput, heightInchesInput),
    [heightUnit, heightCmInput, heightFeetInput, heightInchesInput]
  );

  const resetResults = useCallback(() => {
    setCounter(null);
    setLastFormScore(null);
    setJumpMetrics(null);
    setAnalysisText(null);
    setPostureReady(false);
  }, []);

  const onExerciseChange = useCallback((exercise: ExerciseInfo | null) => {
    if (!exercise || !requiresUserHeight(exercise.key)) setAwaitingHeight(false);
  }, []);

  const handleStart = useCallback(
    async (exercise: ExerciseInfo) => {
      if (!mode) return;
      if (requiresUserHeight(exercise.key) && !awaitingHeight) {
        setAwaitingHeight(true);
        return;
      }
      let heightCm: number | null = null;
      if (requiresUserHeight(exercise.key)) {
        heightCm = heightValue;
        if (heightCm == null) return;
      }
      if (mode === "realtime") {
        const ok = await ensureCamera();
        if (!ok) return;
      }
      let uri: string | null = null;
      if (mode === "upload") {
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["videos"],
          quality: 1,
        });
        if (picked.canceled || !picked.assets[0]?.uri) return;
        uri = picked.assets[0].uri;
      }
      resetResults();
      setVideoUri(uri);
      setUserHeightCm(heightCm);
      setSelectedExercise(exercise.key);
      setTrackingStarted(true);
    },
    [mode, awaitingHeight, heightValue, ensureCamera, resetResults]
  );

  const resetTrackingState = useCallback(() => {
    stopExercise();
    setTrackingStarted(false);
    setSelectedExercise(null);
    setUserHeightCm(null);
    setVideoUri(null);
    setAwaitingHeight(false);
    resetResults();
  }, [resetResults, stopExercise]);

  const exerciseInfo = selectedExercise ? getExerciseInfo(selectedExercise) : null;
  const showHeight = awaitingHeight && !trackingStarted;
  const canStart = !showHeight || heightValue != null;
  const showCamera = trackingStarted && selectedExercise && (mode === "realtime" || videoUri);

  if (showCamera && selectedExercise && mode) {
    return (
      <View style={styles.trackingContainer}>
        <StatusBar style="light" />
        <WebViewPoseView
          style={styles.webview}
          drawSkeleton
          drawPlacementBox
          loadingText="Getting ready"
          source={mode === "upload" ? "video" : "camera"}
          sourceUri={mode === "upload" ? videoUri ?? undefined : undefined}
        />
        <TrackingOverlay
          exerciseKey={selectedExercise}
          isStatic={exerciseInfo?.movement_type === "static"}
          safeTop={safeTop}
          safeBottom={safeBottom}
          readyLabel={readyMs != null ? formatReady(readyMs) : null}
          formScore={lastFormScore}
          counter={counter}
          jumpMetrics={jumpMetrics}
          analysisText={analysisText}
          onBack={resetTrackingState}
        >
          {!postureReady ? (
            <View style={styles.silhouette} pointerEvents="none">
              <PoseFigure exerciseId={selectedExercise} still />
            </View>
          ) : null}
        </TrackingOverlay>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: safeTop, paddingBottom: safeBottom, paddingHorizontal: 20 }]}>
      <StatusBar style="light" />
      <BrandHeader
        small={small}
        subtitle={mode ? undefined : HOME_COPY}
        onChangeIntegration={mode ? undefined : onExit}
      />
      {!mode ? (
        <ScrollView style={styles.mainScroll} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <ModeHome small={small} onLive={() => setMode("realtime")} onUpload={() => setMode("upload")} />
        </ScrollView>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => {
              setMode(null);
              setAwaitingHeight(false);
            }}
            activeOpacity={0.8}
            style={styles.changeLink}
          >
            <Text style={styles.changeLinkText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeToggleChip, mode === "realtime" && styles.modeToggleChipActive]}
              onPress={() => setMode("realtime")}
            >
              <Text style={[styles.modeToggleText, mode === "realtime" && styles.modeToggleTextActive]}>
                Live camera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleChip, mode === "upload" && styles.modeToggleChipActive]}
              onPress={() => setMode("upload")}
            >
              <Text style={[styles.modeToggleText, mode === "upload" && styles.modeToggleTextActive]}>
                Video upload
              </Text>
            </TouchableOpacity>
          </View>
          <ExerciseStage
            startLabel={showHeight ? (mode === "realtime" ? "Start live jump" : "Start video jump") : "Start"}
            canStart={canStart}
            onStart={handleStart}
            onExerciseChange={onExerciseChange}
            accessory={
              showHeight ? (
                <HeightForm
                  unit={heightUnit}
                  onUnit={setHeightUnit}
                  cm={heightCmInput}
                  feet={heightFeetInput}
                  inches={heightInchesInput}
                  onCm={setHeightCmInput}
                  onFeet={setHeightFeetInput}
                  onInches={setHeightInchesInput}
                />
              ) : null
            }
          />
        </>
      )}
      {mode && !trackingStarted ? (
        <View style={styles.warmer} pointerEvents="none">
          <WebViewPoseView coldStart="basic" />
        </View>
      ) : null}
    </View>
  );
}
