# Blind Navigation Assistant 🦯

A comprehensive mobile application designed to assist visually impaired individuals with real-time object detection, voice navigation, and emergency alert systems.

## 🌟 Features

### 📱 **Mobile App (React Native + Expo)**
- **Real-time Object Detection**: AI-powered camera feed with voice announcements
- **Voice Navigation**: Text-to-speech descriptions of detected objects
- **Emergency SOS System**: One-tap emergency alerts with location sharing
- **Shake Detection**: Automatic SOS trigger on device shake
- **Dynamic IP Configuration**: Automatic network setup for seamless connectivity

### 🖥️ **Server (Python + Flask)**
- **YOLO Object Detection**: Real-time computer vision using YOLOv8
- **Voice Synthesis**: Windows SAPI text-to-speech integration
- **Emergency Services**: SMS and voice call alerts via Twilio
- **RESTful API**: Clean endpoints for mobile app communication
- **Cross-platform Support**: Works on Windows, Mac, and Linux

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   Mobile App    │◄──────────────────►│   Python Server │
│  (React Native)│                     │    (Flask)      │
├─────────────────┤                     ├─────────────────┤
│ • Camera Feed   │                     │ • YOLO Detection│
│ • Voice Output  │                     │ • TTS Engine    │
│ • SOS System    │                     │ • Twilio SMS    │
│ • Location GPS  │                     │ • Emergency API │
└─────────────────┘                     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (3.8 or higher)
- **Expo CLI**: `npm install -g @expo/cli`
- **Mobile Device** with Expo Go app
- **Twilio Account** (for emergency features)

### 1. Clone Repository
```bash
git clone <repository-url>
cd Blind
```

### 2. Server Setup
```bash
cd server
pip install -r requirements.txt

# Configure Twilio credentials
cp .env.example .env
# Edit .env with your Twilio credentials

# Start server
python app.py
```

### 3. Client Setup
```bash
cd client
npm install

# Configure network (automatic)
node scripts/find-ip.js

# Start mobile app
expo start
```

### 4. Mobile Connection
1. **Scan QR code** with Expo Go app
2. **Ensure both devices** are on the same WiFi network
3. **Test connection** using the debug tool (🔧 button in app)

## 📋 Configuration

### Server Configuration (`server/.env`)
```bash
# Twilio Credentials (get from https://www.twilio.com/console)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
EMERGENCY_CONTACT=+1234567890
```

### Client Configuration (`client/.env`)
```bash
# Server URL (auto-configured by scripts)
EXPO_PUBLIC_SERVER_URL=http://192.168.1.100:5000
```

## 🔧 Network Setup

The app includes automatic IP discovery for easy setup across different networks:

### Automatic Configuration
```bash
# From server directory
python find_ip.py

# From client directory  
node scripts/find-ip.js
```

### Manual Configuration
1. **Find your computer's IP**: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. **Update client/.env**: `EXPO_PUBLIC_SERVER_URL=http://YOUR_IP:5000`
3. **Restart Expo**: `expo start --clear`

## 📱 Usage

### Navigation Mode
1. **Open the app** and go to "Navigation" tab
2. **Point camera** at objects you want to identify
3. **Listen** to voice descriptions of detected objects
4. **Toggle voice** on/off using the button

### Emergency SOS
1. **Go to "SOS" tab**
2. **Tap "Send Emergency Alert"** or **shake device vigorously**
3. **Emergency contacts** receive SMS with your location
4. **Voice calls** are automatically placed

## 🛠️ Development

### Project Structure
```
Blind/
├── client/                 # React Native mobile app
│   ├── app/               # Expo Router pages
│   ├── components/        # Reusable components
│   ├── config/           # API configuration
│   └── scripts/          # Utility scripts
├── server/               # Python Flask server
│   ├── app.py           # Main server application
│   ├── requirements.txt # Python dependencies
│   └── models/          # AI model files
└── README.md
```

### Key Technologies
- **Frontend**: React Native, Expo, Axios
- **Backend**: Flask, OpenCV, Ultralytics YOLO
- **AI/ML**: YOLOv8 object detection
- **Communication**: Twilio SMS/Voice API
- **Speech**: Windows SAPI, Expo Speech

### API Endpoints
```
GET  /                    # Server health check
POST /api/sos/trigger     # Emergency alert
POST /api/tts/control     # Voice control
GET  /api/labels          # Object detection results
GET  /video_feed          # Camera stream
```

## 🔍 Troubleshooting

### Connection Issues
1. **Check network**: Both devices on same WiFi
2. **Restart services**: `expo start --clear`
3. **Update IP**: Run `python server/find_ip.py`
4. **Check firewall**: Allow Python through firewall

### Common Problems
| Issue | Solution |
|-------|----------|
| "Network request failed" | Restart Expo with `--clear` flag |
| "Server not found" | Run IP discovery scripts |
| "Twilio 401 error" | Update Twilio credentials in `.env` |
| "Camera not working" | Grant camera permissions |

### Debug Tools
- **🔧 Debug button** in mobile app for connection testing
- **Server logs** show detailed request/response info
- **Network debugger** component for real-time diagnostics

## 🚨 Emergency Features

### SOS System
- **One-tap alerts** with GPS location
- **Automatic shake detection** for hands-free activation
- **SMS notifications** to emergency contacts
- **Voice calls** for immediate assistance
- **Location sharing** via Google Maps links

### Setup Emergency Contacts
1. **Verify phone numbers** in Twilio console
2. **Test emergency system** before relying on it
3. **Keep emergency contacts updated**

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ultralytics** for YOLOv8 object detection
- **Expo team** for React Native framework
- **Twilio** for communication APIs
- **OpenCV** for computer vision capabilities

## 📞 Support

For support and questions:
- **Create an issue** on GitHub
- **Check troubleshooting guide** above
- **Review server logs** for detailed error information

## 🎯 Object Detection Classes

The system can detect and announce 80+ object classes including:

**People & Animals**: person, dog, cat, horse, bird, etc.
**Vehicles**: car, bicycle, motorcycle, bus, truck, etc.
**Furniture**: chair, couch, bed, dining table, etc.
**Electronics**: laptop, tv, cell phone, keyboard, etc.
**Kitchen Items**: bottle, cup, fork, knife, microwave, etc.
**And many more...**

## 🔒 Privacy & Security

- **Local Processing**: Object detection runs on your local server
- **No Cloud Storage**: Images are processed in real-time, not stored
- **Secure Communication**: HTTPS-ready for production deployment
- **Emergency Only**: Location data only shared during SOS alerts

## 🌐 Network Requirements

- **Same WiFi Network**: Mobile device and server must be connected to same network
- **Port 5000**: Server runs on port 5000 (configurable)
- **Firewall**: Allow Python through Windows Firewall
- **Bandwidth**: Minimal - only sends detection results, not video stream

## 📊 Performance

- **Detection Speed**: ~100-150ms per frame
- **Supported Objects**: 80+ COCO dataset classes
- **Camera Resolution**: Optimized for mobile cameras
- **Battery Usage**: Moderate (camera + network usage)

## 🔄 Updates & Maintenance

### Updating the App
```bash
# Update client dependencies
cd client && npm update

# Update server dependencies
cd server && pip install -r requirements.txt --upgrade
```

### Model Updates
- YOLO models are automatically downloaded on first run
- Models stored in `server/models/` directory
- Can be updated by replacing model files

---

**Made with ❤️ for accessibility and independence**
