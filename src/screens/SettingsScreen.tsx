import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { ChevronRightIcon, FileTextIcon, GearIcon, LifeBuoyIcon, MailIcon, ShieldIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://chrisocasioo.github.io/Uppy-Legal/privacy.html';
const SUPPORT_URL = 'https://chrisocasioo.github.io/Uppy-Legal/support.html';
const TERMS_URL = 'https://chrisocasioo.github.io/Uppy-Legal/terms.html';
const SUPPORT_EMAIL = 'Santrico.support@gmail.com';

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open link', url);
  }
}

export function SettingsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel label="Support" />
        <View style={styles.card}>
          <Row
            icon={<LifeBuoyIcon size={18} color={colors.gold} />}
            title="Support Center"
            subtitle="Help and answers for common issues"
            onPress={() => openLink(SUPPORT_URL)}
          />
          <Divider />
          <Row
            icon={<MailIcon size={18} color={colors.gold} />}
            title="Contact Support"
            subtitle={SUPPORT_EMAIL}
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>

        <SectionLabel label="Legal" />
        <View style={styles.card}>
          <Row
            icon={<ShieldIcon size={18} color={colors.gold} />}
            title="Privacy Policy"
            onPress={() => openLink(PRIVACY_URL)}
          />
          <Divider />
          <Row
            icon={<FileTextIcon size={18} color={colors.gold} />}
            title="Terms of Use"
            onPress={() => openLink(TERMS_URL)}
          />
        </View>

        <SectionLabel label="Permissions" />
        <View style={styles.card}>
          <Row
            icon={<GearIcon size={18} color={colors.gold} />}
            title={Platform.OS === 'ios' ? 'Open iOS Settings' : 'Open App Settings'}
            subtitle="Manage camera, notifications, and alarm permissions"
            onPress={() => Linking.openSettings()}
          />
        </View>

        <SectionLabel label="About" />
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutTitle}>Salio</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          </View>
          <Text style={styles.aboutNote}>
            Salio keeps a quiet background sound running so your alarm can ring even from a locked
            screen. If the app is force-quit from the app switcher, or the phone restarts and the
            app is never reopened, alarms scheduled after that point won't ring — this is a
            limitation of iOS itself, the same one every alarm app that doesn't rely on Apple's
            built-in alerts runs into.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRightIcon size={16} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkFaint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.inkDim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 58,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  aboutTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
  },
  aboutVersion: {
    fontSize: 12,
    color: colors.inkDim,
  },
  aboutNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkDim,
    padding: 14,
    paddingTop: 8,
  },
});
