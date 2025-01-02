from flask import Blueprint, jsonify, request
from datetime import datetime
import json
import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

sos_bp = Blueprint('sos', __name__)
SOS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'client', 'sos.txt')
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
EMERGENCY_CONTACT = os.getenv('EMERGENCY_CONTACT', '+919353842851')

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def read_sos_contacts():
    try:
        if os.path.exists(SOS_FILE):
            with open(SOS_FILE, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error reading SOS contacts: {e}")
        return []

# Function to write SOS contacts
def write_sos_contacts(contacts):
    try:
        os.makedirs(os.path.dirname(SOS_FILE), exist_ok=True)
        with open(SOS_FILE, 'w') as f:
            json.dump(contacts, f, indent=2)
        return True
    except Exception as e:
        print(f"Error writing SOS contacts: {e}")
        return False

@sos_bp.route('/contacts', methods=['GET'])
def get_sos_contacts():
    contacts = read_sos_contacts()
    return jsonify({"contacts": contacts})

@sos_bp.route('/contacts', methods=['POST'])
def add_sos_contact():
    try:
        data = request.json
        if not data or not all(key in data for key in ['name', 'phone']):
            return jsonify({"error": "Missing required fields"}), 400
        
        contacts = read_sos_contacts()
        new_contact = {
            "id": len(contacts) + 1,
            "name": data['name'],
            "phone": data['phone'],
            "added_on": datetime.now().isoformat()
        }
        contacts.append(new_contact)
        
        if write_sos_contacts(contacts):
            return jsonify({"message": "Contact added successfully", "contact": new_contact})
        return jsonify({"error": "Failed to save contact"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sos_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
def delete_sos_contact(contact_id):
    try:
        contacts = read_sos_contacts()
        contacts = [c for c in contacts if c['id'] != contact_id]
        
        if write_sos_contacts(contacts):
            return jsonify({"message": "Contact deleted successfully"})
        return jsonify({"error": "Failed to delete contact"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sos_bp.route('/trigger', methods=['POST'])
def trigger_sos():
    try:
        # Get location data
        location_data = request.json.get('location', {})
        
        # Send SMS
        message = twilio_client.messages.create(
            body="EMERGENCY: User needs immediate assistance!",
            from_=TWILIO_PHONE_NUMBER,
            to=EMERGENCY_CONTACT
        )
        
        # Make voice call
        call = twilio_client.calls.create(
            twiml='<Response><Say>Emergency! User needs immediate assistance!</Say></Response>',
            from_=TWILIO_PHONE_NUMBER,
            to=EMERGENCY_CONTACT
        )
        
        return jsonify({
            "message": "Emergency alert sent",
            "status": {
                "message_sid": message.sid,
                "call_sid": call.sid
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
