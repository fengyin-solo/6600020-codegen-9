<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-64 bg-gray-900 p-4 flex flex-col gap-3 border-r border-gray-800 overflow-y-auto">
      <h1 class="text-lg font-bold text-orange-400">Modbus 工业监控</h1>

      <!-- User Selector -->
      <div class="bg-gray-800 rounded p-2">
        <label class="text-gray-400 text-xs block mb-1">值班人员</label>
        <select v-if="store.users.length" v-model="selectedUserId" @change="onUserChange"
          class="w-full bg-gray-700 text-sm rounded px-2 py-1.5 text-gray-200 border border-gray-600 focus:border-orange-500 focus:outline-none">
          <option value="" disabled>选择身份...</option>
          <option v-for="u in store.users" :key="u.userId" :value="u.userId">
            {{ u.displayName }}（{{ u.role }}）
          </option>
        </select>
        <div v-else class="text-xs text-gray-500">加载人员列表...</div>
      </div>

      <div class="flex gap-2">
        <button @click="startPoll" :disabled="store.isPolling" class="flex-1 bg-green-700 py-1.5 rounded text-xs hover:bg-green-600 disabled:opacity-50">
          {{ store.isPolling ? '采集中...' : '开始采集' }}
        </button>
        <button @click="stopPoll" :disabled="!store.isPolling" class="flex-1 bg-red-700 py-1.5 rounded text-xs hover:bg-red-600 disabled:opacity-50">
          停止
        </button>
      </div>
      <div>
        <label class="text-gray-400 text-xs">轮询间隔: {{ store.pollInterval }}ms</label>
        <input type="range" v-model.number="store.pollInterval" min="200" max="5000" step="100" class="w-full" />
      </div>

      <h3 class="text-gray-400 text-xs mt-2">设备列表</h3>
      <div v-for="d in store.devices" :key="d.id" @click="store.selectedDevice = d"
        class="bg-gray-800 rounded p-2 cursor-pointer text-sm"
        :class="store.selectedDevice?.id === d.id ? 'ring-1 ring-orange-500' : ''">
        <div class="flex justify-between">
          <span>{{ d.name }}</span>
          <span class="w-2 h-2 rounded-full mt-1.5" :class="d.online ? 'bg-green-500' : 'bg-red-500'"></span>
        </div>
        <div class="text-xs text-gray-500">{{ d.ip }}:{{ d.port }} [{{ d.slaveId }}]</div>
      </div>

      <div v-if="store.criticalAlarms.length" class="bg-red-900/50 rounded p-2 mt-2">
        <h4 class="text-red-400 text-xs font-bold">⚠ 严重告警 {{ store.criticalAlarms.length }}</h4>
        <div v-for="a in store.criticalAlarms.slice(0, 3)" :key="a.id" class="text-xs text-red-300 mt-1 truncate">
          {{ a.message }}
        </div>
      </div>

      <div class="text-xs text-gray-600 mt-auto">
        在线: {{ store.onlineDevices.length }}/{{ store.devices.length }}
      </div>
    </div>

    <!-- Main Dashboard -->
    <div class="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
      <!-- No user selected prompt -->
      <div v-if="!store.currentUser" class="bg-gray-800/50 rounded-xl p-6 border border-dashed border-gray-600 text-center">
        <svg class="w-10 h-10 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
        </svg>
        <p class="text-gray-400 text-sm">请在左侧选择值班身份，以查看和保存个人收藏指标</p>
      </div>

      <!-- Favorites Section -->
      <div v-else-if="store.favoriteRegisters.length" class="bg-gray-800/50 rounded-xl p-3 border border-orange-500/20">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm text-orange-400 font-bold flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            {{ store.currentUser.displayName }}的收藏
          </h3>
          <button @click="store.clearFavorites()" class="text-xs text-gray-500 hover:text-red-400 transition-colors">
            清空收藏
          </button>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div v-for="(fav, idx) in store.favoriteRegisters" :key="`${fav.deviceId}_${fav.address}`"
            class="bg-gray-900 rounded-lg p-2.5 border border-orange-500/10 hover:border-orange-500/30 transition-colors group relative">
            <div class="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button v-if="idx > 0" @click="store.moveFavorite(fav.deviceId, fav.address, -1)"
                class="text-gray-500 hover:text-orange-400 text-xs w-4 h-4 flex items-center justify-center" title="上移">↑</button>
              <button v-if="idx < store.favoriteRegisters.length - 1" @click="store.moveFavorite(fav.deviceId, fav.address, 1)"
                class="text-gray-500 hover:text-orange-400 text-xs w-4 h-4 flex items-center justify-center" title="下移">↓</button>
              <button @click="store.removeFavorite(fav.deviceId, fav.address)"
                class="text-gray-500 hover:text-red-400 text-xs w-4 h-4 flex items-center justify-center" title="取消收藏">✕</button>
            </div>
            <div class="text-xs text-gray-500 truncate">{{ fav.deviceName }}</div>
            <div class="text-xl font-bold" :class="fav.isOnline ? 'text-orange-400' : 'text-gray-600'">
              {{ typeof fav.value === 'number' ? fav.value.toFixed(fav.value > 100 ? 0 : 1) : fav.value ? 'ON' : 'OFF' }}
            </div>
            <div class="text-xs text-gray-500">{{ fav.name }} {{ fav.unit }}</div>
          </div>
        </div>
      </div>

      <!-- Empty favorites hint -->
      <div v-else class="bg-gray-800/30 rounded-xl p-4 border border-dashed border-gray-700 text-center">
        <p class="text-gray-500 text-sm">点击指标卡片上的 ⭐ 添加常看指标到个人收藏</p>
      </div>

      <!-- Register Gauges -->
      <div class="grid grid-cols-4 gap-3">
        <template v-for="d in store.devices" :key="d.id">
          <div v-for="r in d.registers" :key="`${d.id}_${r.address}`"
            class="bg-gray-900 rounded-xl p-3 relative group">
            <button v-if="store.currentUser" @click="store.toggleFavorite(d.id, r.address)"
              class="absolute top-2 right-2 w-5 h-5 flex items-center justify-center transition-colors"
              :class="store.isFavorite(d.id, r.address) ? 'text-orange-400' : 'text-gray-600 hover:text-orange-400 opacity-0 group-hover:opacity-100'">
              <svg class="w-4 h-4" :fill="store.isFavorite(d.id, r.address) ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </button>
            <div class="text-xs text-gray-400">{{ d.name }}</div>
            <div class="text-2xl font-bold" :class="d.online ? 'text-orange-400' : 'text-gray-600'">
              {{ typeof r.value === 'number' ? r.value.toFixed(r.value > 100 ? 0 : 1) : r.value ? 'ON' : 'OFF' }}
            </div>
            <div class="text-xs text-gray-500">{{ r.name }} {{ r.unit }}</div>
          </div>
        </template>
      </div>

      <!-- Chart -->
      <div class="bg-gray-900 rounded-xl p-3 flex-1">
        <h3 class="text-sm text-gray-400 mb-2">
          实时趋势 — {{ store.selectedDevice?.name || '选择设备' }}
        </h3>
        <TrendChart />
      </div>

      <!-- Alarm List -->
      <div class="bg-gray-900 rounded-xl p-3 max-h-48 overflow-y-auto">
        <h3 class="text-sm text-gray-400 mb-2">告警记录</h3>
        <div v-for="a in store.alarms.slice(0, 10)" :key="a.id"
          class="flex justify-between text-xs bg-gray-800 rounded p-2 mb-1"
          :class="{ 'border-l-4 border-red-500': a.level === 'critical', 'border-l-4 border-yellow-500': a.level === 'warning' }">
          <span>{{ a.message }}</span>
          <div class="flex gap-2">
            <span class="text-gray-500">{{ new Date(a.timestamp).toLocaleTimeString() }}</span>
            <button v-if="!a.acknowledged" @click="store.acknowledgeAlarm(a.id)" class="text-blue-400 hover:underline">确认</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useModbusStore } from './store/modbus'
import TrendChart from './components/TrendChart.vue'

const store = useModbusStore()
let timer: number | null = null

const selectedUserId = ref('')

function onUserChange() {
  const user = store.users.find(u => u.userId === selectedUserId.value)
  if (user) store.selectUser(user)
}

function startPoll() {
  store.isPolling = true
  timer = window.setInterval(() => store.simulatePoll(), store.pollInterval)
}

function stopPoll() {
  store.isPolling = false
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(async () => {
  store.initMockDevices()
  await store.fetchUsers()
  if (store.currentUser) {
    selectedUserId.value = store.currentUser.userId
  }
})
onUnmounted(() => stopPoll())
</script>
