from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import numpy as np
import cv2

from plate_utils import ghep_ky_tu_thanh_bien_so

app = FastAPI(title="AI Service - Nhan dien bien so")

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