from fastapi import APIRouter, HTTPException
from app.models.schemas import FavoriteItem, FavoriteCreate, FavoriteReorder, User
from app.services.favorites_service import get_favorites, add_favorite, remove_favorite, clear_favorites, reorder_favorites, get_users

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.get("/users", response_model=list[User])
def list_users():
    return get_users()

@router.get("/{user_id}", response_model=list[FavoriteItem])
def list_favorites(user_id: str):
    return get_favorites(user_id)

@router.post("", response_model=FavoriteItem)
def create_favorite(data: FavoriteCreate):
    return add_favorite(data)

@router.put("/reorder")
def reorder(data: FavoriteReorder):
    ok = reorder_favorites(data.user_id, data.device_id, data.address, data.direction)
    if not ok:
        raise HTTPException(status_code=400, detail="Reorder failed")
    return {"status": "reordered"}

@router.delete("/{user_id}/{device_id}/{address}")
def delete_favorite(user_id: str, device_id: str, address: int):
    ok = remove_favorite(user_id, device_id, address)
    if not ok:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"status": "removed"}

@router.delete("/{user_id}")
def delete_all_favorites(user_id: str):
    count = clear_favorites(user_id)
    return {"status": "cleared", "removed_count": count}
