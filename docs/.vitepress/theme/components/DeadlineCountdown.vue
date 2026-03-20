<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const countdown = ref('')
// 设置截止日期：2026年3月30日 23:59:59
const targetDate = new Date('2026-03-30T23:59:59').getTime()
let timer = null

const updateCountdown = () => {
  const now = new Date().getTime()
  const distance = targetDate - now

  if (distance < 0) {
    countdown.value = "已截止"
    if (timer) clearInterval(timer)
    return
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)

  // 补零函数，让显示更整齐
  const pad = (num) => String(num).padStart(2, '0')
  
  if (days > 0) {
    countdown.value = `${days}d ${pad(hours)}h ${pad(minutes)}m`
  } else {
    // 最后一天显示秒，增加紧迫感
    countdown.value = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }
}

onMounted(() => {
  updateCountdown()
  // 每秒更新一次，如果是为了省电也可以改为 60000 (每分钟)
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="p-6 rounded-xl bg-gradient-to-br from-ustc to-blue-800 text-white shadow-lg relative overflow-hidden group mb-6">
    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <i class="fa-solid fa-clock-rotate-left fa-4x"></i>
    </div>
    
    <div class="relative z-10">
      <h3 class="!text-white !mt-0 !mb-2 text-lg opacity-90 font-bold flex items-center gap-2">
        <i class="fa-solid fa-hourglass-half animate-pulse"></i>
        Next Deadline: Lab1 
      </h3>
      
      <div class="text-4xl font-mono font-bold mb-2 tracking-tighter">
        {{ countdown }}
      </div>
      
      <div class="flex justify-between items-center text-sm opacity-75">
        <p>Distance to submission</p>
        <p>Mar 30, 23:59</p>
      </div>
    </div>
  </div>
</template>
