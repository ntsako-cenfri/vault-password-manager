"""Client IP extraction that trusts Caddy's X-Real-IP header.

The backend has no published host port -- it is only reachable through the
Caddy reverse proxy, over the internal Docker network (see docker-compose.yml
and Caddyfile). Every Caddy site block sets `header_up X-Real-IP {remote_host}`,
which *overwrites* any client-supplied X-Real-IP rather than appending to it,
so trusting this header here cannot be spoofed by a client -- there is no
network path that reaches this backend without passing through Caddy first.

Without this, `request.client.host` (Starlette's raw TCP peer address) is
always the Caddy container's Docker-bridge IP, never the real client -- which
silently broke both audit-log attribution and the login rate limiter's
per-source-IP bucketing (it was rate-limiting "everyone behind Caddy" as one
shared bucket instead of one bucket per real client).
"""
from starlette.requests import Request


def get_client_ip(request: Request) -> str | None:
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None
