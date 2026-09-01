from vision.detection.inference import run_inference


def test_inference_returns_list_on_blank_frame():
    import numpy as np

    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    result = run_inference(frame)
    assert isinstance(result, list)
