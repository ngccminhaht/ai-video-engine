"""Security middleware — request ID, rate limiting, security headers."""

import time
import uuid
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Adds X-Request-ID header to all responses for tracing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter.

    Limits: 100 requests per minute per IP for general endpoints,
    5 requests per minute for auth endpoints (login/register).

    In production, use Redis-backed rate limiting.
    """

    def __init__(self, app, general_limit: int = 100, auth_limit: int = 10, window: int = 60):
        super().__init__(app)
        self.general_limit = general_limit
        self.auth_limit = auth_limit
        self.window = window
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        now = time.time()

        # Determine limit based on path
        is_auth = path.startswith("/api/v1/auth/login") or path.startswith("/api/v1/auth/register")
        limit = self.auth_limit if is_auth else self.general_limit

        # Key includes path category for auth vs general
        key = f"{client_ip}:{'auth' if is_auth else 'general'}"

        # Clean old entries
        self._requests[key] = [t for t in self._requests[key] if now - t < self.window]

        if len(self._requests[key]) >= limit:
            return Response(
                content='{"error":{"code":"RATE_LIMITED","message":"Too many requests. Please slow down."}}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )

        self._requests[key].append(now)
        return await call_next(request)
