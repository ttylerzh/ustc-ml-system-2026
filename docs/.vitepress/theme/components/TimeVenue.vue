<template>
  <div class="p-6 rounded-xl border border-[var(--vp-c-border)] bg-[var(--vp-c-bg)] shadow-sm mb-6">
    <h3 class="!mt-0 !mb-4 flex items-center gap-2 font-bold text-lg">
      <i class="fa-solid fa-clock text-ustc"></i> 时间与地点
    </h3>
    <div class="flex flex-col md:flex-row gap-6">
      <div class="flex items-center gap-4 flex-1 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-ustc dark:text-blue-400 shadow-sm shrink-0">
          <i class="fa-regular fa-calendar-days fa-lg"></i>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">上课时间</div>
          <div class="font-medium text-gray-900 dark:text-gray-100">
            2~15 周 <span class="mx-2 text-gray-300">|</span> 周二 (3,4,5)
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4 flex-1 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-ustc dark:text-blue-400 shadow-sm shrink-0">
          <i class="fa-solid fa-location-dot fa-lg"></i>
        </div>
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">上课地点</div>
          <div class="font-medium text-gray-900 dark:text-gray-100">
            高新校区 G2-B403
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
