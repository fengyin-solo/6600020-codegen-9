import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import type { Device, Alarm, User, FavoriteItem, FavoriteRegister } from '../types'

const API_BASE = '/api/favorites'
const LAST_USER_KEY = 'modbus_last_user'

export const useModbusStore = defineStore('modbus', () => {
  const devices = ref<Device[]>([])
  const alarms = ref<Alarm[]>([])
  const historyData = ref<Record<string, { time: number[]; values: number[] }>>({})
  const isPolling = ref(false)
  const pollInterval = ref(1000)
  const selectedDevice = ref<Device | null>(null)

  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const favorites = ref<FavoriteItem[]>([])
  const favoritesLoaded = ref(false)

  const criticalAlarms = computed(() => alarms.value.filter(a => a.level === 'critical' && !a.acknowledged))
  const onlineDevices = computed(() => devices.value.filter(d => d.online))

  const favoriteRegisters = computed<FavoriteRegister[]>(() => {
    const sorted = [...favorites.value].sort((a, b) => a.order - b.order)
    return sorted.map(fav => {
      const dev = devices.value.find(d => d.id === fav.deviceId)
      const reg = dev?.registers.find(r => r.address === fav.address)
      if (!dev || !reg) return null
      return {
        ...reg,
        deviceId: dev.id,
        deviceName: dev.name,
        isOnline: dev.online,
      }
    }).filter((r): r is FavoriteRegister => r !== null)
  })

  function mapUser(raw: any): User {
    return { userId: raw.user_id, displayName: raw.display_name, role: raw.role }
  }

  function mapFavorite(raw: any): FavoriteItem {
    return { userId: raw.user_id, deviceId: raw.device_id, address: raw.address, order: raw.order ?? 0 }
  }

  async function fetchUsers() {
    try {
      const { data } = await axios.get(`${API_BASE}/users`)
      users.value = (data as any[]).map(mapUser)
      const lastUserId = localStorage.getItem(LAST_USER_KEY)
      if (lastUserId) {
        const found = users.value.find(u => u.userId === lastUserId)
        if (found) await selectUser(found)
      }
    } catch {
      users.value = []
    }
  }

  async function selectUser(user: User) {
    currentUser.value = user
    localStorage.setItem(LAST_USER_KEY, user.userId)
    await fetchFavorites()
  }

  async function fetchFavorites() {
    if (!currentUser.value) { favorites.value = []; return }
    try {
      const { data } = await axios.get(`${API_BASE}/${currentUser.value.userId}`)
      favorites.value = (data as any[]).map(mapFavorite).sort((a, b) => a.order - b.order)
      favoritesLoaded.value = true
    } catch {
      favorites.value = []
    }
  }

  function isFavorite(deviceId: string, address: number): boolean {
    return favorites.value.some(f => f.deviceId === deviceId && f.address === address)
  }

  async function addFavorite(deviceId: string, address: number) {
    if (!currentUser.value || isFavorite(deviceId, address)) return
    try {
      const { data } = await axios.post(API_BASE, {
        user_id: currentUser.value.userId,
        device_id: deviceId,
        address,
      })
      favorites.value.push(mapFavorite(data))
    } catch { /* noop */ }
  }

  async function removeFavorite(deviceId: string, address: number) {
    if (!currentUser.value) return
    try {
      await axios.delete(`${API_BASE}/${currentUser.value.userId}/${deviceId}/${address}`)
      const idx = favorites.value.findIndex(f => f.deviceId === deviceId && f.address === address)
      if (idx !== -1) favorites.value.splice(idx, 1)
    } catch { /* noop */ }
  }

  async function toggleFavorite(deviceId: string, address: number) {
    if (isFavorite(deviceId, address)) {
      await removeFavorite(deviceId, address)
    } else {
      await addFavorite(deviceId, address)
    }
  }

  async function moveFavorite(deviceId: string, address: number, direction: -1 | 1) {
    if (!currentUser.value) return
    try {
      await axios.put(`${API_BASE}/reorder`, {
        user_id: currentUser.value.userId,
        device_id: deviceId,
        address,
        direction,
      })
      await fetchFavorites()
    } catch { /* noop */ }
  }

  async function clearFavorites() {
    if (!currentUser.value) return
    try {
      await axios.delete(`${API_BASE}/${currentUser.value.userId}`)
      favorites.value = []
    } catch { /* noop */ }
  }

  function initMockDevices() {
    devices.value = [
      {
        id: 'dev1', name: '温湿度传感器-A区', ip: '192.168.1.101', port: 502, slaveId: 1, online: true,
        registers: [
          { address: 0, name: '温度', type: 'holding', value: 25.6, unit: '°C', updatedAt: Date.now() },
          { address: 1, name: '湿度', type: 'holding', value: 62.3, unit: '%RH', updatedAt: Date.now() },
          { address: 2, name: '露点', type: 'holding', value: 17.8, unit: '°C', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev2', name: '压力变送器-B区', ip: '192.168.1.102', port: 502, slaveId: 2, online: true,
        registers: [
          { address: 0, name: '管道压力', type: 'holding', value: 3.45, unit: 'MPa', updatedAt: Date.now() },
          { address: 1, name: '差压', type: 'holding', value: 0.12, unit: 'kPa', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev3', name: '电机控制器-C区', ip: '192.168.1.103', port: 502, slaveId: 3, online: false,
        registers: [
          { address: 0, name: '转速', type: 'holding', value: 1480, unit: 'RPM', updatedAt: Date.now() },
          { address: 1, name: '电流', type: 'holding', value: 12.5, unit: 'A', updatedAt: Date.now() },
          { address: 2, name: '运行状态', type: 'coil', value: true, unit: '', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev4', name: '流量计-D区', ip: '192.168.1.104', port: 502, slaveId: 4, online: true,
        registers: [
          { address: 0, name: '瞬时流量', type: 'holding', value: 156.7, unit: 'L/min', updatedAt: Date.now() },
          { address: 1, name: '累计流量', type: 'holding', value: 98234, unit: 'L', updatedAt: Date.now() },
        ]
      },
    ]
    selectedDevice.value = devices.value[0]
  }

  function simulatePoll() {
    for (const dev of devices.value) {
      if (!dev.online) continue
      for (const reg of dev.registers) {
        if (typeof reg.value === 'number') {
          const noise = (Math.random() - 0.5) * reg.value * 0.02
          reg.value = Math.round((reg.value + noise) * 100) / 100
          reg.updatedAt = Date.now()
          const key = `${dev.id}_${reg.address}`
          if (!historyData.value[key]) historyData.value[key] = { time: [], values: [] }
          historyData.value[key].time.push(Date.now())
          historyData.value[key].values.push(reg.value)
          if (historyData.value[key].time.length > 100) {
            historyData.value[key].time.shift()
            historyData.value[key].values.shift()
          }
          if (reg.name === '温度' && reg.value > 28) {
            alarms.value.unshift({
              id: `a_${Date.now()}`, deviceId: dev.id, register: reg.name,
              message: `${dev.name} ${reg.name}超限: ${reg.value}${reg.unit}`,
              level: reg.value > 30 ? 'critical' : 'warning',
              timestamp: Date.now(), acknowledged: false
            })
          }
        }
      }
    }
    if (alarms.value.length > 50) alarms.value = alarms.value.slice(0, 50)
  }

  function acknowledgeAlarm(id: string) {
    const a = alarms.value.find(a => a.id === id)
    if (a) a.acknowledged = true
  }

  function toggleDevice(id: string) {
    const d = devices.value.find(d => d.id === id)
    if (d) d.online = !d.online
  }

  return {
    devices, alarms, historyData, isPolling, pollInterval, selectedDevice,
    users, currentUser, favorites, favoritesLoaded, favoriteRegisters,
    criticalAlarms, onlineDevices,
    initMockDevices, simulatePoll, acknowledgeAlarm, toggleDevice,
    fetchUsers, selectUser, fetchFavorites,
    isFavorite, addFavorite, removeFavorite, toggleFavorite, moveFavorite, clearFavorites
  }
})
