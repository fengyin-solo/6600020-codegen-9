import json
import os
from typing import List, Dict, Any, Optional
from app.models.schemas import FavoriteItem, FavoriteCreate

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
DATA_FILE = os.path.join(DATA_DIR, "favorites.json")

DUTY_USERS = [
    {"user_id": "zhangwei", "display_name": "张伟", "role": "白班"},
    {"user_id": "lina", "display_name": "李娜", "role": "白班"},
    {"user_id": "wangqiang", "display_name": "王强", "role": "夜班"},
    {"user_id": "zhaoli", "display_name": "赵丽", "role": "夜班"},
    {"user_id": "liuyang", "display_name": "刘洋", "role": "机动"},
]

def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _load_all() -> Dict[str, List[Dict[str, Any]]]:
    _ensure_data_dir()
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}

def _save_all(data: Dict[str, List[Dict[str, Any]]]):
    _ensure_data_dir()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_users() -> List[Dict[str, str]]:
    return DUTY_USERS

def get_favorites(user_id: str) -> List[FavoriteItem]:
    data = _load_all()
    items = data.get(user_id, [])
    return [FavoriteItem(**item) for item in items]

def add_favorite(data: FavoriteCreate) -> FavoriteItem:
    all_data = _load_all()
    user_id = data.user_id
    if user_id not in all_data:
        all_data[user_id] = []
    for f in all_data[user_id]:
        if f["device_id"] == data.device_id and f["address"] == data.address:
            return FavoriteItem(**f)
    item = {"user_id": user_id, "device_id": data.device_id, "address": data.address, "order": len(all_data[user_id])}
    all_data[user_id].append(item)
    _save_all(all_data)
    return FavoriteItem(**item)

def remove_favorite(user_id: str, device_id: str, address: int) -> bool:
    all_data = _load_all()
    if user_id not in all_data:
        return False
    favs = all_data[user_id]
    for i, f in enumerate(favs):
        if f["device_id"] == device_id and f["address"] == address:
            favs.pop(i)
            for j, item in enumerate(favs):
                item["order"] = j
            _save_all(all_data)
            return True
    return False

def reorder_favorites(user_id: str, device_id: str, address: int, direction: int) -> bool:
    all_data = _load_all()
    if user_id not in all_data:
        return False
    favs = all_data[user_id]
    idx = None
    for i, f in enumerate(favs):
        if f["device_id"] == device_id and f["address"] == address:
            idx = i
            break
    if idx is None:
        return False
    target = idx + direction
    if target < 0 or target >= len(favs):
        return False
    favs[idx], favs[target] = favs[target], favs[idx]
    for j, item in enumerate(favs):
        item["order"] = j
    _save_all(all_data)
    return True

def clear_favorites(user_id: str) -> int:
    all_data = _load_all()
    count = len(all_data.get(user_id, []))
    all_data[user_id] = []
    _save_all(all_data)
    return count
