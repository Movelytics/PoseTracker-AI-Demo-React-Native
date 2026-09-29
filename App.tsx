import React, { useState } from "react";
import { Platform, ScrollView, StatusBar as RNStatusBar, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import BrandHeader from "./components/BrandHeader";
import { demoStyles as styles } from "./components/demoStyles";
import IframeFlow from "./flows/IframeFlow";
import SdkFlow from "./flows/SdkFlow";

type Integration = "iframe" | "sdk";

function safeTopInset(): number {
  if (Platform.OS === "android") {
    const bar = typeof RNStatusBar.currentHeight === "number" ? RNStatusBar.currentHeight : 24;
    return bar + 12;
  }
  return 50;
}

export default function App() {
  const { width } = useWindowDimensions();
  const small = width < 380;
  const [integration, setIntegration] = useState<Integration | null>(null);

  if (integration === "iframe") {
    return <IframeFlow onExit={() => setIntegration(null)} />;
  }
  if (integration === "sdk") {
    return <SdkFlow onExit={() => setIntegration(null)} />;
  }

  const safeTop = safeTopInset();
  const safeBottom = Platform.OS === "android" ? 24 : 34;

  return (
    <View style={[styles.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader small={small} subtitle={"Choose how you want to try PoseTracker."} />
        <View style={styles.modeSelectionContainer}>
          <TouchableOpacity
            style={[styles.modeCard, styles.modeCardPrimary]}
            onPress={() => setIntegration("iframe")}
            activeOpacity={0.9}
          >
            <View style={styles.modeCardInner}>
              <Text style={[styles.modeLabel, small && styles.modeLabelSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                Iframe / WebView Integration
              </Text>
              <Text style={[styles.modeDescription, small && styles.modeDescriptionSmall]} numberOfLines={2}>
                The PoseTracker legacy webpage integration. This is the most basic way to integrate PoseTracker into your app.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modeCard} onPress={() => setIntegration("sdk")} activeOpacity={0.9}>
            <View style={styles.modeCardInner}>
              <Text style={[styles.modeLabel, small && styles.modeLabelSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                SDK Integration
              </Text>
              <Text style={[styles.modeDescription, small && styles.modeDescriptionSmall]} numberOfLines={2}>
                The most stable and recommended way to integrate pose estimation & motion tracking into your app.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.modeCard} onPress={() => setIntegration("sdk")} activeOpacity={0.8}>
          <Text style={styles.justStartText}>Just start testing PoseTracker ➡️</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
