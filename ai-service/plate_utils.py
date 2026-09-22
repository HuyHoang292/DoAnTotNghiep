"""
plate_utils.py

Ghép ký tự OCR thành chuỗi biển số xe Việt Nam.

Cấu trúc biển số Việt Nam (theo Thông tư 24/2023/TT-BCA và tiêu chuẩn hiện hành):

  Ô tô / xe tải / xe khách (biển 1 hàng ngang):
    - Biển cũ  4 số : DD L-NNNN          vd: 30A-1234
    - Biển mới 5 số : DD L-NNN.NN        vd: 30F-123.45
    - Seri 2 chữ   : DD LL-NNN.NN        vd: 51DA-123.45  (DA, HC, KT, LD, MA, TĐ...)

  Xe máy (biển 2 hàng):
    - Seri cũ  4 số : DD-LN / NNNN       vd: 29-S1/1234   → raw "29S11234"
    - Seri mới 5 số : DD-LN / NNN.NN     vd: 29-X1/123.45 → raw "29X11234 5"
    - Seri LL  5 số : DD-LL / NNN.NN     vd: 29-AB/123.45 → raw "29AB12345"
    - Biển điện     : DD-MĐN / NNN.NN    (có ký tự Đ — bỏ qua trong OCR thông thường)

  Biển xanh (cơ quan nhà nước, định dạng tương tự ô tô).

Quy ước sắp xếp ký tự:
  - Biển 1 hàng  → sort theo trục X
  - Biển 2 hàng  → hàng trên trước (sort X), hàng dưới sau (sort X)
    Ngưỡng phân biệt 2 hàng: khoảng cách max-min tâm Y > 1.2 × chiều cao trung bình ký tự
    (threshold 0.6 cũ quá thấp, dễ tách nhầm biển 1 hàng bị nghiêng)
"""


def ghep_ky_tu_thanh_bien_so(results, model_names):
    """
    Nhận kết quả detect ký tự từ model read_characters.pt,
    trả về (chuỗi_biển_số, độ_tin_cậy_trung_bình).

    Hỗ trợ:
      - Biển 1 hàng : ô tô, xe tải, xe khách
      - Biển 2 hàng : xe máy (hàng trên = mã tỉnh + seri, hàng dưới = số thứ tự)
    """
    chars = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        char_class = model_names[int(box.cls[0])]
        confidence = box.conf[0].item()
        chars.append({
            'char': char_class,
            'x_center': (x1 + x2) / 2,
            'y_center': (y1 + y2) / 2,
            'height': y2 - y1,
            'confidence': confidence,
        })

    if not chars:
        return "", 0.0

    # ── NMS đơn giản: bỏ ký tự bị che khuất quá nhiều (IoU > 0.5) ──────────
    chars = _nms_chars(chars)
    if not chars:
        return "", 0.0

    avg_height = sum(c['height'] for c in chars) / len(chars)
    y_values = [c['y_center'] for c in chars]
    y_range = max(y_values) - min(y_values)

    # ── Phân biệt 1 hàng vs 2 hàng ──────────────────────────────────────────
    # Ngưỡng 1.2 × chiều cao: khoảng cách tâm 2 hàng ký tự xe máy thường
    # vào khoảng 1.3–1.8× chiều cao ký tự.
    # Ngưỡng cũ 0.6 quá thấp, dễ tách nhầm biển ô tô bị chụp nghiêng.
    IS_TWO_LINE = y_range > avg_height * 1.2

    if IS_TWO_LINE:
        y_mid = (min(y_values) + max(y_values)) / 2
        dong_tren = sorted(
            [c for c in chars if c['y_center'] < y_mid],
            key=lambda c: c['x_center']
        )
        dong_duoi = sorted(
            [c for c in chars if c['y_center'] >= y_mid],
            key=lambda c: c['x_center']
        )
        # Hàng trên: mã tỉnh (2 chữ số) + seri (1–2 ký tự)
        # Hàng dưới: số thứ tự (4–5 chữ số)
        chars_sorted = dong_tren + dong_duoi
    else:
        chars_sorted = sorted(chars, key=lambda c: c['x_center'])

    bien_so = ''.join(c['char'] for c in chars_sorted)
    do_tin_cay = sum(c['confidence'] for c in chars_sorted) / len(chars_sorted)
    return bien_so, do_tin_cay


def _iou(a, b):
    """Tính IoU giữa 2 ký tự dùng tâm + kích thước (xấp xỉ bounding box vuông)."""
    # Ước tính width ≈ height * 0.7 cho ký tự biển số
    aw = a['height'] * 0.7
    ah = a['height']
    bw = b['height'] * 0.7
    bh = b['height']

    ax1, ay1 = a['x_center'] - aw / 2, a['y_center'] - ah / 2
    ax2, ay2 = a['x_center'] + aw / 2, a['y_center'] + ah / 2
    bx1, by1 = b['x_center'] - bw / 2, b['y_center'] - bh / 2
    bx2, by2 = b['x_center'] + bw / 2, b['y_center'] + bh / 2

    inter_w = max(0, min(ax2, bx2) - max(ax1, bx1))
    inter_h = max(0, min(ay2, by2) - max(ay1, by1))
    inter = inter_w * inter_h
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _nms_chars(chars, iou_threshold=0.5):
    """Loại bỏ ký tự trùng lặp bằng Non-Maximum Suppression theo confidence."""
    sorted_chars = sorted(chars, key=lambda c: c['confidence'], reverse=True)
    kept = []
    for c in sorted_chars:
        if all(_iou(c, k) < iou_threshold for k in kept):
            kept.append(c)
    return kept
