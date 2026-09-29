import React from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { demoStyles as styles } from "./demoStyles";

const SITE = "https://www.posetracker.com/#book-demo";

export default function BrandHeader({
  small,
  subtitle,
  onChangeIntegration,
}: {
  small: boolean;
  subtitle?: string;
  onChangeIntegration?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.brandRow}
        onPress={() => {
          Linking.openURL(SITE).catch(() => {});
        }}
        activeOpacity={0.85}
        accessibilityRole="link"
        accessibilityLabel="PoseTracker – open website"
      >
        <Image source={require("../assets/icon.png")} style={styles.brandLogo} resizeMode="contain" />
        <Text
          style={[styles.title, small && styles.titleSmall]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          PoseTracker Demo App
        </Text>
      </TouchableOpacity>
      {subtitle ? (
        <Text style={[styles.subtitle, small && styles.subtitleSmall]} numberOfLines={5}>
          {subtitle}
        </Text>
      ) : null}
      {onChangeIntegration ? (
        <TouchableOpacity style={styles.changeLink} onPress={onChangeIntegration} activeOpacity={0.8}>
          <Text style={styles.changeLinkText}>Change integration</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
