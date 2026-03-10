<script setup>
import { withBase } from 'vitepress'

const schedule = [
  { 
    week: 1, 
    date: 'Mar 10', 
    topic: '第一章 概述', 
    lab: '', 
    video: false,
    pdf: '/slides/lec01.pdf'
  },
  { week: 2, date: 'Mar 17', topic: '第二章 机器学习与框架基础', video: false },
  { week: 3, date: 'Mar 24', topic: '第三章 GPU框架与CUDA编程', lab: '', video: true },
  { week: 4, date: 'Mar 31', topic: '第四章 Transformer和大语言模型', lab: 'Lab 1 Released (10%)', video: true },
  { week: 5, date: 'Apr 7', topic: '第五章 混合专家模型', lab: '', video: true },
  { week: 6, date: 'Apr 14', topic: '第六章 数据并行与模型并行', lab: '', video: true },
  { week: 7, date: 'Apr 21', topic: '第七章 模型剪枝', lab: '', video: true },
  { week: 8, date: 'Apr 28', topic: '第八章 模型量化', lab: '', video: true },
  { week: 9, date: 'May 5', topic: '第九章 机器学习图优化', lab: '', video: true },
  { week: 10, date: 'May 12', topic: '第十章 大语言模型部署', lab: '', video: true },
  { week: 11, date: 'May 19', topic: '第十一章 大模型后训练', lab: '', video: true },
  { week: 12, date: 'May 26', topic: '第十二章 客座讲座', lab: '', video: true },
  { week: 13, date: 'Jun 2', topic: '第十三章 课程项目展示与总结', lab: '', video: false },
  { week: 14, date: 'Jun 9', topic: '第十四章 课程项目展示与总结', lab: '', video: false },
]
</script>

<template>
  <div class="vp-table-container overflow-x-auto my-6 rounded-lg border border-[var(--vp-c-border)]">
    <table class="w-full text-left text-sm border-collapse">
      <thead>
        <tr>
          <th class="p-3 bg-gray-50 dark:bg-gray-800 font-semibold border-b border-[var(--vp-c-border)] w-24">Week</th>
          <th class="p-3 bg-gray-50 dark:bg-gray-800 font-semibold border-b border-[var(--vp-c-border)] w-32">Date</th>
          <th class="p-3 bg-gray-50 dark:bg-gray-800 font-semibold border-b border-[var(--vp-c-border)]">Topic</th>
          <th class="p-3 bg-gray-50 dark:bg-gray-800 font-semibold border-b border-[var(--vp-c-border)] w-40">Resources</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in schedule" :key="row.week" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-[var(--vp-c-border)] last:border-0">
          <td class="p-3 font-mono text-gray-500">Week {{ row.week }}</td>
          <td class="p-3">{{ row.date }}</td>
          <td class="p-3">
            <div class="font-medium">{{ row.topic }}</div>
            <div class="text-xs font-semibold text-ustc dark:text-blue-400 mt-1" v-if="row.lab">
              <i class="fa-solid fa-flask mr-1"></i>{{ row.lab }}
            </div>
          </td>
          <td class="p-3">
            <div class="flex gap-3">
              <!-- PDF Download Link -->
              <a v-if="row.pdf" :href="withBase(row.pdf)" target="_blank" class="text-gray-400 hover:text-ustc transition-colors" title="Download Slides">
                <i class="fa-solid fa-file-pdf fa-lg"></i>
              </a>
              <span v-else class="text-gray-200 cursor-not-allowed" title="Not available">
                <i class="fa-solid fa-file-pdf fa-lg"></i>
              </span>

              <!-- Video Link -->
              <a v-if="row.video" href="#" class="text-gray-400 hover:text-red-600 transition-colors" title="Watch Recording">
                <i class="fa-brands fa-youtube fa-lg"></i>
              </a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
