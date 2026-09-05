"""
vision/behaviour — behaviour analytics sub-package.

Public API
----------
BehaviourAnalyser : Main stateful analyser (call .analyse() each frame).
BehaviourEvent    : Typed output event with kind, confidence, features.
is_loitering      : Helper — check if dwell_seconds exceeds threshold.
in_restricted_zone: Helper — point-in-polygon zone check.
centroid_in_zone  : Helper — box-centroid zone check.
clusters          : Helper — group clustering by proximity.
"""

from vision.behaviour.analyser import BehaviourAnalyser, BehaviourEvent
from vision.behaviour.group_detection import clusters
from vision.behaviour.loitering import is_loitering
from vision.behaviour.zone_detection import centroid_in_zone, in_restricted_zone

__all__ = [
    "BehaviourAnalyser",
    "BehaviourEvent",
    "is_loitering",
    "in_restricted_zone",
    "centroid_in_zone",
    "clusters",
]
