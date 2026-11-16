"""En-têtes de sécurité et limitation du débit (middlewares ASGI légers, sans dépendance externe)."""
from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# L'API ne sert que du JSON et des PNG : rien ne doit pouvoir s'y exécuter ni l'encadrer.
API_CSP = "default-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, hsts: bool) -> None:
        super().__init__(app)
        self.hsts = hsts

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "no-referrer")
        h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        # Les PNG sont lus par le site (canvas) depuis une autre origine : partage autorisé, en lecture seule.
        h.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
            h.setdefault("Content-Security-Policy", API_CSP)
        if self.hsts:
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if "server" in h:
            del h["server"]
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fenêtre glissante d'une minute par adresse IP. Suffisant pour une API publique en lecture seule ;
    derrière plusieurs instances, préférer la limitation du proxy (nginx limit_req, voir deploy/nginx.conf)."""

    def __init__(self, app, *, per_minute: int) -> None:
        super().__init__(app)
        self.per_minute = per_minute
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        if self.per_minute <= 0:
            return await call_next(request)
        ip = request.client.host if request.client else "inconnu"
        now = time.monotonic()
        q = self.hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= self.per_minute:
            return JSONResponse({"detail": "Trop de requêtes, réessayez dans une minute."}, status_code=429, headers={"Retry-After": "60"})
        q.append(now)
        if len(self.hits) > 10_000:  # borne la mémoire si beaucoup d'adresses différentes
            for key in [k for k, v in self.hits.items() if not v or now - v[-1] > 60]:
                del self.hits[key]
        return await call_next(request)
