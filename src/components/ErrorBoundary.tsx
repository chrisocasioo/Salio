import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/theme';

type Props = {
  children: React.ReactNode;
  title: string;
  actionLabel: string;
  onAction: () => void;
};

type State = { hasError: boolean };

/**
 * Last-resort fallback for a render crash anywhere below it. The ringing flow wraps its whole
 * screen switch in one of these (see AlarmRingingRoot) so a bug in a mission screen can never
 * strand someone with a ringing alarm and no way to stop it — the fallback button dismisses the
 * alarm directly, independent of whatever crashed.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Unhandled render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{this.props.title}</Text>
        <Pressable
          onPress={() => {
            this.setState({ hasError: false });
            this.props.onAction();
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{this.props.actionLabel}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '600',
  },
});
