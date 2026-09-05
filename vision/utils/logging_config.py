"""
vision/utils/logging_config.py

Structured logging for the vision package.
All vision components should use get_logger(__name__) instead of print().
"""
from __future__ import annotations

import logging
import sys


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Return a consistently formatted logger for the vision package.

    Usage
    -----
    >>> from vision.utils.logging_config import get_logger
    >>> logger = get_logger(__name__)
    >>> logger.info("Pipeline started")

    Parameters
    ----------
    name:
        Typically ``__name__`` of the calling module.
    level:
        Logging level (default: INFO).
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        # Avoid duplicate handlers when module is reloaded
        return logger

    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger
