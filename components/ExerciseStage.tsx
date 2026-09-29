import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import PoseFigure from "./PoseFigure";
import { demoStyles as styles } from "./demoStyles";
import {
  allExercises,
  filterExercises,
  type ExerciseInfo,
} from "../lib/exerciseEngine";

type Props = {
  startLabel: string;
  canStart: boolean;
  onStart: (exercise: ExerciseInfo) => void;
  onExerciseChange?: (exercise: ExerciseInfo | null) => void;
  accessory?: React.ReactNode;
};

export default function ExerciseStage({
  startLabel,
  canStart,
  onStart,
  onExerciseChange,
  accessory,
}: Props) {
  const { width } = useWindowDimensions();
  const pageWidth = width - 40;
  const listRef = useRef<FlatList<ExerciseInfo>>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);

  const exercises = useMemo(() => filterExercises(allExercises(), query), [query]);
  const current = exercises[index] ?? null;

  useEffect(() => {
    setIndex(0);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [query]);

  useEffect(() => {
    onExerciseChange?.(current);
  }, [current, onExerciseChange]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(exercises.length - 1, next));
    if (clamped === index) return;
    setIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  const captionBlock = 72;
  const chevronTop = Math.max(12, (pagerHeight - captionBlock) / 2 - 20);

  return (
    <View style={styles.stage}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search in English or French"
        placeholderTextColor="#6b7280"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
      {exercises.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No movement matches that search.</Text>
        </View>
      ) : (
        <View
          style={styles.figure}
          onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}
        >
          {pagerHeight > 0 ? (
            <FlatList
              ref={listRef}
              data={exercises}
              keyExtractor={(item) => item.key}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              extraData={`${index}:${pagerHeight}`}
              getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
              onMomentumScrollEnd={(event) => {
                const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
                setIndex(Math.max(0, Math.min(exercises.length - 1, next)));
              }}
              renderItem={({ item, index: itemIndex }) => (
                <View style={[styles.pagerPage, { width: pageWidth, height: pagerHeight }]}>
                  <View style={styles.figureFrame}>
                    <PoseFigure exerciseId={item.key} still={itemIndex !== index} />
                  </View>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.exerciseFr} numberOfLines={1}>
                    {item.nameFr}
                  </Text>
                  <Text style={styles.exerciseMeta} numberOfLines={1}>
                    {item.movement_type} · {itemIndex + 1} / {exercises.length}
                  </Text>
                </View>
              )}
            />
          ) : null}
          {pagerHeight > 0 && index > 0 ? (
            <TouchableOpacity
              style={[styles.pagerChevron, { left: 4, top: chevronTop }]}
              onPress={() => goTo(index - 1)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Previous movement"
            >
              <Text style={styles.pagerChevronGlyph}>‹</Text>
            </TouchableOpacity>
          ) : null}
          {pagerHeight > 0 && index < exercises.length - 1 ? (
            <TouchableOpacity
              style={[styles.pagerChevron, { right: 4, top: chevronTop }]}
              onPress={() => goTo(index + 1)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Next movement"
            >
              <Text style={[styles.pagerChevronGlyph, { marginLeft: 2 }]}>›</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {accessory}
      <TouchableOpacity
        style={[styles.startButton, !canStart && styles.startButtonDisabled]}
        onPress={() => {
          if (current && canStart) onStart(current);
        }}
        activeOpacity={canStart ? 0.9 : 1}
        disabled={!canStart || !current}
      >
        <Text style={styles.startButtonText} numberOfLines={1}>
          {startLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
