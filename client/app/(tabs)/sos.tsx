import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import axios from 'axios';

// Update this to match your computer's IP address
const SERVER_URL = 'http://192.168.127.91:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  });
  return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    console.error('Response Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    return Promise.reject(error);
  }
);

export default function SOS() {
  const [loading, setLoading] = useState(false);
  const [lastShake, setLastShake] = useState(0);

  // Initialize location permission and cleanup
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed for emergency alerts');
      }
    })();

    // Re-enable TTS when leaving SOS tab
    return () => {
      console.log('SOS component unmounting...');
      api.post('/api/tts/control', { enabled: true })
        .catch(error => console.error('Failed to re-enable TTS:', error));
    };
  }, []);

  // Get current location
  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.log('Error getting location:', error);
      return null;
    }
  };

  // Test server connection
  const testServerConnection = async () => {
    try {
      console.log('Testing server connection...');
      const response = await api.get('/');
      console.log('Server test response:', response.data);
      return true;
    } catch (error) {
      console.error('Server connection test failed:', error);
      let errorMessage = 'Cannot connect to server. Please check:\n';
      errorMessage += '1. Server is running\n';
      errorMessage += '2. Phone and computer are on same network\n';
      errorMessage += '3. Server IP address is correct\n\n';
      errorMessage += `Current server URL: ${SERVER_URL}`;
      
      Alert.alert(
        'Connection Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Send emergency alert
  const sendAlert = async () => {
    if (loading) {
      console.log('Already processing...');
      return;
    }

    try {
      setLoading(true);
      Vibration.vibrate(500);

      // First test server connection
      const isConnected = await testServerConnection();
      if (!isConnected) {
        throw new Error('Server connection failed');
      }

      // Disable TTS before sending alert
      try {
        await api.post('/api/tts/control', { enabled: false });
      } catch (error) {
        console.error('Failed to disable TTS:', error);
      }

      // Get location
      console.log('Getting location...');
      const location = await getLocation();
      console.log('Location:', location);

      // Send alert
      console.log('Sending alert to server...');
      const response = await api.post('/api/sos/trigger', {
        location: location || {}
      });

      console.log('Server response:', response.data);

      if (response.data.status === 'ok') {
        Vibration.vibrate([500, 200, 500]);
        Alert.alert(
          'Alert Sent',
          'Emergency services have been notified.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.data.error || 'Server returned an error');
      }

    } catch (error: any) {
      Vibration.vibrate([200, 100, 200]);
      
      console.error('Error sending alert:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request ? 'Request failed' : 'Request not sent'
      });
      
      let errorMessage = 'Failed to send alert.\n\n';
      
      if (error.message === 'Server connection failed') {
        // Connection error already shown by testServerConnection
        return;
      } else if (error.response) {
        // Server responded with error
        errorMessage += `Server error: ${error.response.data.error || 'Unknown server error'}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage += 'Server not responding. Please try again.';
      } else {
        // Other error
        errorMessage += error.message;
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      // Re-enable TTS after alert is complete
      try {
        await api.post('/api/tts/control', { enabled: true });
      } catch (error) {
        console.error('Failed to re-enable TTS:', error);
      }
    }
  };

  // Handle shake detection
  useEffect(() => {
    let subscription: any = null;
    const SHAKE_THRESHOLD = 2.0;
    const SHAKE_DELAY = 2000;

    const startShakeDetection = async () => {
      Accelerometer.setUpdateInterval(100);
      
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        
        if (acceleration > SHAKE_THRESHOLD && (now - lastShake) > SHAKE_DELAY) {
          setLastShake(now);
          // Send alert immediately when shaken
          sendAlert();
        }
      });
    };

    startShakeDetection();
    return () => subscription?.remove();
  }, [lastShake]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.instructions}>
        {loading ? 'Sending alert...' : 'Shake phone or press button for emergency'}
      </Text>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={sendAlert}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'SOS'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.serverInfo}>
        Server: {SERVER_URL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#E63946',
  },
  instructions: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#457B9D',
  },
  button: {
    backgroundColor: '#E63946',
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 30,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  serverInfo: {
    marginTop: 20,
    fontSize: 12,
    color: '#666',
  }
});
