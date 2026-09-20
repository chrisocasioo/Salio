import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon } from '../../components/icons';
import { t } from '../../i18n';
import { getRequiredTaps, recordEscapeUsed } from '../../services/emergencyEscape';
import { colors, fonts, radii } from '../../theme/theme';

/**
 * The only bypass out of an active dismiss mission: tap a moving on-screen button the required
 * number of times. Each use raises the next requirement by 100; the counter resets to 100 once
 * 30 days have passed since it was last used (src/services/emergencyEscape.ts).
 */
export function EmergencyEscapeScreen({ onDismiss }: { onDismiss: () => void }) {
  const [requiredTaps, setRequiredTaps] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    getRequiredTaps().then((taps) => {
      setRequiredTaps(taps);
      setRemaining(taps);
    });
  }, []);

  const tap = async () => {
    if (remaining <= 0 || requiredTaps === null) return;
    const next = remaining - 1;
    setRemaining(next);
    setPosition({ x: 18 + Math.random() * 64, y: 18 + Math.random() * 64 });
    if (next <= 0) {
      setDone(true);
      await recordEscapeUsed(requiredTaps);
    }
  };

  if (requiredTaps === null) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.gold} />
      </SafeAreaView>
    );
  }

  const progressPct = ((requiredTaps - remaining) / requiredTaps) * 100;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('emergencyEscape.title')}</Text>
      </View>

      <View style={styles.counterBlock}>
        <Text style={styles.counter}>{remaining}</Text>
        <Text style={styles.counterLabel}>{t('emergencyEscape.tapsLeft')}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.arena}>
        {done ? (
          <View style={styles.doneOverlay}>
            <View style={styles.doneBadge}>
              <CheckIcon size={26} color={colors.gold} strokeWidth={3} />
            </View>
            <Text style={styles.doneTitle}>{t('emergencyEscape.alarmDismissed')}</Text>
            <Pressable onPress={onDismiss} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>{t('emergencyEscape.backToAlarms')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={tap}
            accessibilityLabel={t('emergencyEscape.tapButton')}
            style={[styles.tapButton, { left: `${position.x}%`, top: `${position.y}%` }]}
          >
            <Text style={styles.tapButtonText}>{t('emergencyEscape.tapButton')}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.footerNote}>{t('emergencyEscape.nextUseWillNeed', { count: requiredTaps + 100 })}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 6,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.ink,
  },
  counterBlock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 18,
    paddingBottom: 6,
  },
  counter: {
    fontFamily: fonts.serif,
    fontSize: 58,
    color: colors.ink,
  },
  counterLabel: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  progressTrack: {
    marginHorizontal: 32,
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 999,
  },
  arena: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 56,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tapButton: {
    position: 'absolute',
    width: 84,
    height: 84,
    marginLeft: -42,
    marginTop: -42,
    borderRadius: 42,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  doneOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  doneBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
  },
  doneButton: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  doneButtonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 12,
    color: colors.inkFaint,
  },
});
