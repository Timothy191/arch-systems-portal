import sys
import argparse
from googleapiclient.discovery import build
from auth import get_credentials

def get_service():
    creds = get_credentials()
    if not creds or not creds.valid:
        print("Not authenticated. Please run: python scripts/auth.py login")
        sys.exit(1)
    return build('calendar', 'v3', credentials=creds)

def create_event(args):
    service = get_service()
    event = {
        'summary': args.summary,
        'start': {'dateTime': args.start},
        'end': {'dateTime': args.end},
    }
    if args.description: event['description'] = args.description
    if args.location: event['location'] = args.location
    if args.attendees:
        event['attendees'] = [{'email': email} for email in args.attendees]

    calendar_id = args.calendar if args.calendar else 'primary'
    
    try:
        created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
        print(f"Event created successfully!")
        print(f"Link: {created_event.get('htmlLink')}")
    except Exception as e:
        print(f"Failed to create event: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command')
    
    # Create Event Command
    create_parser = subparsers.add_parser('create-event')
    create_parser.add_argument('summary')
    create_parser.add_argument('start')
    create_parser.add_argument('end')
    create_parser.add_argument('--description')
    create_parser.add_argument('--location')
    create_parser.add_argument('--attendees', nargs='+')
    create_parser.add_argument('--calendar')
    
    args = parser.parse_args()
    if args.command == 'create-event':
        create_event(args)
    else:
        print("Command not fully implemented in scaffold yet.")
