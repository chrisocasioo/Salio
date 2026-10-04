import React, { useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native';
import { colors, fonts } from '../theme/theme';

const ITEM_HEIGHT = 40;
const VISIBLE_SIDE_ITEMS = 1;
// A looping wheel is faked by tiling the values and re-centering after every settle, so the list
// needs enough runway on each side that a hard fling can't reach an end before it settles.
const LOOP_MIN_ITEMS = 300;

export function WheelPicker({
  values,
  selectedIndex,
  onChange,
  minWidth = 56,
  emphasize = true,
  loop = false,
}: {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  minWidth?: number;
  emphasize?: boolean;
  loop?: boolean;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const len = values.length;

  // Odd number of copies so there's a true middle copy to start in and re-center to.
  const reps = useMemo(() => {
    if (!loop) return 1;
    const n = Math.ceil(LOOP_MIN_ITEMS / len);
    return n % 2 === 0 ? n + 1 : n;
  }, [loop, len]);
  const middleCopy = Math.floor(reps / 2);

  const data = useMemo(
    () => (loop ? Array.from({ length: len * reps }, (_, i) => values[i % len]) : values),
    [loop, values, len, reps],
  );

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);

    if (!loop) {
      const clamped = Math.max(0, Math.min(len - 1, index));
      if (clamped !== selectedIndex) onChange(clamped);
      return;
    }

    const valueIndex = ((index % len) + len) % len;
    if (valueIndex !== selectedIndex) onChange(valueIndex);

    // Every copy looks identical, so jumping back to the middle copy is invisible.
    const copy = Math.floor(index / len);
    if (copy !== middleCopy) {
      listRef.current?.scrollToOffset({
        offset: (middleCopy * len + valueIndex) * ITEM_HEIGHT,
        animated: false,
      });
    }
  };

  return (
    <View style={[styles.container, { minWidth }]}>
      <View pointerEvents="none" style={styles.centerLines}>
        <View style={styles.centerLine} />
        <View style={[styles.centerLine, { top: ITEM_HEIGHT }]} />
      </View>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(v, i) => `${v}-${i}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={loop ? middleCopy * len + selectedIndex : selectedIndex}
        // FlatList's default windowing only renders ~10 items up front, which combined with
        // initialScrollIndex leaves the scrolled-to items unrendered (blank) until the user
        // scrolls and forces a layout pass. These lists are small (<=~360 items of plain text), so
        // just render them all immediately instead of windowing.
        initialNumToRender={data.length}
        maxToRenderPerBatch={data.length}
        windowSize={data.length}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * VISIBLE_SIDE_ITEMS }}
        onMomentumScrollEnd={handleMomentumEnd}
        style={{ height: ITEM_HEIGHT * (VISIBLE_SIDE_ITEMS * 2 + 1) }}
        renderItem={({ item, index }) => {
          const isSelected = (loop ? index % len : index) === selectedIndex;
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isSelected && emphasize ? styles.itemTextSelected : styles.itemTextDim,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * (VISIBLE_SIDE_ITEMS * 2 + 1),
    justifyContent: 'center',
  },
  centerLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT,
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: fonts.serif,
    textAlign: 'center',
  },
  itemTextSelected: {
    fontSize: 34,
    color: colors.ink,
  },
  itemTextDim: {
    fontSize: 20,
    color: colors.inkFaint,
  },
});
