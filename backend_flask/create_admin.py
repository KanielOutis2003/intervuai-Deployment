"""
One-time script to promote an existing user to admin role.
Run from the backend_flask directory:  python create_admin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv('.env')

from supabase import create_client
from app.config.config import Config

admin_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)

email = input('Enter the email of the account to make admin: ').strip().strip('"').strip("'").lower()
if not email:
    print('No email entered. Exiting.')
    sys.exit(1)

# Look up user_id from auth.users via admin API
users = admin_client.auth.admin.list_users()
match = next((u for u in users if u.email == email), None)

if not match:
    print(f'No account found with email: {email}')
    print('Make sure the account is registered first.')
    sys.exit(1)

user_id = match.id

# Check if profile exists
profile = admin_client.table('user_profiles').select('*').eq('user_id', user_id).execute()

if profile.data:
    # Update existing profile
    admin_client.table('user_profiles').update({'role': 'admin'}).eq('user_id', user_id).execute()
    print(f'\n✓ Success! {email} is now an admin.')
else:
    # Create profile with admin role
    admin_client.table('user_profiles').insert({
        'user_id': user_id,
        'full_name': match.user_metadata.get('full_name', ''),
        'role': 'admin',
    }).execute()
    print(f'\n✓ Success! Profile created and {email} is now an admin.')

print('Log out and log back in for the change to take effect.')
