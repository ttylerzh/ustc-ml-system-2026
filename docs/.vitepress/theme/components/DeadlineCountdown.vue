<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 1. DDL 模块数据
const deadlines = ref([
  {
    id: 'lab3',
    title: 'Next Deadline: Lab3',
    targetStr: '2026-06-14T23:59:59',
    dateDisplay: 'Jun 14, 23:59',
    // 渐变色 1：经典科技蓝
    bgClass: 'from-blue-600 to-indigo-800', 
    days: '00', hours: '00', minutes: '00', seconds: '00',
    isExpired: false
  },
  {
    id: 'final-project',
    title: 'Critical: Final Project',
    targetStr: '2026-06-19T23:59:59',
    dateDisplay: 'Jun 19, 23:59',
    // 渐变色 2：深紫罗兰（对应重要项目）
    bgClass: 'from-purple-600 to-indigo-900', 
    days: '00', hours: '00', minutes: '00', seconds: '00',
    isExpired: false
  }
])

let timer = null
const pad = (num) => String(num).padStart(2, '0')

// 2. 倒计时独立更新逻辑
const updateCountdowns = () => {
  const now = new Date().getTime()

  deadlines.value.forEach(item => {
    const targetDate = new Date(item.targetStr).getTime()
    const distance = targetDate - now

    if (distance < 0) {
      item.isExpired = true
      item.days = '00'
      item.hours = '00'
      item.minutes = '00'
      item.seconds = '00'
      return
    }

    item.isExpired = false
    item.days = String(Math.floor(distance / (1000 * 60 * 60 * 24)))
    item.hours = pad(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
    item.minutes = pad(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)))
    item.seconds = pad(Math.floor((distance % (1000 * 60)) / 1000))
  })
}

onMounted(() => {
  updateCountdowns()
  timer = setInterval(updateCountdowns, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="flex flex-col gap-4 mb-6">
    
    <div 
      v-for="item in deadlines" 
      :key="item.id"
      :class="[item.bgClass, 'p-6 rounded-2xl bg-gradient-to-br text-white shadow-lg relative overflow-hidden group transition-all duration-300 hover:shadow-xl']"
    >
      <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <i class="fa-solid fa-clock-rotate-left fa-4x"></i>
      </div>

      <div class="relative z-10">
        <h3 class="!text-white !mt-0 !mb-4 text-base opacity-90 font-semibold flex items-center gap-2">
          <i class="fa-solid fa-hourglass-half animate-pulse"></i>
          {{ item.title }}
        </h3>

        <div v-if="item.isExpired" class="text-3xl font-bold mb-4 text-red-300">
          已截止
        </div>

        <div v-else class="flex gap-2 mb-4">
          <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
            <div class="text-3xl font-mono font-bold leading-none">{{ item.days }}</div>
            <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">days</div>
          </div>
          <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
            <div class="text-3xl font-mono font-bold leading-none">{{ item.hours }}</div>
            <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">hours</div>
          </div>
          <div class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
            <div class="text-3xl font-mono font-bold leading-none">{{ item.minutes }}</div>
            <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">mins</div>
          </div>
          <div v-if="item.days === '0'" class="flex-1 bg-white/15 rounded-xl py-2 px-1 text-center">
            <div class="text-3xl font-mono font-bold leading-none">{{ item.seconds }}</div>
            <div class="text-xs opacity-60 mt-1 uppercase tracking-widest">secs</div>
          </div>
        </div>

        <div class="flex justify-between items-center bg-white/10 rounded-xl px-3 py-2">
          <span class="text-xs opacity-60">Distance to submission</span>
          <span class="text-xs font-medium bg-white/15 rounded-md px-2 py-1">{{ item.dateDisplay }}</span>
        </div>
      </div>
    </div>

  </div>
</template>