def _iou(a, b):
    """IoU của 2 khung ký tự theo đúng toạ độ (x1, y1, x2, y2)."""
    inter_w = max(0.0, min(a['x2'], b['x2']) - max(a['x1'], b['x1']))
    inter_h = max(0.0, min(a['y2'], b['y2']) - max(a['y1'], b['y1']))
    inter = inter_w * inter_h
    union = (a['x2'] - a['x1']) * (a['y2'] - a['y1']) + (b['x2'] - b['x1']) * (b['y2'] - b['y1']) - inter
    return inter / union if union > 0 else 0


def _nms_chars(chars, iou_threshold=0.5):
    """
    Non-Maximum Suppression cho ký tự - loại bỏ các detection trùng lặp.
    Giữ lại ký tự có confidence cao nhất khi có overlap.
    Dùng đúng khung của ký tự: ký tự hẹp như số 1 không bị coi là chồng lên ký tự bên cạnh.
    """
    kept_chars = []
    for char in sorted(chars, key=lambda c: c['confidence'], reverse=True):
        if all(_iou(char, kept) <= iou_threshold for kept in kept_chars):
            kept_chars.append(char)
    return kept_chars


def _split_by_largest_gap(chars, key, min_gap, min_chars=2):
    """
    Sắp xếp theo `key` (tọa độ Y) rồi cắt tại khoảng trống lớn nhất.
    Trả về (hàng_trên, hàng_dưới) hoặc None nếu không đủ điều kiện là biển 2 hàng.
    """
    if len(chars) < 2 * min_chars:
        return None

    ordered = sorted(chars, key=key)
    best_gap, best_idx = 0.0, -1
    for i in range(len(ordered) - 1):
        gap = key(ordered[i + 1]) - key(ordered[i])
        if gap > best_gap:
            best_gap, best_idx = gap, i

    if best_gap < min_gap:
        return None

    top, bottom = ordered[:best_idx + 1], ordered[best_idx + 1:]
    if len(top) < min_chars or len(bottom) < min_chars:
        return None
    return top, bottom


def _fit_slope(chars):
    """Hệ số góc dy/dx của các ký tự (hồi quy tuyến tính đơn giản)."""
    n = len(chars)
    if n < 2:
        return 0.0
    mean_x = sum(c['x_center'] for c in chars) / n
    mean_y = sum(c['y_center'] for c in chars) / n
    var_x = sum((c['x_center'] - mean_x) ** 2 for c in chars)
    if var_x < 1e-6:
        return 0.0
    cov = sum((c['x_center'] - mean_x) * (c['y_center'] - mean_y) for c in chars)
    return cov / var_x


def _sap_xep_ky_tu(chars):
    """
    Sắp xếp ký tự theo thứ tự đọc biển số Việt Nam:
      - Biển 1 hàng: trái -> phải.
      - Biển 2 hàng (xe máy, ô tô vuông): hàng trên trái -> phải, rồi hàng dưới trái -> phải.
        VD xe máy: 29-B1 / 123.45   ;   ô tô: 30A / 12345
    Có bù trừ độ nghiêng của biển để không bị gán nhầm hàng.
    """
    avg_height = sum(c['height'] for c in chars) / len(chars)
    min_gap = avg_height * 0.5  # khoảng trống Y tối thiểu giữa 2 hàng

    # Bước 1: tách sơ bộ theo Y thô để ước lượng độ nghiêng từng hàng
    rough = _split_by_largest_gap(chars, key=lambda c: c['y_center'], min_gap=min_gap)

    if rough is None:
        slope = _fit_slope(chars)
    else:
        # Độ nghiêng = trung bình hệ số góc trong từng hàng (tránh nhiễu do 2 hàng lệch nhau)
        slopes = [_fit_slope(row) for row in rough if len(row) >= 2]
        slope = sum(slopes) / len(slopes) if slopes else 0.0

    # Giới hạn độ nghiêng hợp lý (~ ±30 độ) để tránh ước lượng sai
    slope = max(-0.58, min(0.58, slope))

    mean_x = sum(c['x_center'] for c in chars) / len(chars)

    # Bước 2: Y đã khử nghiêng
    for c in chars:
        c['y_adj'] = c['y_center'] - slope * (c['x_center'] - mean_x)

    # Bước 3: tách lại 2 hàng trên Y đã khử nghiêng
    split = _split_by_largest_gap(chars, key=lambda c: c['y_adj'], min_gap=min_gap)

    if split is None:
        # Biển 1 hàng
        return sorted(chars, key=lambda c: c['x_center'])

    dong_tren, dong_duoi = split
    dong_tren = sorted(dong_tren, key=lambda c: c['x_center'])
    dong_duoi = sorted(dong_duoi, key=lambda c: c['x_center'])

    # Hàng trên đọc hết rồi mới tới hàng dưới
    return dong_tren + dong_duoi


def ghep_ky_tu_thanh_bien_so(results, model_names):
    chars = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        char_class = model_names[int(box.cls[0])]
        confidence = box.conf[0].item()
        chars.append({
            'char': char_class,
            'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
            'x_center': (x1 + x2) / 2,
            'y_center': (y1 + y2) / 2,
            'height': y2 - y1,
            'confidence': confidence,
        })

    if not chars:
        return "", 0.0

    chars = _nms_chars(chars)
    if not chars:
        return "", 0.0

    chars_sorted = _sap_xep_ky_tu(chars)

    bien_so = ''.join(c['char'] for c in chars_sorted)
    do_tin_cay = sum(c['confidence'] for c in chars_sorted) / len(chars_sorted)
    return bien_so, do_tin_cay