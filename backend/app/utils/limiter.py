"""Rate-limiter singleton — kept separate to avoid circular imports."""
from slowapi import Limiter

from app.utils.http import get_client_ip

limiter = Limiter(key_func=get_client_ip)
