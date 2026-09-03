"""API-level exceptions and handlers."""

from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, code: str = "app_error", status_code: int = 400) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def _error_payload(code: str, message: str, path: str) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "path": path,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(code=exc.code, message=exc.message, path=request.url.path),
        )

    @app.exception_handler(Exception)
    async def unknown_error_handler(request: Request, _: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                code="internal_server_error",
                message="An unexpected error occurred.",
                path=request.url.path,
            ),
        )
