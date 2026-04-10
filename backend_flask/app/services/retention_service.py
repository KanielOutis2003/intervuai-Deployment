"""
Data retention service — auto-deletes old completed/cancelled interview data.

Policy (configurable via DATA_RETENTION_DAYS in .env, default 90 days):
  - Targets: interviews with status 'completed' or 'cancelled' older than the cutoff.
  - Deletes in order: chat_messages → interview_sessions → interviews
    (explicit ordering in case FK cascade is not configured).
  - A dry_run=True call returns eligible count without deleting anything.
"""
import logging
from datetime import datetime, timedelta, timezone
from app.config.config import Config
from app.config.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

_TERMINAL_STATUSES = ['completed', 'cancelled']


class RetentionService:

    @staticmethod
    def cleanup_old_data(dry_run: bool = False, retention_days: int = None) -> dict:
        """
        Delete old interview data past the retention window.

        Args:
            dry_run: If True, counts eligible records without deleting.
            retention_days: Override for DATA_RETENTION_DAYS config value.

        Returns:
            dict with keys: deleted, eligible, cutoff, dry_run, retention_days
        """
        days = retention_days if retention_days is not None else Config.DATA_RETENTION_DAYS
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        logger.info(
            '[retention] Starting cleanup: dry_run=%s, retention_days=%d, cutoff=%s',
            dry_run, days, cutoff,
        )

        try:
            # Fetch IDs of old completed/cancelled interviews
            result = (
                supabase_admin.table('interviews')
                .select('id')
                .in_('status', _TERMINAL_STATUSES)
                .lt('created_at', cutoff)
                .execute()
            )
            ids = [r['id'] for r in (result.data or [])]
            eligible = len(ids)

            if not ids:
                logger.info('[retention] No records eligible for deletion.')
                return {
                    'deleted': 0,
                    'eligible': 0,
                    'cutoff': cutoff,
                    'dry_run': dry_run,
                    'retention_days': days,
                }

            if dry_run:
                logger.info('[retention] Dry run — %d interviews eligible.', eligible)
                return {
                    'deleted': 0,
                    'eligible': eligible,
                    'cutoff': cutoff,
                    'dry_run': True,
                    'retention_days': days,
                }

            # Delete in dependency order
            supabase_admin.table('chat_messages').delete().in_('interview_id', ids).execute()
            supabase_admin.table('interview_sessions').delete().in_('interview_id', ids).execute()
            supabase_admin.table('interviews').delete().in_('id', ids).execute()

            logger.info('[retention] Deleted %d interviews and their associated data.', eligible)
            return {
                'deleted': eligible,
                'eligible': eligible,
                'cutoff': cutoff,
                'dry_run': False,
                'retention_days': days,
            }

        except Exception as exc:
            logger.error('[retention] Cleanup failed: %s', str(exc))
            raise

    @staticmethod
    def get_stats() -> dict:
        """Return counts of data that would be deleted under the current policy."""
        return RetentionService.cleanup_old_data(dry_run=True)
