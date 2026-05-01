<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const days = ref('00')
const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const isExpired = ref(false)

const targetDate = new Date('2026-06-14T23:59:59').getTime()
let timer = null

const pad = (num) => String(num).padStart(2, '0')

const updateCountdown = () => {
  const now = new Date().getTime()
  const distance = targetDate - now

  if (distance < 0) {
    isExpired.value = true
    if (timer) clearInterval(timer)
    return
  }

  days.value = String(Math.floor(distance / (1000 * 60 * 60 * 24)))
  hours.value = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  minutes.value = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)))
  seconds.value = pad(Math.floor((distance % (1000 * 60)) / 1000))
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="p-6 rounded-2xl bg-gradient-to-br from-ustc to-blue-800 text-white shadow-lg relative overflow-hidden group mb-6">
    <!-- 背景装饰图标 -->
    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <i class="fa-solid fa-clock-rotate-left fa-4x"></i>
    </div>

    <div class="relative z-10">
      <!-- 标题 -->
      <h3 class="!text-white !mt-0 !mb-4 text-base opacity-85 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-hourglass-half animate-pulse"></i>
        Next Deadline: Lab3
      </h3>

      <!-- 已截止状态 -->
      <div v-if="isExpired" class="text-3xl font-bold mb-4 text-red-300">
        已截止
      </div>

      <!-- 倒计时块 -->
      <div v-else class="flex gap-2 mb-4">
        <!-- Days -->
        <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
          <div class="text-3xl font-mono font-bold leading-none">{{ days }}</div>
          <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">days</div>
        </div>
        <!-- Hours -->
        <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
          <div class="text-3xl font-mono font-bold leading-none">{{ hours }}</div>
          <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">hours</div>
        </div>
        <!-- Minutes -->
        <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
          <div class="text-3xl font-mono font-bold leading-none">{{ minutes }}</div>
          <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">mins</div>
        </div>
        <!-- Seconds（最后一天显示） -->
        <div v-if="days === '0'" class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
          <div class="text-3xl font-mono font-bold leading-none">{{ seconds }}</div>
          <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">secs</div>
        </div>
      </div>

      <!-- 底部截止日期 -->
      <div class="flex justify-between items-center bg-white/10 rounded-xl px-3 py-2">
        <span class="text-xs opacity-60">Distance to submission</span>
        <span class="text-xs font-medium bg-white/15 rounded-md px-2 py-1">Jun 14, 23:59</span>
      </div>
    </div>
  </div>
</template>