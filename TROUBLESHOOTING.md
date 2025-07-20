# Network Connection Troubleshooting Guide

## Quick Fix Checklist

### 1. **Restart Everything** (Most Common Solution)
```bash
# Stop the Expo development server (Ctrl+C in terminal)
# Then restart:
cd client
npm start
# or
expo start --clear
```

### 2. **Verify Server is Running**
```bash
cd server
python app.py
```
Look for: `Starting server on http://YOUR_IP:5000`

### 3. **Update IP Configuration**
```bash
cd server
python find_ip.py
```
This will automatically update the client configuration.

### 4. **Check Network Connection**
- Ensure both your computer and mobile device are on the **same WiFi network**
- Disable mobile data on your phone to force WiFi usage
- Try connecting to the server from a browser: `http://YOUR_IP:5000`

## Detailed Troubleshooting

### Error: "Network request failed"

**Cause**: The mobile app can't reach the server.

**Solutions**:
1. **Restart the Expo development server** with cache clearing:
   ```bash
   expo start --clear
   ```

2. **Check if server is accessible**:
   ```bash
   # From your computer, test the server:
   curl http://192.168.96.91:5000
   # Should return: {"status": "Server is running"}
   ```

3. **Verify IP addresses match**:
   - Server shows: `Starting server on http://192.168.96.91:5000`
   - Client `.env` shows: `EXPO_PUBLIC_SERVER_URL=http://192.168.96.91:5000`
   - If they don't match, run: `python server/find_ip.py`

4. **Check firewall settings**:
   - Windows: Allow Python through Windows Firewall
   - Mac: System Preferences > Security & Privacy > Firewall
   - Temporarily disable firewall to test

5. **Network troubleshooting**:
   - Both devices must be on the same network
   - Some corporate/public WiFi networks block device-to-device communication
   - Try using a mobile hotspot or home network

### Error: "Connection timeout"

**Cause**: Network is blocking the connection or server is not responding.

**Solutions**:
1. **Check server logs** for any errors
2. **Try a different port**:
   ```python
   # In server/app.py, change:
   app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
   ```
   Then update client `.env`: `EXPO_PUBLIC_SERVER_URL=http://YOUR_IP:5001`

3. **Test with localhost** (if using emulator):
   ```
   EXPO_PUBLIC_SERVER_URL=http://10.0.2.2:5000
   ```

### Error: "CORS policy" or "Access-Control-Allow-Origin"

**Cause**: Cross-origin request blocked.

**Solution**: The server already has CORS enabled, but try:
1. **Restart the server** to ensure CORS headers are applied
2. **Clear browser/app cache**
3. **Check server logs** for CORS-related errors

## Environment Variable Issues

### Environment variables not loading

**Symptoms**: App uses fallback URL instead of .env configuration

**Solutions**:
1. **Restart Expo development server**:
   ```bash
   expo start --clear
   ```

2. **Verify .env file location**:
   - Must be in `client/.env` (not in root directory)
   - Check file contents: `cat client/.env`

3. **Check environment variable format**:
   ```bash
   # Correct format:
   EXPO_PUBLIC_SERVER_URL=http://192.168.96.91:5000
   
   # Incorrect (no spaces around =):
   EXPO_PUBLIC_SERVER_URL = http://192.168.96.91:5000
   ```

4. **Verify app.json configuration**:
   ```json
   {
     "expo": {
       "extra": {
         "serverUrl": "${EXPO_PUBLIC_SERVER_URL}"
       }
     }
   }
   ```

## Testing Tools

### 1. **Test Server Connectivity**
```bash
# From computer:
curl http://192.168.96.91:5000

# Expected response:
{"status": "Server is running"}
```

### 2. **Check Client Configuration**
Add this to your React Native component to debug:
```javascript
import Constants from 'expo-constants';

console.log('Environment variables:', {
  EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  expoConfig: Constants.expoConfig?.extra?.serverUrl,
  currentServerUrl: getServerUrl()
});
```

### 3. **Network Diagnostics**
```bash
# Find your IP address:
# Windows:
ipconfig

# Mac/Linux:
ifconfig

# Test network connectivity:
ping 192.168.96.91
```

## Common Network Scenarios

### 1. **Home Network**
- Usually works without issues
- Make sure both devices are on the same WiFi

### 2. **Corporate/Office Network**
- May block device-to-device communication
- Try using mobile hotspot
- Contact IT for firewall exceptions

### 3. **Public WiFi**
- Often blocks peer-to-peer connections
- Use mobile hotspot instead
- Some coffee shops/hotels allow it

### 4. **Mobile Hotspot**
- Usually works well
- Make sure computer is connected to phone's hotspot
- Phone runs the app, computer runs the server

## Still Having Issues?

1. **Check the console logs** in both server and client
2. **Try the basic setup** with hardcoded IP addresses first
3. **Test with a simple HTTP client** like Postman or curl
4. **Verify network connectivity** with ping
5. **Try different networks** (home WiFi, mobile hotspot, etc.)

## Quick Commands Reference

```bash
# Update IP configuration
cd server && python find_ip.py

# Start server
cd server && python app.py

# Start client (with cache clear)
cd client && expo start --clear

# Test server connectivity
curl http://YOUR_IP:5000

# Find IP address
# Windows: ipconfig
# Mac/Linux: ifconfig
```
