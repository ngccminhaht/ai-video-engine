"""Credit transaction service — ensures every credit change is recorded in the ledger."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from core.billing.models import CreditTransaction

logger = logging.getLogger(__name__)


async def create_credit_transaction(
    db: AsyncSession,
    user_id: str,
    type: str,
    amount: int,
    job_id: str | None = None,
    note: str | None = None,
    status: str = "completed",
) -> CreditTransaction:
    """
    Create an immutable credit transaction record.

    Types: hold, charge, refund, grant, purchase, admin_adjustment, expiration
    Amount: negative = deducted from user, positive = added to user
    """
    transaction = CreditTransaction(
        id=str(ULID()),
        user_id=user_id,
        type=type,
        amount=amount,
        job_id=job_id,
        status=status,
        note=note,
    )
    db.add(transaction)
    await db.flush()

    logger.info(
        f"[Credit] {type}: user={user_id} amount={amount:+d} job={job_id or 'N/A'}"
    )
    return transaction
