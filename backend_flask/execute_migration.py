"""Execute database migration directly to Supabase PostgreSQL."""

import os
import psycopg2
from dotenv import load_dotenv
import getpass

# Load environment variables
load_dotenv()

def build_connection_string():
    """Build PostgreSQL connection string for Supabase."""
    supabase_url = os.getenv('SUPABASE_URL')

    if not supabase_url:
        raise ValueError("SUPABASE_URL not found in .env")

    # Extract project reference from Supabase URL
    # Format: https://xjxexwrttxhosgrykwya.supabase.co
    project_ref = supabase_url.replace('https://', '').replace('.supabase.co', '')

    # Check if DATABASE_PASSWORD is in .env
    db_password = os.getenv('DATABASE_PASSWORD')

    if not db_password:
        print("\nDatabase password not found in .env file.")
        print("You can find your database password in Supabase Dashboard:")
        print("  Settings > Database > Connection string > Password")
        print("\nAlternatively, you can add it to your .env file as:")
        print("  DATABASE_PASSWORD=your_password_here\n")
        db_password = getpass.getpass("Enter database password (or press Enter to skip): ")

        if not db_password:
            return None

    # Build connection string
    # Supabase pooler format: postgresql://postgres.{ref}:{password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    # Direct format: postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres

    connection_string = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

    return connection_string

def execute_migration(migration_file, connection_string):
    """Execute migration SQL file."""
    # Read migration file
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print(f"Error: Migration file not found: {migration_file}")
        return False

    print(f"\nExecuting migration: {migration_file}")
    print("-" * 60)

    # Connect to database
    try:
        print("Connecting to Supabase PostgreSQL database...")
        conn = psycopg2.connect(connection_string)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully!")
        print("\nExecuting migration SQL...")

        # Execute migration
        cursor.execute(migration_sql)

        print("\nMigration executed successfully!")
        print("-" * 60)

        # Verify table was created
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'user_profiles'
        """)

        if cursor.fetchone():
            print("✓ user_profiles table created")

        # Check trigger
        cursor.execute("""
            SELECT trigger_name
            FROM information_schema.triggers
            WHERE event_object_table = 'user_profiles'
        """)

        triggers = cursor.fetchall()
        if triggers:
            print(f"✓ Triggers created: {len(triggers)}")

        # Check policies
        cursor.execute("""
            SELECT policyname
            FROM pg_policies
            WHERE tablename = 'user_profiles'
        """)

        policies = cursor.fetchall()
        if policies:
            print(f"✓ RLS policies created: {len(policies)}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE!")
        print("=" * 60)

        return True

    except psycopg2.OperationalError as e:
        print(f"\nConnection error: {str(e)}")
        print("\nPossible issues:")
        print("  1. Incorrect database password")
        print("  2. Network/firewall blocking connection")
        print("  3. Supabase project not accessible")
        return False
    except psycopg2.Error as e:
        print(f"\nDatabase error: {str(e)}")
        return False
    except Exception as e:
        print(f"\nUnexpected error: {str(e)}")
        return False

def main():
    """Main execution function."""
    print("\n" + "=" * 60)
    print("IntervuAI Database Migration - Phase 1")
    print("=" * 60)

    migration_file = 'migrations/001_auth_and_profiles.sql'

    # Build connection string
    connection_string = build_connection_string()

    if not connection_string:
        print("\nSkipping automatic execution.")
        print("\nManual execution instructions:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Go to SQL Editor")
        print("4. Copy the SQL from: migrations/001_auth_and_profiles.sql")
        print("5. Paste and click 'Run'\n")
        return False

    # Execute migration
    success = execute_migration(migration_file, connection_string)

    if success:
        print("\nYou can now run the Phase 1 tests:")
        print("  python test_phase1.py\n")

    return success

if __name__ == '__main__':
    main()
