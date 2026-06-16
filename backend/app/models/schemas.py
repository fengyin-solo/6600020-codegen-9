from pydantic import BaseModel
from typing import List, Optional

class ModbusRegister(BaseModel):
    address: int
    name: str
    type: str
    value: float
    unit: str

class Device(BaseModel):
    id: str
    name: str
    ip: str
    port: int
    slave_id: int
    online: bool
    registers: List[ModbusRegister] = []

class FavoriteItem(BaseModel):
    user_id: str
    device_id: str
    address: int

class FavoriteCreate(BaseModel):
    user_id: str
    device_id: str
    address: int
