<script setup>
const announcements = [
  {
    date: '2026-05-01',
    content: 'Lab3 实验要求已经发布，截止时间 6 月 14 日 23:59。',
    badge: { text: 'New', type: 'hot' },
    highlight: '6 月 14 日 23:59'
  },
  {
    date: '2026-04-08',
    content: 'Lab2 实验要求已经发布，截止时间 4 月 20 日 23:59。'
  },
  {
    date: '2026-03-20',
    content: 'Lab1 实验要求已经发布，截止时间 3 月 30 日 23:59。'
  },
  {
    date: '2026-03-10',
    content: '课程正式开启！请大家加入课程微信群。',
    badge: { text: '课程', type: 'info' }
  }
]

const badgeStyles = {
  hot: 'bg-red-500 text-white uppercase tracking-wide font-bold',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium'
}
</script>

<template>
  <div class="p-6 rounded-xl border border-[var(--vp-c-border)] bg-[var(--vp-c-bg)] shadow-sm mb-6">
    <h3 class="!mt-0 !mb-5 flex items-center justify-between font-bold text-lg">
      <span class="flex items-center gap-2">
        <i class="fa-solid fa-bullhorn text-ustc"></i>
        最新公告
      </span>
      <span class="text-xs font-normal text-gray-400">共 {{ announcements.length }} 条</span>
    </h3>

    <ul class="!list-none !pl-0 !my-0 relative">
      <div class="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700"></div>

      <li
        v-for="(item, index) in announcements"
        :key="index"
        class="flex gap-4 text-sm py-2.5 relative"
      >
        <span
          class="relative z-10 mt-1.5 w-3.5 h-3.5 rounded-full ring-4 flex-shrink-0"
          :class="index === 0
            ? 'bg-red-500 ring-red-50 dark:ring-red-900/30'
            : 'bg-gray-300 dark:bg-gray-600 ring-[var(--vp-c-bg)]'"
        ></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="font-mono text-xs text-gray-400">{{ item.date }}</span>
            <span
              v-if="item.badge"
              class="text-[10px] px-1.5 py-0.5 rounded"
              :class="badgeStyles[item.badge.type]"
            >
              {{ item.badge.text }}
            </span>
          </div>
          <p
            class="!my-0 leading-relaxed"
            :class="index === 0 ? '' : 'text-gray-600 dark:text-gray-300'"
          >
            <template v-if="item.highlight">
              {{ item.content.split(item.highlight)[0] }}<span class="font-medium text-ustc">{{ item.highlight }}</span>{{ item.content.split(item.highlight)[1] }}
            </template>
            <template v-else>
              {{ item.content }}
            </template>
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>