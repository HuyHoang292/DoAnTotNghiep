"""
Phát hiện vượt đèn đỏ trên từng khung hình của camera cố định:
  YOLO + ByteTrack theo dõi xe -> kiểm tra xe cắt vạch dừng theo đúng chiều
  -> lấy trạng thái đèn tại đúng thời điểm đó -> đọc biển số của xe vi phạm.

Nguồn tín hiệu đèn chỉ cần có hàm state_at(t, frame): VisionSignal đọc màu đèn thật
trong khung hình, SimulatedSignal dùng cho camera không nhìn thấy đèn.
"""
import base64
from collections import Counter, deque
from concurrent.futures import ThreadPoolExecutor
import os
import threading

import cv2
import numpy as np

from plate_utils import ghep_ky_tu_thanh_bien_so

# Mã lớp phương tiện trong COCO
VEHICLE_CLASSES = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}

TRACKER_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bytetrack_traffic.yaml')
VEHICLE_CONF = 0.15  # Ngưỡng phát hiện thấp, việc lọc nhiễu để cho tracker và bộ lọc xe đang chạy
VEHICLE_IMGSZ = 960  # Camera nhìn xa nên xe khá nhỏ so với khung hình
SAMPLE_FPS = 8  # Số khung hình xử lý mỗi giây video
LINE_DEADZONE = 0.004  # Vùng đệm quanh vạch (theo chiều cao khung hình) để xe đứng yên rung bbox không bị tính
MIN_MOVE = 0.01  # Quãng đường tối thiểu trong ~1 giây (theo đường chéo khung hình) để coi là xe đang chạy
PLATE_CROPS_KEPT = 12  # Số ảnh xe giữ lại trước khi qua vạch, lúc xe còn gần camera biển to hơn
PLATE_CROPS_READ = 5  # Chỉ đọc các ảnh lớn nhất để không làm khựng luồng giám sát
PLATE_MIN_CHARS = 7  # Biển số Việt Nam có ít nhất 7 ký tự, ngắn hơn là đọc thiếu
PLATE_READ_SECONDS = 1.5  # Tiếp tục đọc biển trong khoảng này sau khi xe qua vạch
TRACK_TTL_SECONDS = 5  # Bỏ track đã mất dấu quá lâu
PLATE_CANDIDATES_KEPT = 10
CLOSEUP_PADDING = 0.15  # Chừa viền quanh ảnh cận để không cắt mất ký tự
CLOSEUP_MIN_WIDTH = 480
DUPLICATE_SECONDS = 1.5
DUPLICATE_IOU = 0.3

# Đèn LED đang sáng: điểm ảnh rất sáng và đậm màu (OpenCV: H 0-180)
LAMP_LOW = np.array((0, 90, 170))
LAMP_HIGH = np.array((180, 255, 255))
LAMP_MIN_PIXELS = 12
SIGNAL_VOTES = 5  # Lấy đa số qua vài khung hình để tránh nhiễu do LED nhấp nháy

STATE_COLORS = {'RED': (0, 0, 255), 'YELLOW': (0, 200, 255), 'GREEN': (80, 200, 60), 'UNKNOWN': (160, 160, 160)}
STATE_LABELS = {'RED': 'DEN DO', 'YELLOW': 'DEN VANG', 'GREEN': 'DEN XANH', 'UNKNOWN': 'CHUA RO DEN'}

# Model biển số dùng chung giữa các camera nên chỉ một luồng được gọi tại một thời điểm
plate_lock = threading.Lock()
# Đọc biển trong luồng riêng để hình giám sát không bị khựng khi có vi phạm
plate_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='plate-reader')


class SimulatedSignal:
    """Bộ đếm đèn giả lập, chu kỳ xanh -> vàng -> đỏ, tính theo thời gian của video."""

    roi = None

    def __init__(self, green, yellow, red, offset=0):
        self.green = green
        self.yellow = yellow
        self.red = red
        self.offset = offset

    def state_at(self, t, frame=None):
        phase = (t + self.offset) % (self.green + self.yellow + self.red)
        if phase < self.green:
            return 'GREEN'
        if phase < self.green + self.yellow:
            return 'YELLOW'
        return 'RED'


class VisionSignal:
    """Đọc màu đèn thật trong vùng đèn do cán bộ khoanh (camera cố định nên vùng này không đổi)."""

    def __init__(self, roi):
        self.roi = roi
        self.votes = deque(maxlen=SIGNAL_VOTES)

    def state_at(self, t, frame):
        height, width = frame.shape[:2]
        crop = frame[
            int(self.roi['y1'] * height):int(self.roi['y2'] * height),
            int(self.roi['x1'] * width):int(self.roi['x2'] * width),
        ]
        if crop.size:
            # Vùng đèn là 3 bóng xếp dọc: đỏ - vàng - xanh. Xét bóng nào sáng thay vì xét màu,
            # vì đèn vàng LED qua camera có màu cam gần giống đỏ.
            lit = cv2.inRange(cv2.cvtColor(crop, cv2.COLOR_BGR2HSV), LAMP_LOW, LAMP_HIGH)
            lamps = np.array_split(lit, 3, axis=0)
            counts = {state: cv2.countNonZero(lamp) for state, lamp in zip(('RED', 'YELLOW', 'GREEN'), lamps)}
            state, pixels = max(counts.items(), key=lambda item: item[1])
            # Khung hình không thấy đèn nào sáng thì giữ nguyên phiếu trước đó
            if pixels >= LAMP_MIN_PIXELS:
                self.votes.append(state)
        return Counter(self.votes).most_common(1)[0][0] if self.votes else 'UNKNOWN'


def build_signal(config):
    if config.get('mode') == 'VISION':
        return VisionSignal(config['roi'])
    return SimulatedSignal(config['green'], config['yellow'], config['red'], config.get('offset', 0))


class StopLine:
    """Vạch dừng dùng toạ độ chuẩn hoá 0-1; travel_side là phía xe đi tới sau khi qua vạch (1 hoặc -1)."""

    def __init__(self, x1, y1, x2, y2, travel_side, width, height):
        self.ax, self.ay = x1 * width, y1 * height
        self.bx, self.by = x2 * width, y2 * height
        self.travel_side = travel_side
        self.dx, self.dy = self.bx - self.ax, self.by - self.ay
        self.length = (self.dx ** 2 + self.dy ** 2) ** 0.5
        self.deadzone = LINE_DEADZONE * height

    def side_of(self, x, y):
        """Trả về 1 hoặc -1, hoặc 0 nếu điểm còn nằm trong vùng đệm của vạch."""
        distance = (self.dx * (y - self.ay) - self.dy * (x - self.ax)) / self.length
        if abs(distance) <= self.deadzone:
            return 0
        return 1 if distance > 0 else -1

    def spans(self, x, y):
        """Điểm có nằm trong phạm vi hai đầu vạch hay không (vạch chỉ áp dụng cho các làn nó phủ)."""
        u = ((x - self.ax) * self.dx + (y - self.ay) * self.dy) / (self.length ** 2)
        return 0 <= u <= 1


def _read_plates(crop, plate_model, char_model):
    """Đọc mọi biển số trong ảnh crop của xe, trả về danh sách gồm chuỗi ký tự, độ tin cậy và ảnh biển."""
    readings = []
    with plate_lock:
        for box in plate_model(crop, conf=0.4, verbose=False)[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            plate_crop = crop[y1:y2, x1:x2]
            if plate_crop.size == 0:
                continue
            closeup = _pad_crop(crop, x1, y1, x2, y2).copy()
            # Đọc trên vùng biển sát viền (phần viền của ảnh cận làm model đọc sai), cả bản gốc lẫn bản
            # tăng tương phản: biển tối hoặc mờ thường chỉ đọc đủ ký tự ở một trong hai bản.
            # Giữ cả lần đọc thiếu ký tự vì ảnh vẫn giúp người xem.
            for variant in (plate_crop, _enhance_contrast(plate_crop)):
                text, confidence = ghep_ky_tu_thanh_bien_so(char_model(variant, conf=0.3, verbose=False), char_model.names)
                readings.append({'text': text, 'confidence': confidence, 'image': closeup})
    return readings


def _pad_crop(image, x1, y1, x2, y2):
    pad_x, pad_y = int((x2 - x1) * CLOSEUP_PADDING), int((y2 - y1) * CLOSEUP_PADDING)
    return image[max(0, y1 - pad_y):y2 + pad_y, max(0, x1 - pad_x):x2 + pad_x]


def _enhance_contrast(image):
    lightness, a, b = cv2.split(cv2.cvtColor(image, cv2.COLOR_BGR2LAB))
    lightness = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4)).apply(lightness)
    return cv2.cvtColor(cv2.merge((lightness, a, b)), cv2.COLOR_LAB2BGR)


def _encode_closeup(image):
    """Phóng to ảnh cận để người xem nhìn rõ; chỉ nội suy nên không thêm được chi tiết mới."""
    height, width = image.shape[:2]
    if width < CLOSEUP_MIN_WIDTH:
        scale = CLOSEUP_MIN_WIDTH / width
        image = cv2.resize(image, (CLOSEUP_MIN_WIDTH, int(height * scale)), interpolation=cv2.INTER_CUBIC)
    ok, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise RuntimeError('Không mã hoá được ảnh cận.')
    return 'data:image/jpeg;base64,' + base64.b64encode(encoded).decode('ascii')


def _area(image):
    return image.shape[0] * image.shape[1]


def _crop_vehicle(frame, box):
    x1, y1, x2, y2 = box
    pad_x, pad_y = int((x2 - x1) * 0.05), int((y2 - y1) * 0.05)
    return frame[max(0, y1 - pad_y):y2 + pad_y, max(0, x1 - pad_x):x2 + pad_x].copy()


def _iou(box, other):
    x1, y1, x2, y2 = box
    inter_w = max(0, min(x2, other['x2']) - max(x1, other['x1']))
    inter_h = max(0, min(y2, other['y2']) - max(y1, other['y1']))
    inter = inter_w * inter_h
    union = (x2 - x1) * (y2 - y1) + (other['x2'] - other['x1']) * (other['y2'] - other['y1']) - inter
    return inter / union if union > 0 else 0


def _rank_plates(readings):
    """Gộp kết quả đọc qua nhiều khung hình: chuỗi xuất hiện nhiều và tin cậy cao được xếp trước."""
    groups = {}
    for reading in readings:
        if len(reading['text']) < PLATE_MIN_CHARS:
            continue
        group = groups.setdefault(reading['text'], {'score': 0.0, 'best': 0.0, 'image': reading['image']})
        group['score'] += reading['confidence']
        group['best'] = max(group['best'], reading['confidence'])
        if _area(reading['image']) > _area(group['image']):
            group['image'] = reading['image']
    ranked = sorted(groups.items(), key=lambda item: item[1]['score'], reverse=True)[:PLATE_CANDIDATES_KEPT]
    return [
        {'text': text, 'confidence': round(group['best'], 4), 'image': _encode_closeup(group['image'])}
        for text, group in ranked
    ]


class RedLightDetector:
    """Giữ trạng thái theo dõi của một camera; gọi process() lần lượt cho từng khung hình."""

    def __init__(self, stop_line, signal, vehicle_model, plate_model, char_model, width, height):
        self.line = StopLine(
            stop_line['x1'], stop_line['y1'], stop_line['x2'], stop_line['y2'],
            stop_line['travelSide'], width, height,
        )
        self.signal = signal
        self.vehicle_model = vehicle_model
        self.plate_model = plate_model
        self.char_model = char_model
        self.min_move = MIN_MOVE * (width ** 2 + height ** 2) ** 0.5
        self.tracks = {}
        self.pending = []
        self.recent = deque(maxlen=8)
        self.state = 'UNKNOWN'
        self.boxes = []
        self.frame_count = 0
        self.crossed_allowed = 0
        self.violations = 0

    def _snapshot(self, frame, box, state, t):
        image = frame.copy()
        color = STATE_COLORS[state]
        cv2.line(image, (int(self.line.ax), int(self.line.ay)), (int(self.line.bx), int(self.line.by)), color, 4)
        cv2.rectangle(image, (box[0], box[1]), (box[2], box[3]), color, 4)
        scale = image.shape[1] / 1920
        label = f"{STATE_LABELS[state]} - t={t:.1f}s"
        cv2.rectangle(image, (16, 16), (int(16 + 420 * scale), int(16 + 56 * scale)), (0, 0, 0), -1)
        cv2.putText(image, label, (28, int(16 + 40 * scale)), cv2.FONT_HERSHEY_SIMPLEX, scale, color, max(2, int(2 * scale)), cv2.LINE_AA)
        ok, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 88])
        if not ok:
            raise RuntimeError('Không mã hoá được ảnh bằng chứng.')
        return 'data:image/jpeg;base64,' + base64.b64encode(encoded).decode('ascii')

    def process(self, frame, t):
        """Xử lý một khung hình, trả về các vi phạm vừa hoàn tất việc đọc biển số."""
        self.frame_count += 1
        self.state = self.signal.state_at(t, frame)
        results = self.vehicle_model.track(
            frame, persist=True, tracker=TRACKER_CONFIG, classes=list(VEHICLE_CLASSES),
            conf=VEHICLE_CONF, imgsz=VEHICLE_IMGSZ, verbose=False,
        )[0].boxes

        self.boxes = []
        if results.id is not None:
            for raw_box, raw_id, raw_cls, raw_conf in zip(results.xyxy, results.id, results.cls, results.conf):
                self._update_track(
                    frame, t, tuple(map(int, raw_box)), int(raw_id), int(raw_cls), float(raw_conf),
                )

        for track_id in [k for k, v in self.tracks.items() if t - v['last_seen'] > TRACK_TTL_SECONDS]:
            del self.tracks[track_id]

        return self._collect_finished(t)

    def _update_track(self, frame, t, box, track_id, class_id, confidence):
        line = self.line
        # Điểm chạm mặt đường của xe
        x, y = (box[0] + box[2]) / 2, box[3]
        track = self.tracks.setdefault(track_id, {
            'side': 0,
            'path': deque(maxlen=SAMPLE_FPS),
            'crops': deque(maxlen=PLATE_CROPS_KEPT),
            'event': None,
            'crossed': False,
        })
        track['last_seen'] = t
        track['path'].append((x, y))

        crop = _crop_vehicle(frame, box)
        event = track['event']
        if event is not None:
            if t - event['video_timestamp'] <= PLATE_READ_SECONDS and self.frame_count % 3 == 0:
                event['_futures'].append(plate_executor.submit(_read_plates, crop, self.plate_model, self.char_model))
        elif self.frame_count % 2 == 0:
            track['crops'].append(crop)

        self.boxes.append({'box': box, 'id': track_id, 'class': VEHICLE_CLASSES[class_id], 'violating': event is not None})

        side = line.side_of(x, y)
        if side == 0:
            return
        previous = track['side']
        track['side'] = side
        if previous != -line.travel_side or side != line.travel_side or track['crossed']:
            return
        if not line.spans(x, y):
            return
        start_x, start_y = track['path'][0]
        if ((x - start_x) ** 2 + (y - start_y) ** 2) ** 0.5 < self.min_move:
            return

        # Mỗi xe chỉ tính một lần, tại khung hình đầu tiên cắt qua vạch
        track['crossed'] = True
        if self.state not in ('RED', 'YELLOW'):
            self.crossed_allowed += 1
            return

        # YOLO đôi khi tách một xe thành hai track; khung trùng nhau gần cùng lúc chỉ tính một lần
        if any(t - e['video_timestamp'] <= DUPLICATE_SECONDS and _iou(box, e['bbox']) > DUPLICATE_IOU for e in self.recent):
            return

        largest = sorted(track['crops'], key=lambda c: c.shape[0] * c.shape[1], reverse=True)[:PLATE_CROPS_READ]
        futures = [plate_executor.submit(_read_plates, earlier, self.plate_model, self.char_model) for earlier in largest]
        track['crops'].clear()

        event = {
            'track_id': track_id,
            'video_timestamp': round(t, 3),
            'signal_state': self.state,
            'vehicle_class': VEHICLE_CLASSES[class_id],
            'vehicle_confidence': round(confidence, 4),
            'bbox': {'x1': box[0], 'y1': box[1], 'x2': box[2], 'y2': box[3]},
            'frame_size': {'width': frame.shape[1], 'height': frame.shape[0]},
            'snapshot': self._snapshot(frame, box, self.state, t),
            '_futures': futures,
            '_vehicle_crop': max(largest, key=_area) if largest else crop,
        }
        track['event'] = event
        self.pending.append(event)
        self.recent.append(event)
        self.violations += 1
        self.boxes[-1]['violating'] = True

    def _collect_finished(self, t, flush=False):
        finished = [
            e for e in self.pending
            if flush or (t - e['video_timestamp'] > PLATE_READ_SECONDS and all(f.done() for f in e['_futures']))
        ]
        self.pending = [e for e in self.pending if e not in finished]
        for event in finished:
            readings = [reading for future in event.pop('_futures') for reading in future.result()]
            vehicle_crop = event.pop('_vehicle_crop')
            event['plate_candidates'] = _rank_plates(readings)
            # Không tìm thấy biển thì dùng ảnh cận của xe
            event['closeup'] = _encode_closeup(
                max((r['image'] for r in readings), key=_area) if readings else vehicle_crop,
            )
        return finished

    def flush(self):
        """Lấy nốt các vi phạm đang chờ đọc biển khi video kết thúc."""
        return self._collect_finished(0, flush=True)

    def draw(self, frame, t):
        """Vẽ khung xe, vạch dừng và trạng thái đèn để cán bộ theo dõi quá trình AI kiểm tra."""
        image = frame.copy()
        scale = image.shape[1] / 1280
        thickness = max(2, int(2 * scale))
        color = STATE_COLORS[self.state]
        cv2.line(image, (int(self.line.ax), int(self.line.ay)), (int(self.line.bx), int(self.line.by)), color, thickness * 2)

        roi = self.signal.roi
        if roi:
            height, width = image.shape[:2]
            cv2.rectangle(
                image,
                (int(roi['x1'] * width), int(roi['y1'] * height)),
                (int(roi['x2'] * width), int(roi['y2'] * height)),
                color, thickness,
            )

        for item in self.boxes:
            x1, y1, x2, y2 = item['box']
            box_color = (0, 0, 255) if item['violating'] else (80, 200, 60)
            cv2.rectangle(image, (x1, y1), (x2, y2), box_color, thickness)
            label = f"#{item['id']} {item['class']}" + (' VI PHAM' if item['violating'] else '')
            cv2.putText(image, label, (x1, max(int(18 * scale), y1 - int(6 * scale))), cv2.FONT_HERSHEY_SIMPLEX, 0.55 * scale, box_color, thickness, cv2.LINE_AA)

        header = f"{STATE_LABELS[self.state]} | qua vach hop le: {self.crossed_allowed} | vi pham: {self.violations} | t={t:.1f}s"
        cv2.rectangle(image, (0, 0), (image.shape[1], int(34 * scale)), (0, 0, 0), -1)
        cv2.putText(image, header, (int(10 * scale), int(24 * scale)), cv2.FONT_HERSHEY_SIMPLEX, 0.65 * scale, color, thickness, cv2.LINE_AA)
        return image
