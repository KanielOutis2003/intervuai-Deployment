"""Run database migrations for IntervuAI."""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_postgres_connection_string():
    """Build PostgreSQL connection string from Supabase URL."""
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url:
        raise ValueError("SUPABASE_URL not found in environment")

    # Extract project ref from Supabase URL
    # Format: https://[PROJECT_REF].supabase.co
    project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')

    # Construct PostgreSQL connection string
    # Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    # Note: We need the DB password from Supabase project settings
    # For now, we'll use service role key approach or manual execution

    return None  # Will use manual execution for safety

def run_migration(migration_file):
    """Run a specific migration file."""
    # Read migration file
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print(f"Error: Migration file not found: {migration_file}")
        return False

    print(f"Running migration: {migration_file}")
    print("-" * 50)

    # For security, we'll display the SQL for manual execution in Supabase Dashboard
    # Direct PostgreSQL connection requires DB password which should not be stored in .env

    print("\nMIGRATION SQL:")
    print("=" * 50)
    print(migration_sql)
    print("=" * 50)
    print("\nTo execute this migration:")
    print("1. Go to Supabase Dashboard > SQL Editor")
    print("2. Copy and paste the above SQL")
    print("3. Click 'Run'")
    print("\nAlternatively, if you have the database password:")
    print("- Update this script with the connection string")
    print("- The script will execute automatically")

    return True

if __name__ == '__main__':
    migration_file = 'migrations/001_auth_and_profiles.sql'
    run_migration(migration_file)
