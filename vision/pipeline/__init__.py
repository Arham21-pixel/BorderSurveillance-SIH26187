"""
vision/pipeline — pipeline orchestration sub-package.

Public API
----------
CVPipeline              : Main pipeline class (ingestion → contract).
VisionConfig            : All pipeline configuration parameters.
lightweight_cpu_config  : Factory for low-resource CPU config.
balanced_config         : Factory for mid-range CPU config.
high_accuracy_config    : Factory for GPU-accelerated high-accuracy config.
tracking_results_to_contract : Serialise tracking results to backend contract.
contract_to_tracking_results : Deserialise backend contract dict.
"""

from vision.pipeline.config import (
    VisionConfig,
    balanced_config,
    high_accuracy_config,
    lightweight_cpu_config,
)
from vision.pipeline.cv_pipeline import CVPipeline
from vision.pipeline.serializer import (
    contract_to_tracking_results,
    tracking_results_to_contract,
)

__all__ = [
    "CVPipeline",
    "VisionConfig",
    "lightweight_cpu_config",
    "balanced_config",
    "high_accuracy_config",
    "tracking_results_to_contract",
    "contract_to_tracking_results",
]
