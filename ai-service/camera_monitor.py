"""
Giám sát liên tục một camera trong luồng nền: đọc từng khung hình, phát hiện vi phạm,
giữ khung hình đã vẽ mới nhất để cán bộ theo dõi và giữ danh sách vi phạm để backend lấy về.

Hiện dùng video mẫu lặp lại để mô phỏng luồng camera. Khi có camera thật chỉ cần đổi
nguồn đọc khung hình sang RTSP.
"""
from collections import deque
import hashlib
import os
import tempfile
import threading
import time
import urllib.request
import uuid

import cv2
from ultralytics import YOLO

from red_light import SAMPLE_FPS, RedLightDetector, build_signal

VEHICLE_MODEL_PATH = 'models/yolo11n.pt'
MAX_VIDEO_BYTES = 500 * 1024 * 1024
MAX_EVENTS_KEPT = 100
PREVIEW_WIDTH = 1280
PREVIEW_QUALITY = 70

_plate_models = {}
_plate_models_lock = threading.Lock()


def _shared_plate_models():
    # Tách khỏi model của API quét biển để hai luồng không gọi chung một đối tượng
    with _plate_models_lock:
        if not _plate_models:
            _plate_models['plate'] = YOLO('models/detect_plate.pt')
            _plate_models['char'] = YOLO('models/read_characters.pt')
    return _plate_models['plate'], _plate_models['char']


def _cached_video(url):
    """Tải video một lần rồi dùng lại, vì video được phát lặp để mô phỏng camera."""
    folder = os.path.join(tempfile.gettempdir(), 'ai_service_videos')
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, hashlib.sha256(url.encode('utf-8')).hexdigest() + '.mp4')
    if os.path.exists(path):
        return path

    partial = f'{path}.{uuid.uuid4().hex}.part'
    try:
        with urllib.request.urlopen(url, timeout=60) as response, open(partial, 'wb') as output:
            downloaded = 0
            while chunk := response.read(1024 * 1024):
                downloaded += len(chunk)
                if downloaded > MAX_VIDEO_BYTES:
                    raise ValueError('Video quá lớn để giám sát.')
                output.write(chunk)
        os.replace(partial, path)
    finally:
        if os.path.exists(partial):
            os.remove(partial)
    return path


class CameraMonitor(threading.Thread):
    def __init__(self, camera_id, video_url, stop_line, signal_config):
        super().__init__(daemon=True, name=f'monitor-{camera_id}')
        self.camera_id = camera_id
        self.video_url = video_url
        self.stop_line = stop_line
        self.signal_config = signal_config
        self.session = str(uuid.uuid4())
        self.status = 'STARTING'
        self.error = None
        self.loops = 0
        self.video_time = 0.0
        self.signal_state = 'UNKNOWN'
        self.crossed_allowed = 0
        self.violations = 0
        self.processing_fps = 0.0
        self.frame_jpeg = None
        self.events = deque(maxlen=MAX_EVENTS_KEPT)
        self._next_seq = 1
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def _publish(self, events):
        for event in events:
            self.events.append({**event, 'seq': self._next_seq, 'loop': self.loops})
            self._next_seq += 1

    def _encode_preview(self, image):
        height, width = image.shape[:2]
        if width > PREVIEW_WIDTH:
            image = cv2.resize(image, (PREVIEW_WIDTH, int(height * PREVIEW_WIDTH / width)), interpolation=cv2.INTER_AREA)
        ok, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, PREVIEW_QUALITY])
        if ok:
            self.frame_jpeg = encoded.tobytes()

    def _play_once(self, path, plate_model, char_model):
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise ValueError('Không mở được video của camera.')
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            stride = max(1, round(fps / SAMPLE_FPS))
            # Model xe tạo mới mỗi vòng để tracker không giữ trạng thái của vòng trước
            detector = RedLightDetector(
                self.stop_line, build_signal(self.signal_config),
                YOLO(VEHICLE_MODEL_PATH), plate_model, char_model, width, height,
            )

            started = time.monotonic()
            frame_index = -1
            while not self._stop_event.is_set() and cap.grab():
                frame_index += 1
                if frame_index % stride:
                    continue
                ok, frame = cap.retrieve()
                if not ok:
                    break

                t = frame_index / fps
                # Không chạy nhanh hơn thời gian thực. Máy yếu hơn thì hình chậm lại chứ không
                # bỏ khung hình, vì bỏ khung có thể làm sót xe đi qua vạch.
                delay = t - (time.monotonic() - started)
                if delay > 0 and self._stop_event.wait(delay):
                    break

                tick = time.monotonic()
                self._publish(detector.process(frame, t))
                self._encode_preview(detector.draw(frame, t))

                self.video_time = round(t, 2)
                self.signal_state = detector.state
                self.crossed_allowed = detector.crossed_allowed
                self.violations = detector.violations
                self.processing_fps = round(1 / max(time.monotonic() - tick, 1e-3), 1)
                self.status = 'RUNNING'
            self._publish(detector.flush())
        finally:
            cap.release()

    def run(self):
        try:
            path = _cached_video(self.video_url)
            plate_model, char_model = _shared_plate_models()
            while not self._stop_event.is_set():
                self._play_once(path, plate_model, char_model)
                self.loops += 1
            self.status = 'STOPPED'
        except Exception as error:
            self.error = str(error)
            self.status = 'FAILED'

    def info(self):
        return {
            'camera_id': self.camera_id,
            'session': self.session,
            'status': self.status,
            'error': self.error,
            'loops': self.loops,
            'video_time': self.video_time,
            'signal_state': self.signal_state,
            'crossed_allowed': self.crossed_allowed,
            'violations': self.violations,
            'processing_fps': self.processing_fps,
            'last_seq': self._next_seq - 1,
        }
