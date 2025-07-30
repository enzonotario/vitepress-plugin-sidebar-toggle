import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'

const gaId = process.env.GA_ID || 'G-TEST'

export default defineConfig({
  title: 'VitePress Plugin Sidebar Toggle',
  description: 'A plugin to add a toggle for hiding/showing the sidebar in VitePress',
  themeConfig: {
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Example',
        items: [
          { text: 'Page with Sidebar', link: '/example/page-with-sidebar' },
          { text: 'Page without Sidebar', link: '/example/page-without-sidebar' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/enzonotario/vitepress-plugin-sidebar-toggle' },
    ],
    footer: {
      message: 'Released under the <a href="https://github.com/enzonotario/vitepress-plugin-sidebar-toggle/blob/main/LICENSE">MIT License</a>.',
      copyright: 'Copyright © 2025-present <a href="https://enzonotario.me">Enzo Notario</a>',
    },
  },
  vite: {
    plugins: [
      UnoCSS(),
    ],
  },
  head: [
    // Google Analytics
    [
      'script',
      { async: '', src: `https://www.googletagmanager.com/gtag/js?id=${gaId}` },
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');`,
    ],

    // OG Tags
    ['meta', { property: 'og:title', content: 'VitePress Plugin Sidebar Toggle' }],
    ['meta', { property: 'og:description', content: 'A plugin to add a toggle for hiding/showing the sidebar in VitePress' }],
    ['meta', { property: 'og:url', content: 'https://vitepress-plugin-sidebar-toggle.vercel.app/' }],
    ['meta', { property: 'og:type', content: 'website' }],

    // Twitter Tags
    ['meta', { name: 'twitter:title', content: 'VitePress Plugin Sidebar Toggle' }],
    ['meta', { name: 'twitter:description', content: 'A plugin to add a toggle for hiding/showing the sidebar in VitePress' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
})
