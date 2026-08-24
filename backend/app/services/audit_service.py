"""Thin helper for writing audit log entries."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def log(
        self,
        event: str,
        *,
        actor_id: str | None = None,
        actor_email: str | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        detail: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        entry = AuditLog(
            event=event,
            actor_id=actor_id,
            actor_email=actor_email,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            ip_address=ip_address,
        )
        self._db.add(entry)
        # Commit immediately, independent of the caller's overall request
        # transaction: audit entries must survive even when the action they
        # describe fails and the outer get_db() dependency rolls everything
        # else back on exception (e.g. auth.login_failed always raises an
        # HTTPException right after logging). Safe because AsyncSessionLocal
        # is expire_on_commit=False, so already-loaded attributes on other
        # ORM objects in this session (e.g. the caller's `user`) stay usable
        # without triggering a lazy-load after this commit.
        await self._db.commit()
