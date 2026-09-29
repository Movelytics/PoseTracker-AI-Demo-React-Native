import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { WebView } from "react-native-webview";
import { useCameraPermissions } from "expo-camera";
import { POSETRACKER_TOKEN, POSETRACKER_TRACKING_BASE } from "@env";
import BrandHeader from "../components/BrandHeader";
import ExerciseStage from "../components/ExerciseStage";
import HeightForm from "../components/HeightForm";
import ModeHome from "../components/ModeHome";
import TrackingOverlay from "../components/TrackingOverlay";
import { demoStyles as styles } from "../components/demoStyles";
import { getExerciseInfo, type ExerciseInfo } from "../lib/exerciseEngine";
import { hasPlacementGuide } from "../lib/posePlayback";
import {
  analysisSentence,
  computeHeightCm,
  formatReady,
  isJumpExercise,
  requiresUserHeight,
  unwrapMessage,
  type FormScore,
  type HeightUnit,
  type JumpMetrics,
  type TrackingMode,
} from "../lib/tracking";

const jsBridge = `
window.addEventListener('message', function(event) {
  window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
});
window.webViewCallback = function(data) {
  window.ReactNativeWebView.postMessage(JSON.stringify(data));
};
const originalPostMessage = window.postMessage;
window.postMessage = function(data) {
  window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
};
true;
`;

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

export default function IframeFlow({ onExit }: Props) {
  const { width, height } = useWindowDimensions();
  const small = width < 380;
  const safeTop = safeTopInset();
  const safeBottom = Platform.OS === "android" ? 24 : 34;
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [awaitingHeight, setAwaitingHeight] = useState(false);
  const [counter, setCounter] = useState<number | null>(null);
  const [lastFormScore, setLastFormScore] = useState<FormScore | null>(null);
  const [jumpMetrics, setJumpMetrics] = useState<JumpMetrics | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFeetInput, setHeightFeetInput] = useState("");
  const [heightInchesInput, setHeightInchesInput] = useState("");
  const [userHeightCm, setUserHeightCm] = useState<number | null>(null);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  const bootAt = useRef<number | null>(null);
  const sawRunning = useRef(false);

  const ensureCamera = useCallback(async (): Promise<boolean> => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response?.granted) return true;
    Alert.alert(
      "Camera required",
      "Camera access is required for real-time tracking. You can enable it in your device settings if you previously denied access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            Linking.openSettings().catch(() => {});
          },
        },
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
    setReadyMs(null);
    sawRunning.current = false;
    bootAt.current = null;
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
      resetResults();
      setUserHeightCm(heightCm);
      setSelectedExercise(exercise.key);
      bootAt.current = Date.now();
      setTrackingStarted(true);
    },
    [mode, awaitingHeight, heightValue, ensureCamera, resetResults]
  );

  const resetTrackingState = useCallback(() => {
    setTrackingStarted(false);
    setSelectedExercise(null);
    setUserHeightCm(null);
    setAwaitingHeight(false);
    resetResults();
  }, [resetResults]);

  const markReady = useCallback((fromRunning: boolean) => {
    if (bootAt.current == null) return;
    if (fromRunning) {
      sawRunning.current = true;
      setReadyMs(Date.now() - bootAt.current);
      return;
    }
    if (!sawRunning.current) setReadyMs(Date.now() - bootAt.current);
  }, []);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const data = unwrapMessage(event.nativeEvent.data);
      if (!data || typeof data.type !== "string") return;
      if (data.type === "initialization") {
        const message = typeof data.message === "string" ? data.message : "";
        if (data.ready === true || message === "running") markReady(true);
        return;
      }
      if (data.type === "counter") {
        setCounter(typeof data.current_count === "number" ? data.current_count : null);
        const form = data.form_score;
        if (form && typeof form === "object") {
          const score = form as { score?: number; avg_score?: number; grade?: string };
          setLastFormScore({
            score: score.score,
            avg_score: score.avg_score,
            grade: score.grade ?? "—",
          });
        }
        const sentence = analysisSentence(data.analysis as { interpretation?: { text?: string } });
        if (sentence) setAnalysisText(sentence);
      } else if (data.type === "jump_height") {
        setJumpMetrics((prev) => ({
          ...prev,
          lastHeightCm: typeof data.jumpHeightCm === "number" ? data.jumpHeightCm : prev?.lastHeightCm,
          lastAirTimeSeconds:
            typeof data.airTimeSeconds === "number" ? data.airTimeSeconds : prev?.lastAirTimeSeconds,
        }));
      } else if (data.type === "jump_summary") {
        setJumpMetrics((prev) => ({
          ...prev,
          lastHeightCm: typeof data.maxJumpHeight === "number" ? data.maxJumpHeight : prev?.lastHeightCm,
        }));
      }
    },
    [markReady]
  );

  const iframeSrc = useMemo(() => {
    if (!selectedExercise || !mode) return null;
    const params = new URLSearchParams();
    params.set("token", POSETRACKER_TOKEN);
    params.set("exercise", selectedExercise);
    params.set("width", String(Math.round(width)));
    params.set("height", String(Math.round(height)));
    params.set("isMobile", "true");
    params.set("skeleton", "true");
    params.set("placementOverlay", "true");
    params.set("silhouette", "true");
    params.set("silhouetteColor", "#dbeafe");
    params.set("loading_message", "Getting ready");
    if (hasPlacementGuide(selectedExercise)) params.set("guide", "true");
    if (requiresUserHeight(selectedExercise) && userHeightCm != null) {
      params.set("userHeightCm", String(Math.round(userHeightCm)));
    }

    let baseUrl = `${POSETRACKER_TRACKING_BASE}/pose_tracker/tracking`;
    if (mode === "realtime") {
      params.set("postureBox", "true");
      params.set("placementBoxStrokeColor", "#4DD21D");
      params.set("placement", "1");
      params.set("placementCountdownSeconds", "3");
      params.set("timer", "true");
      params.set("timerSeconds", "3");
    } else {
      baseUrl = `${POSETRACKER_TRACKING_BASE}/pose_tracker/upload_tracking`;
      params.set("source", "video");
      params.set("postureBox", "false");
      params.set("uploadLabel", "Upload a video");
    }
    return `${baseUrl}?${params.toString()}`;
  }, [mode, selectedExercise, userHeightCm, width, height]);

  const exerciseInfo = selectedExercise ? getExerciseInfo(selectedExercise) : null;
  const showHeight = awaitingHeight && !trackingStarted;
  const canStart = !showHeight || heightValue != null;

  if (trackingStarted && selectedExercise && iframeSrc) {
    return (
      <View style={styles.trackingContainer}>
        <StatusBar style="light" />
        <WebView
          source={{ uri: iframeSrc }}
          style={styles.webview}
          onMessage={onMessage}
          onLoadEnd={() => markReady(false)}
          injectedJavaScript={jsBridge}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["*"]}
          {...(Platform.OS === "android" && {
            mixedContentMode: "compatibility" as const,
            androidLayerType: "hardware" as const,
          })}
          {...(Platform.OS === "ios" && {
            mediaCapturePermissionGrantType: "grant" as const,
          })}
          onError={(event) => {
            console.error("[PoseTracker] WebView error:", event.nativeEvent);
          }}
          startInLoadingState
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
          analysisText={isJumpExercise(selectedExercise) ? null : analysisText}
          onBack={resetTrackingState}
        />
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
            startLabel={
              showHeight ? (mode === "realtime" ? "Start live jump" : "Start video jump") : "Start"
            }
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
    </View>
  );
}
