"""ORM models for usage records, credit transactions, and subscriptions."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class UsageRecord(Base):
    """Tracks resource usage per user (generations, storage, etc.)."""

    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # generation, upload, storage
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # credits spent
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # job, subscription, admin_grant
    reference_id: Mapped[Optional[str]] = mapped_column(String(26), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class CreditTransaction(Base):
    """Individual credit transaction (hold, charge, refund, grant, purchase)."""

    __tablename__ = "credit_transactions"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # hold, charge, refund, grant, purchase
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # positive=add, negative=deduct
    job_id: Mapped[Optional[str]] = mapped_column(String(26), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")  # pending, completed, reversed
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Subscription(Base):
    """User subscription plan."""

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(26), nullable=False, unique=True, index=True)
    plan_id: Mapped[str] = mapped_column(String(50), nullable=False)  # free, pro, enterprise
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # active, cancelled, expired
    monthly_credits: Mapped[int] = mapped_column(Integer, nullable=False)
    max_storage_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    max_resolution: Mapped[str] = mapped_column(String(10), nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
