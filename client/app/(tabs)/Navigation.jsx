import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import WebView from 'react-native-webview';
import * as Speech from 'expo-speech';
import { Camera } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { getServerUrl, getApiUrl } from '../../config/api';
import NetworkDebugger from '../../components/NetworkDebugger';

const api = axios.create({
  baseURL: getApiUrl()
});

export default function Navigation() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isCameraLoaded, setIsCameraLoaded] = useState(false);
  const [lastSpokenTime, setLastSpokenTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
    volume: 1.0
  });

  const hasSpokenRef = useRef(false);
  const lastSpokenLabelRef = useRef('');
  const labelCheckIntervalRef = useRef(null);
  const speakTimeoutRef = useRef(null);
  const speechQueueRef = useRef([]);
  const connectionCheckIntervalRef = useRef(null);
  const SERVER_URL = getServerUrl();
  const processNextInQueue = async () => {
    if (speechQueueRef.current.length > 0 && !isSpeaking) {
      const nextText = speechQueueRef.current.shift();
      await speakText(nextText);
    }
  };

  const speakText = async (text) => {
    try {
      if (!isTTSEnabled || !text) {
        console.log('TTS disabled or empty text');
        return;
      }

      const currentTime = Date.now();
      if (text === lastSpokenLabelRef.current && currentTime - lastSpokenTime < 3000) {
        console.log('Skipping repeated text:', text);
        return;
      }

      console.log('Attempting to speak:', text);
      
      // Stop any ongoing speech
      try {
        const speaking = await Speech.isSpeakingAsync();
        if (speaking) {
          console.log('Stopping current speech');
          await Speech.stop();
        }
      } catch (err) {
        console.error('Error checking speech status:', err);
      }

      // Set speaking state and speak
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onStart: () => {
          console.log('Started speaking:', text);
          setIsSpeaking(true);
        },
        onDone: () => {
          console.log('Finished speaking:', text);
          setIsSpeaking(false);
          processNextInQueue();
        },
        onStopped: () => {
          console.log('Speech stopped:', text);
          setIsSpeaking(false);
          processNextInQueue();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          setIsSpeaking(false);
          processNextInQueue();
        }
      });

      lastSpokenLabelRef.current = text;
      setLastSpokenTime(currentTime);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };
  useEffect(() => {
    const initSpeech = async () => {
      try {
        const isSpeechAvailable = await Speech.isSpeakingAsync();
        console.log('Speech synthesis available:', isSpeechAvailable);
        await speakText('Navigation system initialized');
      } catch (error) {
        console.error('Speech initialization error:', error);
        setError('Speech initialization failed');
      }
    };

    initSpeech();

    // Cleanup function when component unmounts
    return () => {
      console.log('Navigation component unmounting...');
      Speech.stop();
      // Stop object detection by disabling TTS
      api.post('/api/tts/control', { enabled: false })
        .catch(error => console.error('Failed to disable TTS:', error));
      // Clear all intervals
      if (labelCheckIntervalRef.current) {
        clearInterval(labelCheckIntervalRef.current);
      }
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      setIsCameraLoaded(false);
      setIsConnected(false);
    };
  }, []);
  const checkServerConnection = async () => {
    try {
      console.log('Attempting to connect to:', SERVER_URL);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${SERVER_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        keepalive: true,
        mode: 'cors'
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
        if (!isConnected && !hasSpokenRef.current) {
          await speakText("Server connected successfully");
          hasSpokenRef.current = true;
        }
        return true;
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error) {
      console.error('Connection error:', error.message);
      setError(`Connection failed: ${error.message}`);
      setIsConnected(false);
      setIsCameraLoaded(false);
      
      if (!isSpeaking) {
        await speakText("Connection failed. Retrying...");
      }
      return false;
    }
  };
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasCameraPermission(status === 'granted');
        
        if (status === 'granted') {
          console.log('Camera permission granted');
          await checkServerConnection();
        } else {
          console.error('Camera permission denied');
          setError('Camera permission is required');
          await speakText('Please grant camera permission to use this app');
        }
      } catch (err) {
        console.error('Error requesting camera permission:', err);
        setError('Failed to access camera');
        await speakText('Camera access failed');
      }
    })();
  }, []);

  useEffect(() => {
    let connectionInterval;
    let labelInterval;
    
    const startServices = async () => {
      if (hasCameraPermission !== true) {
        return;
      }

      try {
        const isConnected = await checkServerConnection();
        if (isConnected) {
          setIsCameraLoaded(true);
          console.log('Server connected, starting intervals');
          
          // Start periodic label checking
          labelInterval = setInterval(async () => {
            if (!isSpeaking) {
              try {
                const response = await fetch(`${SERVER_URL}/get_labels`, {
                  headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                  }
                });

                if (!response.ok) throw new Error('Failed to fetch labels');
                
                const data = await response.json();
                if (data && data.labels && data.labels !== "No objects detected") {
                  const currentTime = Date.now();
                  if (data.labels !== lastSpokenLabelRef.current || 
                      (currentTime - lastSpokenTime > 3000)) {
                    await speakText(data.labels);
                  }
                }
              } catch (error) {
                console.error('Error checking labels:', error);
                if (!isSpeaking && error.message !== lastSpokenLabelRef.current) {
                  await speakText(`Error: ${error.message}`);
                }
              }
            }
          }, 2000);

          // Start periodic connection checking
          connectionInterval = setInterval(async () => {
            const isStillConnected = await checkServerConnection();
            if (!isStillConnected) {
              setIsCameraLoaded(false);
              await speakText('Connection lost. Attempting to reconnect.');
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error starting services:', error);
        setError('Failed to start services');
        await speakText('Failed to start camera services');
      }
    };

    startServices();

    return () => {
      if (connectionInterval) clearInterval(connectionInterval);
      if (labelInterval) clearInterval(labelInterval);
      Speech.stop();
    };
  }, [hasCameraPermission]);

  useEffect(() => {
    let labelInterval;
    
    const checkLabels = async () => {
      if (isSpeaking) {
        console.log('Already speaking, skipping label check');
        return;
      }

      try {
        console.log('Fetching labels from server...');
        const response = await fetch(`${SERVER_URL}/get_labels`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch labels');
        }
        
        const data = await response.json();
        console.log('Received data:', data);

        if (data && data.cautions && data.cautions !== "All clear") {
          console.log('Processing cautions:', data.cautions);
          const currentTime = Date.now();
          
          if (data.cautions !== lastSpokenLabelRef.current || 
              (currentTime - lastSpokenTime > 3000)) {
            console.log('Speaking cautions:', data.cautions);
            await speakText(data.cautions);
          } else {
            console.log('Skipping duplicate cautions');
          }
        } else {
          console.log('No cautions to announce');
        }
      } catch (error) {
        console.error('Error checking labels:', error);
        if (!isSpeaking && error.message !== lastSpokenLabelRef.current) {
          await speakText(`Error: ${error.message}`);
        }
      }
    };

    if (isCameraLoaded && isConnected && isTTSEnabled) {
      console.log('Starting label check interval');
      labelInterval = setInterval(checkLabels, 2000);
      // Initial check
      checkLabels();
    }

    return () => {
      if (labelInterval) {
        console.log('Cleaning up label check interval');
        clearInterval(labelInterval);
      }
    };
  }, [isCameraLoaded, isConnected, isTTSEnabled]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Navigation screen focused');
      setIsTTSEnabled(true);

      // Cleanup when screen loses focus
      return () => {
        console.log('Navigation screen unfocused');
        // Stop TTS and clear intervals
        Speech.stop();
        setIsTTSEnabled(false);
        if (labelCheckIntervalRef.current) {
          clearInterval(labelCheckIntervalRef.current);
          labelCheckIntervalRef.current = null;
        }
        if (connectionCheckIntervalRef.current) {
          clearInterval(connectionCheckIntervalRef.current);
          connectionCheckIntervalRef.current = null;
        }
        // Notify server to disable TTS
        api.post('/api/tts/control', { enabled: false })
          .catch(error => console.error('Failed to disable TTS:', error));
      };
    }, [])
  );

  const toggleTTS = () => {
    setIsTTSEnabled(!isTTSEnabled);
    if (!isTTSEnabled) {
      Speech.stop();
    }
  };
  const updateVoiceSettings = (newSettings) => {
    setVoiceSettings({ ...voiceSettings, ...newSettings });
  };

  return (
    <SafeAreaView style={styles.container}>
      {hasCameraPermission === null ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      ) : hasCameraPermission === false ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.errorSubText}>Please grant camera permission in your device settings</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {isConnected && isCameraLoaded ? (
            <View style={styles.videoContainer}>
              <WebView
                style={styles.video}
                source={{ uri: `${SERVER_URL}/video_feed` }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                androidLayerType="hardware"
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error:', nativeEvent);
                  setError(`WebView error: ${nativeEvent.description}`);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView HTTP error:', nativeEvent);
                  setError(`HTTP error: ${nativeEvent.statusCode}`);
                }}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading camera feed...</Text>
                  </View>
                )}
              />
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {isConnected ? 'Loading camera...' : 'Connecting to server...'}
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.ttsButton} 
            onPress={toggleTTS}
          >
            <Text style={styles.buttonText}>
              {isTTSEnabled ? 'Disable Voice' : 'Enable Voice'}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <NetworkDebugger />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    margin: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  ttsButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});