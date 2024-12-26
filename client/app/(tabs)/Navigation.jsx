import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import WebView from 'react-native-webview';
import * as Speech from 'expo-speech';

export default function Navigation() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraLoaded, setIsCameraLoaded] = useState(false);
  const hasSpokenRef = useRef(false);
  const lastSpokenLabelRef = useRef('');
  const labelCheckIntervalRef = useRef(null);
  
  // Your computer's IP address
  const SERVER_URL = 'http://192.168.245.67:5000';

  useEffect(() => {
    checkServerConnection();
    const interval = setInterval(checkServerConnection, 5000);
    return () => {
      clearInterval(interval);
      if (labelCheckIntervalRef.current) {
        clearInterval(labelCheckIntervalRef.current);
      }
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);

  const speak = async (text) => {
    try {
      if (isSpeaking) {
        await Speech.stop();
      }
      console.log('Speaking:', text); // Debug log
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          console.log('Finished speaking:', text); // Debug log
          setIsSpeaking(false);
        },
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

  const checkLabels = async () => {
    if (!isCameraLoaded) return;
    
    try {
      const response = await fetch(`${SERVER_URL}/get_labels`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch labels');
      }
      
      const data = await response.json();
      console.log('Received labels:', data);  // Debug log
      
      const currentLabel = data.labels;
      
      // Only speak if we have labels and they've changed
      if (currentLabel && currentLabel !== lastSpokenLabelRef.current && !isSpeaking) {
        console.log('Speaking new labels:', currentLabel);  // Debug log
        lastSpokenLabelRef.current = currentLabel;
        await speak(currentLabel);
      }
    } catch (error) {
      console.error('Error checking labels:', error);
    }
  };

  const checkServerConnection = async () => {
    try {
      console.log('Attempting to connect to:', SERVER_URL);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        // Only speak the first time we connect
        if (!isConnected && !hasSpokenRef.current) {
          await speak("Server connected successfully, loading camera feed");
          hasSpokenRef.current = true;
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
      // Reset the flags when connection fails
      hasSpokenRef.current = false;
      setIsCameraLoaded(false);
      // Clear label check interval on connection failure
      if (labelCheckIntervalRef.current) {
        clearInterval(labelCheckIntervalRef.current);
        labelCheckIntervalRef.current = null;
      }
    }
  };

  const startLabelDetection = () => {
    if (!labelCheckIntervalRef.current) {
      console.log('Starting label detection');
      // Check labels immediately
      checkLabels();
      // Then start the interval
      labelCheckIntervalRef.current = setInterval(checkLabels, 1000);
    }
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
      <View style={styles.cameraContainer}>
        <WebView
          style={styles.camera}
          source={{ uri: `${SERVER_URL}/video_feed` }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => {
            setIsCameraLoaded(false);
            console.log('Camera loading started');
          }}
          onLoadEnd={() => {
            console.log('Camera loaded, starting label detection');
            setIsCameraLoaded(true);
            // Start checking for labels after a short delay
            setTimeout(startLabelDetection, 1500);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const errorMessage = `WebView error: ${nativeEvent.description}`;
            setError(errorMessage);
            speak(errorMessage);
            hasSpokenRef.current = false;
            setIsCameraLoaded(false);
            // Clear label check interval on WebView error
            if (labelCheckIntervalRef.current) {
              clearInterval(labelCheckIntervalRef.current);
              labelCheckIntervalRef.current = null;
            }
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <Text style={styles.text}>Loading camera feed...</Text>
            </View>
          )}
        />
      </View>
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
