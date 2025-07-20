import Constants from 'expo-constants';

// Read the current IP from .env file content (this will be bundled at build time)
const SERVER_IP = '192.168.96.91'; // This will be updated by the find-ip scripts

/**
 * Get the server URL from environment variables or use fallback
 * This allows for dynamic IP configuration without hardcoding
 */
export const getServerUrl = () => {
  // Try to get from environment variables first
  let envServerUrl = process.env.EXPO_PUBLIC_SERVER_URL;

  // Check if environment variable is properly loaded
  if (envServerUrl && !envServerUrl.includes('${') && envServerUrl.startsWith('http')) {
    console.log('✅ Using server URL from environment:', envServerUrl);
    return envServerUrl;
  }

  // Try expo config as backup
  const configUrl = Constants.expoConfig?.extra?.serverUrl;
  if (configUrl && !configUrl.includes('${') && configUrl.startsWith('http')) {
    console.log('✅ Using server URL from expo config:', configUrl);
    return configUrl;
  }

  // Use the current server IP as fallback
  const fallbackUrl = `http://${SERVER_IP}:5000`;
  console.warn(`⚠️ Environment variable not loaded. Using fallback: ${fallbackUrl}`);
  console.warn('💡 To fix this: restart Expo with "expo start --clear"');

  return fallbackUrl;
};

/**
 * Get the base API URL (server URL + /api)
 */
export const getApiUrl = () => {
  return `${getServerUrl()}/api`;
};

/**
 * Configuration object for API calls
 */
export const apiConfig = {
  baseURL: getApiUrl(),
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Log the current configuration for debugging
console.log('Environment variable raw:', process.env.EXPO_PUBLIC_SERVER_URL);
console.log('API Configuration:', {
  serverUrl: getServerUrl(),
  apiUrl: getApiUrl()
});
