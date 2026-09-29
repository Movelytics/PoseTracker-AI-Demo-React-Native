import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { demoStyles as styles } from "./demoStyles";

type Props = {
  small: boolean;
  onLive: () => void;
  onUpload: () => void;
};

export default function ModeHome({ small, onLive, onUpload }: Props) {
  return (
    <View style={styles.modeSelectionContainer}>
      <TouchableOpacity style={[styles.modeCard, styles.modeCardPrimary]} onPress={onLive} activeOpacity={0.9}>
        <View style={styles.modeCardInner}>
          <Text style={styles.modeCardIcon}>📷</Text>
          <Text style={[styles.modeLabel, small && styles.modeLabelSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            Live camera
          </Text>
          <Text style={[styles.modeDescription, small && styles.modeDescriptionSmall]} numberOfLines={2}>
            Real-time tracking with your camera
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.modeCard} onPress={onUpload} activeOpacity={0.9}>
        <View style={styles.modeCardInner}>
          <Text style={styles.modeCardIcon}>🖼️</Text>
          <Text style={[styles.modeLabel, small && styles.modeLabelSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            Video upload
          </Text>
          <Text style={[styles.modeDescription, small && styles.modeDescriptionSmall]} numberOfLines={2}>
            Analyze a recorded workout video
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeCard, styles.modeCardCta]}
        onPress={() => {
          Linking.openURL("https://www.posetracker.com/").catch(() => {});
        }}
        activeOpacity={0.9}
      >
        <View style={styles.modeCardInner}>
          <Text style={styles.modeCardIcon}>🚀</Text>
          <Text style={[styles.modeLabel, small && styles.modeLabelSmall]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            Start using our API
          </Text>
          <Text style={[styles.modeDescription, small && styles.modeDescriptionSmall]} numberOfLines={2}>
            Add Pose Estimation features to your app for free.
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
