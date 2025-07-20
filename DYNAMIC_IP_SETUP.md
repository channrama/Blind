# Dynamic IP Configuration Guide

This guide explains how to set up dynamic IP address configuration for your Blind project, so you don't have to manually change IP addresses every time you change networks or locations.

## 🎯 Problem Solved

Before this setup, you had to manually update hardcoded IP addresses in multiple files every time you:
- Changed WiFi networks
- Moved to a different location
- Connected to a different router

Now the system automatically detects and uses the correct IP address!

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

1. **Run the IP discovery script from the server directory:**
   ```bash
   cd server
   python find_ip.py
   ```

2. **Start the server:**
   ```bash
   python app.py
   ```

3. **Start the client:**
   ```bash
   cd ../client
   npm start
   # or
   expo start
   ```

### Option 2: Manual Setup

1. **Find your IP address:**
   - **Windows:** Open Command Prompt and run `ipconfig`
   - **Mac/Linux:** Open Terminal and run `ifconfig`
   - Look for your IPv4 address (usually starts with 192.168.x.x or 10.x.x.x)

2. **Update the client configuration:**
   - Edit `client/.env` file
   - Update the line: `EXPO_PUBLIC_SERVER_URL=http://YOUR_IP_ADDRESS:5000`
   - Replace `YOUR_IP_ADDRESS` with your actual IP

3. **Start both server and client as above**

## 📁 Files Modified

### Server Side (`server/app.py`)
- ✅ Added automatic IP detection function
- ✅ Server now displays the correct IP address on startup
- ✅ No more hardcoded IP addresses

### Client Side
- ✅ `client/.env` - Environment configuration file
- ✅ `client/config/api.js` - Dynamic API configuration
- ✅ `client/app/(tabs)/sos.tsx` - Updated to use dynamic config
- ✅ `client/app/(tabs)/Navigation.jsx` - Updated to use dynamic config
- ✅ `client/app.json` - Added environment variable support

### Utility Scripts
- ✅ `server/find_ip.py` - Python script to find IP and update client config
- ✅ `client/scripts/find-ip.js` - Node.js script for IP discovery

## 🔧 How It Works

1. **Server Side:**
   - The server automatically detects its local IP address using socket connections
   - Displays the correct URL on startup
   - No manual configuration needed

2. **Client Side:**
   - Reads server URL from environment variables
   - Falls back to a default if not configured
   - All API calls use the dynamic configuration

3. **Configuration Flow:**
   ```
   .env file → app.json → Constants.expoConfig.extra → api.js → Components
   ```

## 🔄 When You Change Networks

Simply run the IP discovery script again:

```bash
cd server
python find_ip.py
```

This will:
1. Detect your new IP address
2. Update the client configuration automatically
3. Display the new server URL

## 🛠️ Troubleshooting

### "Cannot connect to server" error
1. Make sure both devices are on the same WiFi network
2. Run the IP discovery script: `python find_ip.py`
3. Check that the server is running: `python app.py`
4. Verify the IP address in `client/.env` matches your computer's IP

### Server shows wrong IP address
1. Run `python find_ip.py` to detect the correct IP
2. If still wrong, manually check your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Manually update `client/.env` with the correct IP

### Environment variables not loading
1. Make sure the `.env` file exists in the `client/` directory
2. Restart the Expo development server
3. Clear the cache: `expo start --clear`

## 📱 Testing

1. **Start the server:**
   ```bash
   cd server
   python app.py
   ```
   You should see: `Starting server on http://YOUR_IP:5000`

2. **Start the client:**
   ```bash
   cd client
   expo start
   ```

3. **Check the logs:**
   - Server logs will show the correct IP address
   - Client logs will show "API Configuration" with the server URL

4. **Test the connection:**
   - Open the app on your mobile device
   - The SOS and Navigation features should connect automatically

## 🎉 Benefits

- ✅ **No more manual IP updates** when changing networks
- ✅ **Automatic detection** of the correct IP address
- ✅ **Easy setup** with utility scripts
- ✅ **Fallback configuration** if environment variables fail
- ✅ **Clear error messages** for troubleshooting
- ✅ **Works on Windows, Mac, and Linux**

## 📝 Notes

- The `.env` file is ignored by git (add it to `.gitignore` if not already there)
- The server binds to `0.0.0.0:5000` to accept connections from any device on the network
- The client configuration is loaded at build time, so restart the development server after changes
- Keep the port as `5000` unless you have a specific reason to change it

---

**Need help?** Check the console logs for detailed error messages and configuration information.
