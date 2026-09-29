import React from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { demoStyles as styles } from "./demoStyles";
import type { HeightUnit } from "../lib/tracking";

type Props = {
  unit: HeightUnit;
  onUnit: (unit: HeightUnit) => void;
  cm: string;
  feet: string;
  inches: string;
  onCm: (value: string) => void;
  onFeet: (value: string) => void;
  onInches: (value: string) => void;
};

export default function HeightForm({
  unit,
  onUnit,
  cm,
  feet,
  inches,
  onCm,
  onFeet,
  onInches,
}: Props) {
  return (
    <View style={styles.heightCard}>
      <Text style={styles.heightTitle} numberOfLines={1}>
        Your height
      </Text>
      <Text style={styles.heightSubtitle} numberOfLines={2}>
        Required for jump analysis
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heightUnitRow}>
        <TouchableOpacity
          style={[styles.heightUnitChip, unit === "cm" && styles.heightUnitChipActive]}
          onPress={() => onUnit("cm")}
        >
          <Text style={[styles.heightUnitText, unit === "cm" && styles.heightUnitTextActive]}>cm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.heightUnitChip, unit === "ft_in" && styles.heightUnitChipActive]}
          onPress={() => onUnit("ft_in")}
        >
          <Text style={[styles.heightUnitText, unit === "ft_in" && styles.heightUnitTextActive]}>
            ft / in
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {unit === "cm" ? (
        <View style={styles.heightRow}>
          <TextInput
            style={styles.heightInput}
            value={cm}
            onChangeText={onCm}
            placeholder="170"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
          />
          <Text style={styles.heightUnitLabel}>cm</Text>
        </View>
      ) : (
        <View style={styles.heightRow}>
          <View style={styles.heightHalf}>
            <TextInput
              style={styles.heightInput}
              value={feet}
              onChangeText={onFeet}
              placeholder="5"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
            />
            <Text style={styles.heightUnitLabel}>ft</Text>
          </View>
          <View style={styles.heightHalf}>
            <TextInput
              style={styles.heightInput}
              value={inches}
              onChangeText={onInches}
              placeholder="9"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
            />
            <Text style={styles.heightUnitLabel}>in</Text>
          </View>
        </View>
      )}
    </View>
  );
}
