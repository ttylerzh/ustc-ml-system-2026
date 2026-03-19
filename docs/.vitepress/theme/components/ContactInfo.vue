<template>
  <div class="p-6 rounded-xl border border-[var(--vp-c-border)] bg-[var(--vp-c-bg)] shadow-sm mb-6">
    <h3 class="!mt-0 !mb-6 flex items-center gap-2 font-bold text-lg">
      <i class="fa-solid fa-address-card text-ustc"></i> 联系方式
    </h3>
    
    <!-- 1. 主讲教师 (Primary & Highlighted) -->
    <div class="mb-8">
      <h4 class="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">主讲教师</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Teacher 1 -->
        <div class="flex items-start gap-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-lg bg-white dark:bg-blue-900/40 flex items-center justify-center text-ustc dark:text-blue-400 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
            <i class="fa-solid fa-chalkboard-user fa-lg"></i>
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-lg text-gray-900 dark:text-gray-100">张燕咏</span>
            <a href="mailto:yanyongz@ustc.edu.cn" class="text-sm text-gray-500 hover:text-ustc transition-colors break-all mt-1">yanyongz@ustc.edu.cn</a>
          </div>
        </div>
        
        <!-- Teacher 2 -->
        <div class="flex items-start gap-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-lg bg-white dark:bg-blue-900/40 flex items-center justify-center text-ustc dark:text-blue-400 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
            <i class="fa-solid fa-chalkboard-user fa-lg"></i>
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-lg text-gray-900 dark:text-gray-100">张午阳</span>
            <a href="mailto:wuyangz@ustc.edu.cn" class="text-sm text-gray-500 hover:text-ustc transition-colors break-all mt-1">wuyangz@ustc.edu.cn</a>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 助教 & 其他 (Secondary) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
      
      <!-- TAs (Takes 2/3 width) -->
      <div class="lg:col-span-2">
        <h4 class="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">助教</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- TA 1 -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <div class="w-9 h-9 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-gray-400 shadow-sm shrink-0">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-sm text-gray-700 dark:text-gray-300">刘嘉政</span>
              <a href="mailto:liujiazheng25@mail.ustc.edu.cn" class="text-xs text-gray-400 hover:text-ustc break-all">liujiazheng25@mail.ustc.edu.cn</a>
            </div>
          </div>
          
          <!-- TA 2 -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <div class="w-9 h-9 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-gray-400 shadow-sm shrink-0">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-sm text-gray-700 dark:text-gray-300">龙凯雪</span>
              <a href="mailto:kaixue@mail.ustc.edu.cn" class="text-xs text-gray-400 hover:text-ustc break-all">kaixue@mail.ustc.edu.cn</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Others (Takes 1/3 width) -->
      <div>
        <h4 class="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">其他</h4>
        <ul class="space-y-3 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-lg">
          <li class="relative flex items-center gap-3 text-sm group cursor-pointer">
            <i class="fa-brands fa-weixin text-green-600 group-hover:text-green-700 transition-colors text-lg shrink-0"></i>
            <span class="font-medium text-gray-700 dark:text-gray-300 truncate">机器学习系统2026春...</span>
            <span class="text-[10px] text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wide ml-auto shrink-0">Group</span>
            
            <!-- QR Code Tooltip -->
            <div class="absolute bottom-full right-0 mb-2 w-48 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <img src="/wx.png" alt="WeChat QR" class="w-full h-auto rounded-lg" />
              <div class="text-xs text-center text-gray-500 mt-2 font-medium">机器学习系统2026春课程讨论</div>
            </div>
          </li>
          <li class="flex items-center gap-3 text-sm text-gray-500">
            <i class="fa-solid fa-upload w-4 text-center"></i>
            <span>作业提交：
              <a href="https://yjs1.ustc.edu.cn/" target="_blank" class="text-ustc hover:underline">
                https://yjs1.ustc.edu.cn/
              </a>
            </span>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>
