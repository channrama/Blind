import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Constants from 'expo-constants';
import { getServerUrl, getApiUrl } from '../config/api';

const NetworkDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    collectDebugInfo();
  }, []);

  const collectDebugInfo = () => {
    const info = {
      // Environment variables
      envServerUrl: process.env.EXPO_PUBLIC_SERVER_URL,
      expoConfigServerUrl: Constants.expoConfig?.extra?.serverUrl,
      
      // Computed URLs
      serverUrl: getServerUrl(),
      apiUrl: getApiUrl(),
      
      // Device info
      deviceName: Constants.deviceName,
      platform: Constants.platform,
      
      // Network info
      isDevice: Constants.isDevice,
      
      // Expo info
      expoVersion: Constants.expoVersion,
      appVersion: Constants.expoConfig?.version,
    };
    
    setDebugInfo(info);
  };

  const testServerConnection = async () => {
    const serverUrl = getServerUrl();
    const results = {};
    
    try {
      console.log('Testing server connection to:', serverUrl);
      
      // Test basic connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${serverUrl}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      results.status = response.status;
      results.statusText = response.statusText;
      results.headers = Object.fromEntries(response.headers.entries());
      
      if (response.ok) {
        const data = await response.json();
        results.data = data;
        results.success = true;
        results.message = 'Connection successful!';
      } else {
        results.success = false;
        results.message = `HTTP ${response.status}: ${response.statusText}`;
      }
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      results.message = `Connection failed: ${error.message}`;
      
      // Provide specific error guidance
      if (error.message.includes('Network request failed')) {
        results.suggestion = 'Check if server is running and both devices are on the same network';
      } else if (error.message.includes('timeout')) {
        results.suggestion = 'Server is not responding. Check firewall settings.';
      } else if (error.message.includes('CORS')) {
        results.suggestion = 'CORS issue. Restart the server.';
      }
    }
    
    setTestResults(results);
  };

  const copyDebugInfo = () => {
    const info = JSON.stringify({ debugInfo, testResults }, null, 2);
    // In a real app, you'd use Clipboard API
    Alert.alert('Debug Info', info);
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.debugButton} 
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.debugButtonText}>🔧</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Debugger</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <Text style={styles.label}>Environment Variable:</Text>
          <Text style={styles.value}>{debugInfo.envServerUrl || 'Not set'}</Text>
          
          <Text style={styles.label}>Expo Config:</Text>
          <Text style={styles.value}>{debugInfo.expoConfigServerUrl || 'Not set'}</Text>
          
          <Text style={styles.label}>Current Server URL:</Text>
          <Text style={styles.value}>{debugInfo.serverUrl}</Text>
          
          <Text style={styles.label}>API URL:</Text>
          <Text style={styles.value}>{debugInfo.apiUrl}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Info</Text>
          <Text style={styles.label}>Device:</Text>
          <Text style={styles.value}>{debugInfo.deviceName}</Text>
          
          <Text style={styles.label}>Platform:</Text>
          <Text style={styles.value}>{JSON.stringify(debugInfo.platform)}</Text>
          
          <Text style={styles.label}>Is Physical Device:</Text>
          <Text style={styles.value}>{debugInfo.isDevice ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Test</Text>
          <TouchableOpacity style={styles.testButton} onPress={testServerConnection}>
            <Text style={styles.testButtonText}>Test Server Connection</Text>
          </TouchableOpacity>
          
          {testResults.message && (
            <View style={[styles.result, testResults.success ? styles.success : styles.error]}>
              <Text style={styles.resultText}>{testResults.message}</Text>
              {testResults.suggestion && (
                <Text style={styles.suggestion}>{testResults.suggestion}</Text>
              )}
              {testResults.data && (
                <Text style={styles.data}>Response: {JSON.stringify(testResults.data)}</Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.copyButton} onPress={copyDebugInfo}>
          <Text style={styles.copyButtonText}>Copy Debug Info</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 20,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#333',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'white',
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  value: {
    color: 'white',
    fontSize: 14,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  result: {
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  success: {
    backgroundColor: '#4CAF50',
  },
  error: {
    backgroundColor: '#F44336',
  },
  resultText: {
    color: 'white',
    fontWeight: 'bold',
  },
  suggestion: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  data: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  copyButtonText: {
    color: 'white',
  },
});

export default NetworkDebugger;
