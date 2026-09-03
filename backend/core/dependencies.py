from fastapi import Depends

from backend.schemas.user import UserContext
from backend.services.auth_service import require_authenticated_user
from backend.services.repository import BaseRepository, get_repository


def get_repo() -> BaseRepository:
    return get_repository()


def get_current_user(user: UserContext = Depends(require_authenticated_user)) -> UserContext:
    return user
