import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'goqbot',
  description: 'QQ 官方机器人 ↔ OneBot V11 适配器',
  base: '/gd-goqbot-docs/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/gd-goqbot-docs/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#00add8' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'goqbot',
    outline: { label: '本页目录', level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/huilongxiji/gd-goqbot-framework' },
    ],
    editLink: {
      pattern: 'https://github.com/huilongxiji/gd-goqbot-docs/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    lastUpdated: { text: '最后更新' },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    footer: {
      message: '以 GNU AGPL-3.0 开源',
      copyright: 'Copyright © goqbot',
    },

    nav: [
      { text: '指南', link: '/guide/intro' },
      { text: 'API', link: '/api/overview' },
      { text: '协议', link: '/protocol/events' },
      { text: 'GitHub', link: 'https://github.com/huilongxiji/gd-goqbot-framework' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '什么是 goqbot', link: '/guide/intro' },
            { text: '快速开始', link: '/guide/start' },
            { text: '配置说明', link: '/guide/config' },
            { text: '连接协议', link: '/guide/connect' },
            { text: 'NoneBot 接入', link: '/guide/nonebot' },
            { text: '已知限制', link: '/guide/limits' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'OneBot 动作',
          items: [
            { text: '动作总览', link: '/api/overview' },
            { text: '基础信息', link: '/api/basic' },
            { text: '发送消息', link: '/api/send' },
            { text: '消息管理', link: '/api/message' },
            { text: '群聊管理', link: '/api/group' },
            { text: '菜单与指令面板', link: '/api/menu' },
          ],
        },
      ],
      '/protocol/': [
        {
          text: '协议细节',
          items: [
            { text: '消息段', link: '/protocol/segments' },
            { text: '入站事件', link: '/protocol/events' },
            { text: '消息发送机制', link: '/protocol/send-mechanism' },
          ],
        },
      ],
    },
  },
})
