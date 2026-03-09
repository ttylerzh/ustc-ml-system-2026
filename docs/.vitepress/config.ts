import { defineConfig } from 'vitepress'
import markdownItKatex from 'markdown-it-katex'

export default defineConfig({
  title: 'USTC ML System 2026',
  description: 'Machine Learning System Course',
  base: '/ustc-ml-system-2026/',
  
  head: [
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css' }],
    ['link', { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
  ],

  themeConfig: {
    // logo: '/ustc-logo.svg', // Placeholder
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Labs', link: '/labs/' },
      { text: 'Resources', link: '/resources/' }
    ],
    
    sidebar: {
      '/': [
        {
          text: '课程概览',
          items: [
            { text: '首页', link: '/' },
            { 
              text: '实验 (Labs)', 
              link: '/labs/',
              items: [
                { text: 'Lab 1', link: '/labs/lab1' },
                { text: 'Lab 2', link: '/labs/lab2' },
                { text: 'Lab 3', link: '/labs/lab3' }
              ]
            }
          ]
        }
      ],
      '/labs/': [
        {
          text: '实验 (Labs)',
          items: [
            { text: 'Environment Setup', link: '/labs/setup' },
            { text: 'Lab 1', link: '/labs/lab1' },
            { text: 'Lab 2', link: '/labs/lab2' },
            { text: 'Lab 3', link: '/labs/lab3' }
          ]
        }
      ],
      '/lectures/': [
        {
          text: 'Lectures',
          items: [
            { text: 'Lec 01: Introduction', link: '/lectures/lec01-intro' }
          ]
        }
      ]
    },

    outline: {
      label: '目录',
      level: [2, 3]
    },

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ustc-ml-system-2026' }
    ],
    
    footer: {
      message: 'Released under CC BY-NC-SA 4.0 License.',
      copyright: 'Copyright © 2026 USTC AI School'
    }
  },

  markdown: {
    config: (md) => {
      md.use(markdownItKatex)
    }
  }
})
