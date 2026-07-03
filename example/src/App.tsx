import { Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { haptics } from 'react-native-adaptive-haptics';

const HapticButton = ({
  label,
  onPress,
  onPressIn,
}: {
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
}) => (
  <Pressable
    onPressIn={onPressIn}
    onPress={onPress}
    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Adaptive Haptics Demo</Text>

      <Text style={styles.section}>Impact</Text>
      <HapticButton
        label="Light"
        onPressIn={() => haptics.prepare('impact')}
        onPress={() => haptics.impact('light')}
      />
      <HapticButton
        label="Medium"
        onPressIn={() => haptics.prepare('impact')}
        onPress={() => haptics.impact('medium')}
      />
      <HapticButton
        label="Heavy"
        onPressIn={() => haptics.prepare('impact')}
        onPress={() => haptics.impact('heavy')}
      />
      <HapticButton
        label="Rigid (iOS 13+)"
        onPressIn={() => haptics.prepare('impact')}
        onPress={() => haptics.impact('rigid')}
      />
      <HapticButton
        label="Soft (iOS 13+)"
        onPressIn={() => haptics.prepare('impact')}
        onPress={() => haptics.impact('soft')}
      />

      <Text style={styles.section}>Notifications</Text>
      <HapticButton
        label="Success"
        onPressIn={() => haptics.prepare('notification')}
        onPress={() => haptics.success()}
      />
      <HapticButton
        label="Warning"
        onPressIn={() => haptics.prepare('notification')}
        onPress={() => haptics.warning()}
      />
      <HapticButton
        label="Error"
        onPressIn={() => haptics.prepare('notification')}
        onPress={() => haptics.error()}
      />

      <Text style={styles.section}>Selection</Text>
      <HapticButton
        label="Selection"
        onPressIn={() => haptics.prepare('selection')}
        onPress={() => haptics.selection()}
      />

      <Text style={styles.section}>Custom Pattern</Text>
      <HapticButton
        label="Heartbeat"
        onPressIn={() => haptics.prepare('custom')}
        onPress={() =>
          haptics.custom([
            { intensity: 0.8, sharpness: 0.5, duration: 100 },
            { delay: 80 },
            { intensity: 1.0, sharpness: 1.0, duration: 150 },
          ])
        }
      />

      <Text style={styles.capability}>
        Haptics available: {haptics.supportsHaptics() ? '✅ Yes' : '❌ No'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#0056CC',
    opacity: 0.8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  capability: {
    marginTop: 24,
    fontSize: 14,
    color: '#666',
  },
});
