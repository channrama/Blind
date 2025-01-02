from twilio.rest import Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Twilio configuration
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_number = os.getenv('TWILIO_PHONE_NUMBER')
emergency_contact = os.getenv('EMERGENCY_CONTACT')

print("\nTesting Twilio Configuration:")
print(f"Account SID: {account_sid}")
print(f"Auth Token: {'*' * len(auth_token) if auth_token else 'Not set'}")
print(f"Twilio Number: {twilio_number}")
print(f"Emergency Contact: {emergency_contact}")

try:
    # Initialize Twilio client
    client = Client(account_sid, auth_token)
    
    # Test account access
    account = client.api.accounts(account_sid).fetch()
    print(f"\nAccount Status: {account.status}")
    
    # Try sending a test SMS
    print("\nSending test SMS...")
    message = client.messages.create(
        body="🔔 Test message from emergency alert system",
        from_=twilio_number,
        to=emergency_contact
    )
    print(f"SMS sent! SID: {message.sid}")
    
    print("\nAll tests passed! Twilio is configured correctly.")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    print("\nPossible solutions:")
    print("1. Verify your Account SID and Auth Token are correct")
    print("2. Make sure your Twilio account is active and not in trial mode")
    print("3. Verify your emergency contact number in Twilio console")
    print("4. Check if your Twilio phone number is active")
