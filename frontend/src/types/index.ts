export interface ModbusRegister {
  address: number
  name: string
  type: 'coil' | 'discrete' | 'holding' | 'input'
  value: number | boolean
  unit: string
  updatedAt: number
}

export interface Device {
  id: string
  name: string
  ip: string
  port: number
  slaveId: number
  online: boolean
  registers: ModbusRegister[]
}

export interface Alarm {
  id: string
  deviceId: string
  register: string
  message: string
  level: 'info' | 'warning' | 'critical'
  timestamp: number
  acknowledged: boolean
}

export interface User {
  userId: string
  displayName: string
  role: string
}

export interface FavoriteItem {
  userId: string
  deviceId: string
  address: number
  order: number
}

export interface FavoriteRegister extends ModbusRegister {
  deviceId: string
  deviceName: string
  isOnline: boolean
}
