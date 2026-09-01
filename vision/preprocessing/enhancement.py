from vision.preprocessing.low_light import enhance_low_light
from vision.preprocessing.resize import resize_frame


def preprocess(frame, width: int = 960, low_light: bool = False):
    frame = resize_frame(frame, width=width)
    if low_light:
        frame = enhance_low_light(frame)
    return frame
