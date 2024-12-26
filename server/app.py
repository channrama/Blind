from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
from ultralytics import YOLO
import json
import numpy as np
import torch

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# Load the YOLO model
model = YOLO('yolov5su.pt')

# Global variable to store the latest labels
latest_labels = "No objects detected"
last_frame = None

def format_labels(labels):
    if not labels:
        return "No objects detected"
    elif len(labels) == 1:
        return f"Detected {labels[0]}"
    elif len(labels) == 2:
        return f"Detected {labels[0]} and {labels[1]}"
    else:
        return f"Detected {', '.join(labels[:-1])}, and {labels[-1]}"

def generate_frames():
    global latest_labels, last_frame
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return "Error: Could not open webcam"
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        last_frame = frame.copy()
        
        # Run inference
        results = model(frame)
        
        # Get unique labels
        detected_labels = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                label = model.names[int(box.cls[0])]
                if label not in detected_labels:  # Only add unique labels
                    detected_labels.append(label)
        
        # Format the labels with proper grammar
        latest_labels = format_labels(detected_labels)
        print("Current labels:", latest_labels)  # Debug print
        
        # Draw the text on frame
        cv2.putText(frame, latest_labels, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Draw boxes
        annotated_frame = results[0].plot()
        
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

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
    global latest_labels
    print("Sending labels:", latest_labels)  # Debug print
    response = jsonify({'labels': latest_labels})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.add('Pragma', 'no-cache')
    response.headers.add('Expires', '0')
    return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    try:
        print("Starting server on http://192.168.245.67:5000")
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except Exception as e:
        print(f"Error starting server: {e}")