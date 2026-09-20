import React, { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native';
import { colors, fonts } from '../theme/theme';

const ITEM_HEIGHT = 40;
const VISIBLE_SIDE_ITEMS = 1;

export function WheelPicker({
  values,
  selectedIndex,
  onChange,
  minWidth = 56,
  emphasize = true,
}: {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  minWidth?: number;
  emphasize?: boolean;
}) {
  const listRef = useRef<FlatList<string>>(null);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (clamped !== selectedIndex) onChange(clamped);
  };

  return (
    <View style={[styles.container, { minWidth }]}>
      <View pointerEvents="none" style={styles.centerLines}>
        <View style={styles.centerLine} />
        <View style={[styles.centerLine, { top: ITEM_HEIGHT }]} />
      </View>
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(v, i) => `${v}-${i}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={selectedIndex}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * VISIBLE_SIDE_ITEMS }}
        onMomentumScrollEnd={handleMomentumEnd}
        style={{ height: ITEM_HEIGHT * (VISIBLE_SIDE_ITEMS * 2 + 1) }}
        renderItem={({ item, index }) => {
          const isSelected = index === selectedIndex;
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
