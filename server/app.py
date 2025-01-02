from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv
import cv2
import numpy as np
import time
import traceback
import logging
import sys
import os
import json
from datetime import datetime
import base64
from ultralytics import YOLO
import pyttsx3

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('server.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
EMERGENCY_CONTACT = os.getenv('EMERGENCY_CONTACT', '+919353842851')

# Initialize Twilio client
try:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    account = twilio_client.api.accounts(TWILIO_ACCOUNT_SID).fetch()
    logger.info("Twilio client initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Twilio client: {e}")
    twilio_client = None

# Load the YOLO model
try:
    model = YOLO('yolov5su.pt')
    logger.info(f"YOLO model loaded successfully. Available classes: {model.names}")
except Exception as e:
    logger.error(f"Error loading YOLO model: {e}")
    model = None

# Global variables
latest_labels = "No objects detected"
is_tts_enabled = True

# Initialize text-to-speech engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)

# Initialize cautions dictionary
CAUTIONS = {
    "person": "Caution! Person detected in your path",
    "bicycle": "Warning! Bicycle detected nearby",
    "car": "Warning! Car detected nearby, be careful",
    "motorcycle": "Warning! Motorcycle detected nearby",
    "bus": "Caution! Bus detected in the vicinity",
    "truck": "Warning! Truck detected nearby",
    "traffic light": "Notice! Traffic light ahead",
    "stop sign": "Important! Stop sign detected",
    "bench": "Notice! Bench nearby",
    "chair": "Caution! Chair in your path",
    # ... (rest of your cautions dictionary)
}

# Last spoken time for each label
last_spoken = {}
SPEAK_COOLDOWN = 3

def speak_caution(text):
    """Speak the caution message using TTS"""
    global is_tts_enabled
    try:
        if is_tts_enabled:
            engine.say(text)
            engine.runAndWait()
    except Exception as e:
        logger.error(f"Error in speak_caution: {e}")

def should_speak_caution(label):
    """Check if enough time has passed to speak the caution again"""
    current_time = time.time()
    if label not in last_spoken or (current_time - last_spoken[label]) >= SPEAK_COOLDOWN:
        last_spoken[label] = current_time
        return True
    return False

def generate_frames():
    """Generate frames from the webcam with object detection"""
    global latest_labels
    cap = None
    try:
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            logger.warning("Failed to open webcam with DirectShow. Trying default backend.")
            cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            raise RuntimeError("Could not open the webcam")
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        logger.info("Camera initialized successfully with resolution: 1280x720")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning("Failed to grab frame. Retrying...")
                continue
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            if model:
                results = model(frame_rgb)
                detected_labels = []
                
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        confidence = float(box.conf[0])
                        if confidence >= 0.3:
                            class_id = int(box.cls[0])
                            label = model.names[class_id].lower()
                            if label not in detected_labels:
                                detected_labels.append(label)
                                logger.debug(f"Detected {label}")

                if detected_labels:
                    latest_labels = detected_labels
                    logger.debug(f"Detected labels: {latest_labels}")
                else:
                    latest_labels = "No objects detected"

                annotated_frame = results[0].plot()
            else:
                annotated_frame = frame

            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    except Exception as e:
        logger.error(f"Error in generate_frames: {e}")
    finally:
        if cap:
            cap.release()
        logger.info("Camera released")

@app.route('/')
def index():
    """Test endpoint to verify server is running"""
    return jsonify({"status": "Server is running"})

@app.route('/api/sos/trigger', methods=['POST', 'OPTIONS'])
def trigger_sos():
    """Handle emergency alert triggers"""
    global is_tts_enabled
    
    if request.method == 'OPTIONS':
        return '', 204

    if not twilio_client:
        logger.error("Twilio client not initialized")
        return jsonify({"error": "Twilio service not available"}), 500

    try:
        # Disable TTS during emergency
        is_tts_enabled = False
        
        data = request.get_json()
        logger.info(f"Received SOS trigger request with data: {data}")
        
        location = data.get('location', {})
        
        if location and location.get('latitude') and location.get('longitude'):
            lat = location['latitude']
            lon = location['longitude']
            maps_link = f"https://www.google.com/maps?q={lat},{lon}"
            message = f"🚨 EMERGENCY ALERT: Your friend needs help! Location: {maps_link}"
            location_available = True
        else:
            message = "🚨 EMERGENCY ALERT: Your friend needs help! (Location not available)"
            location_available = False

        # Send SMS
        logger.info(f"Sending SMS to {EMERGENCY_CONTACT}")
        sms = twilio_client.messages.create(
            to=EMERGENCY_CONTACT,
            from_=TWILIO_PHONE_NUMBER,
            body=message
        )
        logger.info(f"SMS sent successfully: {sms.sid}")

        # Make voice call
        logger.info(f"Initiating voice call to {EMERGENCY_CONTACT}")
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="alice" language="en-US">Emergency Alert! Your friend needs immediate help!</Say>
            <Pause length="1"/>
            <Say voice="alice" language="en-US">This is not a drill. Please respond immediately.</Say>
            <Pause length="1"/>
            <Say voice="alice" language="en-US">{"Their location has been sent to you via SMS." if location_available else "Location information is not available."}</Say>
            <Pause length="2"/>
            <Say voice="alice" language="en-US">Repeating: Emergency Alert! Please check your SMS for details.</Say>
        </Response>'''

        call = twilio_client.calls.create(
            twiml=twiml,
            to=EMERGENCY_CONTACT,
            from_=TWILIO_PHONE_NUMBER
        )
        logger.info(f"Voice call initiated successfully: {call.sid}")

        return jsonify({
            "status": "ok",
            "message": "Emergency alert sent successfully",
            "sms_sid": sms.sid,
            "call_sid": call.sid
        })

    except TwilioRestException as e:
        logger.error(f"Twilio error: {e}")
        return jsonify({"error": f"Failed to send emergency alert: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Error in trigger_sos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Re-enable TTS after emergency call is complete
        is_tts_enabled = True

@app.route('/api/tts/control', methods=['POST'])
def control_tts():
    """Enable or disable TTS"""
    global is_tts_enabled
    try:
        data = request.get_json()
        is_tts_enabled = data.get('enabled', True)
        return jsonify({"status": "ok", "tts_enabled": is_tts_enabled})
    except Exception as e:
        logger.error(f"Error in control_tts: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/video_feed')
def video_feed():
    """Stream video feed with object detection"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_labels')
def get_labels():
    """Get the latest detected labels and their cautions"""
    try:
        logger.debug(f"Raw latest_labels: {latest_labels}")
        
        if latest_labels == "No objects detected":
            return jsonify({"labels": latest_labels, "cautions": "All clear"})
        
        detected_cautions = []
        for label in latest_labels:
            if label in CAUTIONS:
                caution = CAUTIONS[label]
                logger.debug(f"Found caution for {label}: {caution}")
                detected_cautions.append(caution)
        
        cautions_text = ". ".join(detected_cautions) if detected_cautions else "Objects detected but no specific cautions available"
        
        response_data = {
            "labels": ", ".join(latest_labels) if isinstance(latest_labels, list) else latest_labels,
            "cautions": cautions_text
        }
        logger.debug(f"Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in get_labels: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    try:
        logger.info("Starting server on http://192.168.62.67:5000")
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except Exception as e:
        logger.error(f"Error starting server: {e}")
