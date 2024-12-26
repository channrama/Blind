import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import WebView from 'react-native-webview';
import * as Speech from 'expo-speech';

export default function Navigation() {
  const [isConnected, setIsConnected] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Your computer's IP address
  const SERVER_URL = 'http://192.168.245.67:5000';

  useEffect(() => {
    checkServerConnection();
    const interval = setInterval(checkServerConnection, 5000);
    return () => {
      clearInterval(interval);
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);

  const speak = async (text) => {
    try {
      const isSpeechAvailable = await Speech.isSpeakingAsync();
      if (isSpeechAvailable) {
        await Speech.stop();
      }
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
        }
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const checkServerConnection = async () => {
    try {
      console.log('Attempting to connect to:', SERVER_URL);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${SERVER_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Server response:', data);

      if (data.status === "Server is running") {
        setIsConnected(true);
        setError(null);
        if (!isConnected) {
          speak("Server connected successfully");
        }
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error) {
      console.error('Connection error details:', error.message);
      setError(`Connection failed: ${error.message}. Make sure the server is running and accessible.`);
      setIsConnected(false);
      if (error.name === 'AbortError') {
        speak("Connection timed out");
      } else {
        speak("Failed to connect to server");
      }
    }
  };

  const handleStartCamera = async () => {
    setShowCamera(true);
    speak("Starting camera");
  };

  const handleStopCamera = async () => {
    setShowCamera(false);
    speak("Camera stopped");
  };

  const renderErrorView = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.ipText}>Trying to connect to: {SERVER_URL}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={checkServerConnection}
        >
          <Text style={styles.text}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderLoadingView = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>Connecting to server...</Text>
        <Text style={styles.ipText}>Server URL: {SERVER_URL}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={checkServerConnection}
        >
          <Text style={styles.text}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (error) return renderErrorView();
  if (!isConnected) return renderLoadingView();

  return (
    <SafeAreaView style={styles.container}>
      {showCamera ? (
        <View style={styles.cameraContainer}>
          <WebView
            style={styles.camera}
            source={{ uri: `${SERVER_URL}/video_feed` }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              const errorMessage = `WebView error: ${nativeEvent.description}`;
              setError(errorMessage);
              speak(errorMessage);
              setShowCamera(false);
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <Text style={styles.text}>Loading camera feed...</Text>
              </View>
            )}
          />
          <TouchableOpacity 
            style={[styles.button, styles.stopButton]}
            onPress={handleStopCamera}
          >
            <Text style={styles.text}>Stop Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.button}
          onPress={handleStartCamera}
        >
          <Text style={styles.text}>Start Camera</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  ipText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  }
});
