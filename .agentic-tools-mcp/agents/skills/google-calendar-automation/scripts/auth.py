import os
import sys
import json
import keyring
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ['https://www.googleapis.com/auth/calendar']
SERVICE_NAME = 'google-calendar-skill-oauth'
ACCOUNT_NAME = 'default'

def get_credentials():
    token_json = keyring.get_password(SERVICE_NAME, ACCOUNT_NAME)
    creds = None
    if token_json:
        creds = Credentials.from_authorized_user_info(json.loads(token_json), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        keyring.set_password(SERVICE_NAME, ACCOUNT_NAME, creds.to_json())
    return creds

def login():
    if not os.path.exists('credentials.json'):
        print("Error: credentials.json not found in the current directory.")
        print("Please download it from Google Cloud Console (Workspace required).")
        sys.exit(1)
    
    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    creds = flow.run_local_server(port=0)
    keyring.set_password(SERVICE_NAME, ACCOUNT_NAME, creds.to_json())
    print("Successfully authenticated and token saved to keyring.")

def status():
    creds = get_credentials()
    if creds and creds.valid:
        print("Status: Authenticated")
    else:
        print("Status: Not authenticated")

def logout():
    try:
        keyring.delete_password(SERVICE_NAME, ACCOUNT_NAME)
        print("Logged out successfully.")
    except Exception:
        print("No active session found.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python auth.py [login|status|logout]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == 'login': login()
    elif cmd == 'status': status()
    elif cmd == 'logout': logout()
