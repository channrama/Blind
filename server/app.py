from flask import Flask, jsonify, Response, make_response
import cv2
import torch
from ultralytics import YOLO
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# Load the YOLOv5 model
model = YOLO('yolov5su.pt')

def generate_frames():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return "Error: Could not open webcam"

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Run inference
        results = model(frame)
        annotated_frame = results[0].plot()
        
        # Convert frame to jpg format
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    cap.release()

@app.route('/')
def index():
    response = make_response(jsonify({"status": "Server is running"}))
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
    response = Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    response.headers.add('Access-Control-Allow-Origin', '*')
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