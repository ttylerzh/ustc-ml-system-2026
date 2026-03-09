<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const countdown = ref('')
const targetDate = new Date('2026-03-25T23:59:59').getTime()
let timer = null

const updateCountdown = () => {
  const now = new Date().getTime()
  const distance = targetDate - now
  
  if (distance < 0) {
    countdown.value = "EXPIRED"
    return
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  
  countdown.value = `${days}d ${hours}h ${minutes}m`
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="p-6 rounded-xl bg-gradient-to-br from-ustc to-blue-800 text-white shadow-lg relative overflow-hidden group mb-6">
    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <i class="fa-solid fa-server fa-4x"></i>
    </div>
    <h3 class="!text-white !mt-0 !mb-2 text-lg opacity-90 font-bold">Next Deadline: Lab1 </h3>
    <div class="text-4xl font-mono font-bold mb-2 tracking-tighter">
      {{ countdown }}
    </div>
    <p class="text-sm opacity-75">Distance to submission</p>
  </div>
</template>
