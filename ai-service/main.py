import logging

from fastapi import FastAPI, HTTPException, Response, UploadFile, File
from pydantic import BaseModel, Field
from ultralytics import YOLO
import numpy as np
import cv2

from plate_utils import ghep_ky_tu_thanh_bien_so
from camera_monitor import CameraMonitor

app = FastAPI(title="AI Service - Nhan dien bien so")


class MonitorPollingLogFilter(logging.Filter):
    """Ẩn log của các request GET thành công mà giao diện và backend gọi liên tục khi giám sát."""

    def filter(self, record):
        args = record.args
        if not isinstance(args, tuple) or len(args) != 5:
            return True
        _, method, path, _, status = args
        return not (method == 'GET' and str(path).startswith('/api/ai/monitors/') and int(status) < 400)


logging.getLogger('uvicorn.access').addFilter(MonitorPollingLogFilter())

# Tải 2 model 1 lần duy nhất khi server khởi động (không load lại mỗi request)
detect_model = YOLO('models/detect_plate.pt')
char_model = YOLO('models/read_characters.pt')


@app.get("/health")
def health_check():
    return {"success": True, "message": "AI service dang chay"}


@app.post("/api/ai/detect-plate")
async def detect_plate(file: UploadFile = File(...)):
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Bước 1: Detect vị trí biển số
    plate_results = detect_model(img, conf=0.4, verbose=False)

    if len(plate_results[0].boxes) == 0:
        return {"success": True, "detections": []}

    detections = []
    for box in plate_results[0].boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        plate_confidence = box.conf[0].item()
        plate_crop = img[y1:y2, x1:x2]

        # Bước 2: Đọc ký tự trên vùng biển số vừa crop
        char_results = char_model(plate_crop, conf=0.3, verbose=False)
        plate_text, ocr_confidence = ghep_ky_tu_thanh_bien_so(char_results, char_model.names)

        detections.append({
            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "plate_detection_confidence": round(plate_confidence, 4),
            "plate_text": plate_text,
            "ocr_confidence": round(ocr_confidence, 4),
        })

    return {"success": True, "detections": detections}


# ─── Giám sát vượt đèn đỏ liên tục theo từng camera ──────────────────────────

monitors = {}


class StopLinePayload(BaseModel):
    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)
    x2: float = Field(ge=0, le=1)
    y2: float = Field(ge=0, le=1)
    travelSide: int


class MonitorPayload(BaseModel):
    video_url: str
    stop_line: StopLinePayload
    signal: dict


def _get_monitor(camera_id):
    monitor = monitors.get(camera_id)
    if monitor is None:
        raise HTTPException(status_code=404, detail="Camera chưa được giám sát.")
    return monitor


@app.post("/api/ai/monitors/{camera_id}")
def start_monitor(camera_id: str, payload: MonitorPayload):
    if not payload.video_url.startswith('https://'):
        raise HTTPException(status_code=400, detail="Link video phải dùng https.")
    if payload.stop_line.travelSide not in (1, -1):
        raise HTTPException(status_code=400, detail="Chiều qua vạch không hợp lệ.")

    if camera_id in monitors:
        monitors[camera_id].stop()
    monitor = CameraMonitor(camera_id, payload.video_url, payload.stop_line.model_dump(), payload.signal)
    monitors[camera_id] = monitor
    monitor.start()
    return {"success": True, **monitor.info()}


@app.delete("/api/ai/monitors/{camera_id}")
def stop_monitor(camera_id: str):
    monitor = monitors.pop(camera_id, None)
    if monitor is not None:
        monitor.stop()
    return {"success": True}


@app.get("/api/ai/monitors/{camera_id}")
def get_monitor(camera_id: str):
    return {"success": True, **_get_monitor(camera_id).info()}


@app.get("/api/ai/monitors/{camera_id}/frame")
def get_monitor_frame(camera_id: str):
    frame = _get_monitor(camera_id).frame_jpeg
    if frame is None:
        return Response(status_code=204)
    return Response(content=frame, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@app.get("/api/ai/monitors/{camera_id}/events")
def get_monitor_events(camera_id: str, after: int = 0):
    monitor = _get_monitor(camera_id)
    return {
        "success": True,
        "session": monitor.session,
        "events": [event for event in list(monitor.events) if event['seq'] > after],
    }
