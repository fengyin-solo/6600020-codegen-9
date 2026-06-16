from typing import List, Dict
from app.models.schemas import FavoriteItem, FavoriteCreate

_favorites: Dict[str, List[FavoriteItem]] = {}

def get_favorites(user_id: str) -> List[FavoriteItem]:
    return _favorites.get(user_id, [])

def add_favorite(data: FavoriteCreate) -> FavoriteItem:
    user_id = data.user_id
    if user_id not in _favorites:
        _favorites[user_id] = []
    for f in _favorites[user_id]:
        if f.device_id == data.device_id and f.address == data.address:
            return f
    item = FavoriteItem(user_id=user_id, device_id=data.device_id, address=data.address)
    _favorites[user_id].append(item)
    return item

def remove_favorite(user_id: str, device_id: str, address: int) -> bool:
    if user_id not in _favorites:
        return False
    favs = _favorites[user_id]
    for i, f in enumerate(favs):
        if f.device_id == device_id and f.address == address:
            favs.pop(i)
            return True
    return False

def clear_favorites(user_id: str) -> int:
    count = len(_favorites.get(user_id, []))
    _favorites[user_id] = []
    return count
