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
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
DEFAULT_EMERGENCY_CONTACTS = ['+919353842851']
verified_numbers = []
try:
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        try:
            incoming_numbers = twilio_client.incoming_phone_numbers.list()
            outgoing_caller_ids = twilio_client.outgoing_caller_ids.list()
            verified_numbers = []
            for number in incoming_numbers:
                verified_numbers.append(number.phone_number)
            for caller_id in outgoing_caller_ids:
                verified_numbers.append(caller_id.phone_number)
            verified_numbers = list(set(verified_numbers))
            
            if not verified_numbers:
                verified_numbers = DEFAULT_EMERGENCY_CONTACTS
                logger.warning("No verified numbers found in Twilio, using default numbers")
            else:
                logger.info(f"Found {len(verified_numbers)} verified numbers: {verified_numbers}")
        except Exception as e:
            logger.error(f"Error getting verified numbers: {e}")
            verified_numbers = DEFAULT_EMERGENCY_CONTACTS
    else:
        logger.error("Twilio credentials not found")
        twilio_client = None
        verified_numbers = DEFAULT_EMERGENCY_CONTACTS
except Exception as e:
    logger.error(f"Error initializing Twilio client: {e}")
    twilio_client = None
    verified_numbers = DEFAULT_EMERGENCY_CONTACTS
try:
    model = YOLO('yolov5su.pt')
    logger.info(f"YOLO model loaded successfully. Available classes: {model.names}")
except Exception as e:
    logger.error(f"Error loading YOLO model: {e}")
    model = None
latest_labels = "No objects detected"
is_tts_enabled = True
engine = pyttsx3.init()
engine.setProperty('rate', 150)
CAUTIONS = {
    "person": "Caution! Person detected ahead. Please maintain safe distance",
    "bicycle": "Warning! Bicycle detected nearby. Stay alert for moving cyclist",
    "car": "Warning! Vehicle detected. Please keep safe distance from the road",
    "motorcycle": "Warning! Motorcycle detected. Be aware of fast moving vehicle",
    "airplane": "Information: Airplane detected in the sky",
    "bus": "Caution! Large bus detected. Keep clear of the bus stop area",
    "train": "Warning! Train or railway area detected. Keep away from tracks",
    "truck": "Warning! Large truck detected. Stay away from the road edge",
    "boat": "Notice! Boat or water vessel detected. You may be near water",
    "traffic light": "Traffic signal ahead. Please wait for assistance to cross",
    "fire hydrant": "Fire hydrant nearby. Street infrastructure present",
    "stop sign": "Stop sign detected. Intersection ahead, extra caution needed",
    "parking meter": "Parking meter detected. You are near a parking area",
    "bench": "Bench detected nearby. Available for resting if needed",
    "chair": "Caution! Chair in your path. Possible obstacle ahead",
    "couch": "Large couch or sofa detected. Indoor furniture ahead",
    "potted plant": "Potted plant nearby. Fixed obstacle in your path",
    "bed": "Bed detected. You are in a bedroom area",
    "dining table": "Dining table ahead. Indoor furniture area",
    "toilet": "Toilet detected. You are near a bathroom",
    "tv": "Television detected. You are in an indoor space",
    "laptop": "Laptop detected. Possible workspace area",
    "mouse": "Computer mouse detected. Desktop workspace nearby",
    "remote": "Remote control detected. Entertainment area nearby",
    "keyboard": "Keyboard detected. Computer workspace area",
    "cell phone": "Cell phone detected. Electronic device nearby",
    "microwave": "Microwave detected. You are in a kitchen area",
    "oven": "Oven detected. Caution: Kitchen appliance ahead",
    "toaster": "Toaster detected. Kitchen counter area",
    "sink": "Sink detected. Water fixture ahead",
    "refrigerator": "Refrigerator detected. Kitchen appliance ahead",
    "book": "Book detected. Reading or study area nearby",
    "clock": "Clock detected. Wall-mounted object nearby",
    "vase": "Vase detected. Fragile decoration nearby",
    "scissors": "Caution! Scissors detected. Sharp object nearby",
    "teddy bear": "Teddy bear detected. Toy or decoration nearby",
    "hair drier": "Hair dryer detected. Bathroom area",
    "toothbrush": "Toothbrush detected. Bathroom area",
    "bottle": "Bottle detected. Container ahead",
    "wine glass": "Caution! Wine glass detected. Fragile item nearby",
    "cup": "Cup detected. Beverage container nearby",
    "fork": "Fork detected. Eating utensil nearby",
    "knife": "Caution! Knife detected. Sharp utensil nearby",
    "spoon": "Spoon detected. Eating utensil nearby",
    "bowl": "Bowl detected. Dish or container nearby",
    "banana": "Banana detected. Food item nearby",
    "apple": "Apple detected. Food item nearby",
    "sandwich": "Sandwich detected. Food item nearby",
    "orange": "Orange detected. Food item nearby",
    "broccoli": "Broccoli detected. Food item nearby",
    "carrot": "Carrot detected. Food item nearby",
    "hot dog": "Hot dog detected. Food item nearby",
    "pizza": "Pizza detected. Food item nearby",
    "donut": "Donut detected. Food item nearby",
    "cake": "Cake detected. Food item nearby",
    "backpack": "Backpack detected. Personal item or person nearby",
    "umbrella": "Umbrella detected. Person or obstacle nearby",
    "handbag": "Handbag detected. Personal item or person nearby",
    "tie": "Tie detected. Person likely nearby",
    "suitcase": "Suitcase detected. Luggage or traveler nearby",
    "frisbee": "Frisbee detected. Recreational item nearby",
    "skis": "Skis detected. Sports equipment nearby",
    "snowboard": "Snowboard detected. Sports equipment nearby",
    "sports ball": "Sports ball detected. Recreational area nearby",
    "kite": "Kite detected. Outdoor recreational item",
    "baseball bat": "Caution! Baseball bat detected. Sports equipment nearby",
    "baseball glove": "Baseball glove detected. Sports equipment nearby",
    "skateboard": "Warning! Skateboard detected. Moving object possible",
    "surfboard": "Surfboard detected. Beach or water sports equipment",
    "tennis racket": "Tennis racket detected. Sports equipment nearby",
    "bird": "Bird detected. Animal moving nearby",
    "cat": "Cat detected. Animal in vicinity",
    "dog": "Caution! Dog detected nearby. Animal may approach",
    "horse": "Warning! Horse detected. Large animal nearby",
    "sheep": "Sheep detected. Farm animal nearby",
    "cow": "Warning! Cow detected. Large farm animal nearby",
    "elephant": "Warning! Elephant detected. Very large animal nearby",
    "bear": "Warning! Bear detected. Dangerous animal - seek assistance",
    "zebra": "Zebra detected. Wild animal nearby",
    "giraffe": "Giraffe detected. Tall animal nearby",
    "Laptop": "Computer monitor detected. Office equipment nearby",
    "parking meter": "Parking meter detected. Street infrastructure nearby",
    "fire hydrant": "Fire hydrant detected. Street infrastructure nearby"
}
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

        successful_contacts = []
        failed_contacts = []

        # Try sending SMS and making calls to all verified numbers
        for emergency_contact in verified_numbers:
            try:
                # Send SMS
                logger.info(f"Sending SMS to {emergency_contact}")
                sms = twilio_client.messages.create(
                    to=emergency_contact,
                    from_=TWILIO_PHONE_NUMBER,
                    body=message
                )
                logger.info(f"SMS sent successfully to {emergency_contact}: {sms.sid}")

                # Make voice call
                logger.info(f"Initiating voice call to {emergency_contact}")
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
                    to=emergency_contact,
                    from_=TWILIO_PHONE_NUMBER
                )
                logger.info(f"Voice call initiated successfully to {emergency_contact}: {call.sid}")
                
                successful_contacts.append({
                    "number": emergency_contact,
                    "sms_sid": sms.sid,
                    "call_sid": call.sid
                })
            except Exception as e:
                logger.error(f"Failed to contact {emergency_contact}: {e}")
                failed_contacts.append({
                    "number": emergency_contact,
                    "error": str(e)
                })

        # Return response based on success/failure
        if successful_contacts:
            return jsonify({
                "status": "ok",
                "message": f"Emergency alert sent successfully to {len(successful_contacts)} contacts",
                "successful_contacts": successful_contacts,
                "failed_contacts": failed_contacts
            })
        else:
            return jsonify({
                "error": "Failed to contact any emergency numbers",
                "failed_contacts": failed_contacts
            }), 500

    except Exception as e:
        logger.error(f"Error in trigger_sos: {e}")
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/emergency-contacts', methods=['GET'])
def get_emergency_contacts():
    """Get list of current emergency contacts"""
    try:
        return jsonify({
            "status": "ok",
            "contacts": verified_numbers,
            "total": len(verified_numbers)
        })
    except Exception as e:
        logger.error(f"Error getting emergency contacts: {e}")
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
        logger.info("Starting server on http://192.168.127.91:5000")
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except Exception as e:
        logger.error(f"Error starting server: {e}")
