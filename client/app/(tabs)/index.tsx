import React, { useEffect } from 'react';
import { Text, View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Voice from '@react-native-voice/voice';

const Index: React.FC = () => {
  const router = useRouter();

  // Voice command handler
  const handleVoiceCommand = (event: any) => {
    const command = event.value[0];
    if (command.toLowerCase() === 'start navigation') {
      console.log("Voice command recognized: Starting navigation...");
      router.push('/Navigation'); // Navigate to the navigation page
    } else {
      Alert.alert('Invalid Command', 'Please say "Start Navigation" to proceed.');
    }
  };

  // Start voice recognition when the component mounts
  useEffect(() => {
    Voice.onSpeechResults = handleVoiceCommand;
    Voice.start('en-US'); // Start listening for voice commands

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Button handler for manual navigation
  const handleManualNavigation = () => {
    console.log("Manual button clicked");
    router.push('/Navigation');
  };

  return (
    <LinearGradient colors={['#000000', '#808080']} style={styles.container}>
      {/* App Logo */}
      <Image
        source={require('../assets/download.jpeg')}
        style={styles.logo}
        accessibilityLabel="App Logo"
      />

      {/* App Description */}
      <Text style={styles.heading}>Thrinayani</Text>

      {/* Instructions Text */}
      <Text style={styles.text}>
        "Say 'Start Navigation' to begin your journey."
      </Text>

      {/* Manual Navigation Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleManualNavigation}
        accessibilityLabel="Start Navigation Button"
      >
        <Text style={styles.buttonText}>Start Navigation</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 60,
    backgroundColor: '#fff',
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  text: {
    color: '#e3e3e3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#808080',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default Index;
