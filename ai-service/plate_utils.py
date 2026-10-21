def _nms_chars(chars, iou_threshold=0.5):
    """
    Non-Maximum Suppression cho ký tự - loại bỏ các detection trùng lặp.
    Giữ lại ký tự có confidence cao nhất khi có overlap.
    """
    if not chars:
        return []
    
    # Sắp xếp theo confidence giảm dần
    chars = sorted(chars, key=lambda c: c['confidence'], reverse=True)
    
    kept_chars = []
    
    for char in chars:
        # Tính bounding box của char hiện tại
        char_x1 = char['x_center'] - char['height'] / 2
        char_x2 = char['x_center'] + char['height'] / 2
        char_y1 = char['y_center'] - char['height'] / 2
        char_y2 = char['y_center'] + char['height'] / 2
        char_area = char['height'] * char['height']
        
        # Kiểm tra overlap với các char đã giữ lại
        should_keep = True
        for kept in kept_chars:
            kept_x1 = kept['x_center'] - kept['height'] / 2
            kept_x2 = kept['x_center'] + kept['height'] / 2
            kept_y1 = kept['y_center'] - kept['height'] / 2
            kept_y2 = kept['y_center'] + kept['height'] / 2
            kept_area = kept['height'] * kept['height']
            
            # Tính intersection
            inter_x1 = max(char_x1, kept_x1)
            inter_y1 = max(char_y1, kept_y1)
            inter_x2 = min(char_x2, kept_x2)
            inter_y2 = min(char_y2, kept_y2)
            
            inter_width = max(0, inter_x2 - inter_x1)
            inter_height = max(0, inter_y2 - inter_y1)
            inter_area = inter_width * inter_height
            
            # Tính IoU
            union_area = char_area + kept_area - inter_area
            iou = inter_area / union_area if union_area > 0 else 0
            
            if iou > iou_threshold:
                should_keep = False
                break
        
        if should_keep:
            kept_chars.append(char)
    
    return kept_chars


def ghep_ky_tu_thanh_bien_so(results, model_names):
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

    chars = _nms_chars(chars)
    if not chars:
        return "", 0.0

    # Tính tọa độ Y trung bình để chia đôi ranh giới hàng trên và hàng dưới một cách tuyệt đối
    y_values = [c['y_center'] for c in chars]
    y_min = min(y_values)
    y_max = max(y_values)
    y_mid = (y_min + y_max) / 2

    avg_height = sum(c['height'] for c in chars) / len(chars)
    y_range = y_max - y_min

    IS_TWO_LINE = y_range > avg_height * 1.2

    if IS_TWO_LINE:
        # Tách hoàn toàn thành 2 danh sách dựa vào đường ranh giới Y giữa biển số
        dong_tren_raw = [c for c in chars if c['y_center'] <= y_mid]
        dong_duoi_raw = [c for c in chars if c['y_center'] > y_mid]

        # Sắp xếp từng hàng từ trái qua phải theo trục X
        dong_tren = sorted(dong_tren_raw, key=lambda c: c['x_center'])
        dong_duoi = sorted(dong_duoi_raw, key=lambda c: c['x_center'])

        # NỐI CHẮC CHẮN: Hàng trên xong hết rồi mới tới hàng dưới
        chars_sorted = dong_tren + dong_duoi
    else:
        # Biển 1 hàng: sắp xếp từ trái sang phải
        chars_sorted = sorted(chars, key=lambda c: c['x_center'])

    bien_so = ''.join(c['char'] for c in chars_sorted)
    do_tin_cay = sum(c['confidence'] for c in chars_sorted) / len(chars_sorted)
    return bien_so, do_tin_cay