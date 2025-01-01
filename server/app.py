from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
from ultralytics import YOLO
import torch
import pyttsx3
import threading
import time
import traceback

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# Load the YOLO model
try:
    model = YOLO('yolov5su.pt')
    print("Model loaded successfully. Available classes:", model.names)
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    model = None

# Global variable to store the latest labels
latest_labels = "No objects detected"

# Initialize text-to-speech engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed of speech

# Initialize cautions dictionary with proper capitalization
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
    "couch": "Notice! Couch or sofa nearby",
    "dining table": "Caution! Table detected nearby",
    "bed": "Notice! Bed nearby",
    "toilet": "Notice! Bathroom fixture ahead",
    "tv": "Notice! Television or monitor nearby",
    "laptop": "Notice! Laptop detected",
    "mouse": "Small object: Mouse detected",
    "keyboard": "Notice! Keyboard nearby",
    "cell phone": "Notice! Mobile phone detected",
    "microwave": "Caution! Kitchen appliance nearby",
    "oven": "Caution! Oven detected",
    "sink": "Notice! Sink ahead",
    "refrigerator": "Notice! Refrigerator nearby",
    "book": "Notice! Book detected",
    "clock": "Notice! Clock nearby",
    "vase": "Caution! Fragile item nearby",
    "scissors": "Warning! Sharp object detected",
    "teddy bear": "Notice! Stuffed toy nearby",
    "hair drier": "Notice! Hair dryer detected",
    "toothbrush": "Small object: Toothbrush detected",
    "dog": "Caution! Dog in the vicinity",
    "cat": "Notice! Cat nearby",
    "bird": "Notice! Bird detected",
    "horse": "Caution! Horse nearby",
    "sheep": "Notice! Sheep in the area",
    "cow": "Caution! Cow nearby",
    "elephant": "Warning! Large animal nearby",
    "bear": "Warning! Bear detected",
    "zebra": "Notice! Zebra nearby",
    "giraffe": "Notice! Giraffe detected",
    "backpack": "Notice! Backpack nearby",
    "umbrella": "Notice! Umbrella detected",
    "handbag": "Notice! Handbag nearby",
    "tie": "Small object: Tie detected",
    "suitcase": "Notice! Suitcase nearby",
    "frisbee": "Caution! Flying object nearby",
    "skis": "Caution! Skiing equipment nearby",
    "snowboard": "Caution! Snowboard nearby",
    "sports ball": "Caution! Ball nearby",
    "kite": "Notice! Kite detected",
    "baseball bat": "Caution! Sports equipment nearby",
    "baseball glove": "Notice! Sports equipment nearby",
    "skateboard": "Caution! Skateboard nearby",
    "surfboard": "Notice! Surfboard detected",
    "tennis racket": "Notice! Sports equipment nearby",
    "bottle": "Notice! Bottle nearby",
    "wine glass": "Caution! Fragile item nearby",
    "cup": "Notice! Cup or glass nearby",
    "fork": "Notice! Utensil nearby",
    "knife": "Caution! Sharp object nearby",
    "spoon": "Notice! Utensil nearby",
    "bowl": "Notice! Bowl nearby",
    "banana": "Notice! Food item detected",
    "apple": "Notice! Food item detected",
    "sandwich": "Notice! Food item detected",
    "orange": "Notice! Food item detected",
    "broccoli": "Notice! Food item detected",
    "carrot": "Notice! Food item detected",
    "hot dog": "Notice! Food item detected",
    "pizza": "Notice! Food item detected",
    "donut": "Notice! Food item detected",
    "cake": "Notice! Food item detected",
    "potted plant": "Notice! Plant nearby",
    "parking meter": "Notice! Parking meter ahead",
    "fire hydrant": "Caution! Fire hydrant nearby",
    "boat": "Notice! Boat detected",
    "train": "Warning! Train nearby",
    "airplane": "Notice! Aircraft detected",
    "remote": "Small object: Remote control detected",
    "door": "Notice! Door nearby",
    "window": "Caution! Window nearby",
    "stairs": "Caution! Stairs ahead",
    "floor": "Notice! Change in floor surface",
    "wall": "Caution! Wall ahead",
    "ceiling": "Notice! Low ceiling",
    "cabinet": "Notice! Cabinet nearby",
    "shelf": "Notice! Shelf nearby",
    "mirror": "Notice! Mirror nearby",
    "curtain": "Notice! Curtain nearby",
    "rug": "Notice! Rug or carpet",
    "pillow": "Notice! Pillow nearby"
}

# Initialize cautions for the model
cautions = CAUTIONS.copy() if model else {}

print("Available object categories with cautions:")
for label, caution in cautions.items():
    print(f"{label}: {caution}")

# Last spoken time for each label to prevent repeated alerts
last_spoken = {}
SPEAK_COOLDOWN = 3  # Seconds between repeated alerts

def speak_caution(text):
    """Speak the caution message using TTS"""
    engine.say(text)
    engine.runAndWait()

def should_speak_caution(label):
    """Check if enough time has passed to speak the caution again"""
    current_time = time.time()
    if label not in last_spoken or (current_time - last_spoken[label]) >= SPEAK_COOLDOWN:
        last_spoken[label] = current_time
        return True
    return False

# Format the labels for display
def format_labels(labels):
    if not labels:
        return "No objects detected"
    # Just return the raw labels without any formatting
    return ", ".join(labels)

# Generate frames from the webcam
def generate_frames():
    global latest_labels
    cap = None
    try:
        # Try initializing with DirectShow or fallback to other methods
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("Failed to open webcam with DirectShow. Trying default backend.")
            cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            raise RuntimeError("Could not open the webcam. Please check if the camera is connected and accessible.")
        
        # Set camera properties to higher resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)  # Increased from 640
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)  # Increased from 480
        cap.set(cv2.CAP_PROP_FPS, 30)  # Increased FPS for smoother video

        print("Camera initialized successfully with resolution: 1280x720")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Warning: Failed to grab frame. Retrying...")
                continue
            
            # Convert the frame to RGB for YOLO inference
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Run inference
            results = model(frame_rgb) if model else []

            # Extract labels in order of detection
            detected_labels = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    confidence = float(box.conf[0])
                    if confidence >= 0.3:
                        class_id = int(box.cls[0])
                        label = model.names[class_id].lower()
                        if label not in [l for l in detected_labels]:
                            detected_labels.append(label)
                            print(f"Detected {label}")

            # Update the latest labels
            if detected_labels:
                latest_labels = detected_labels
                print("Detected labels:", latest_labels)
            else:
                latest_labels = "No objects detected"

            # Annotate the frame with results
            annotated_frame = results[0].plot() if results else frame

            # Encode the frame as JPEG
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame = buffer.tobytes()

            # Yield the frame
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    except Exception as e:
        print(f"Error in generate_frames: {e}")

    finally:
        if cap:
            cap.release()
        print("Camera released.")

@app.route('/')
def index():
    response = jsonify({"status": "Server is running"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/health')
def health():
    response = jsonify({
        "status": "healthy",
        "message": "Server is running correctly"
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_labels')
def get_labels():
    try:
        print("Raw latest_labels:", latest_labels)
        
        if latest_labels == "No objects detected":
            return jsonify({"labels": latest_labels, "cautions": "All clear"})
        
        # Get the cautions for detected labels in order
        detected_cautions = []
        
        # Process labels in order of detection
        for label in latest_labels:
            print(f"Processing label: '{label}'")
            if label in CAUTIONS:
                caution = CAUTIONS[label]
                print(f"Found caution: {caution}")
                detected_cautions.append(caution)
            else:
                print(f"No caution found for: {label}")
        
        print("Detected cautions:", detected_cautions)
        
        # Join cautions with periods to ensure complete sentences
        cautions_text = ". ".join(detected_cautions) if detected_cautions else "Objects detected but no specific cautions available"

        print("Final cautions text:", cautions_text)
        
        response_data = {
            "labels": ", ".join(latest_labels) if isinstance(latest_labels, list) else latest_labels,
            "cautions": cautions_text
        }
        print("Sending response:", response_data)
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in get_labels: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    try:
        print("Starting server on http://10.0.2.172:5000")
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except Exception as e:
        print(f"Error starting server: {e}")
