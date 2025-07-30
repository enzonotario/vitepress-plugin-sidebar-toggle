# Getting Started

This guide will help you install and configure VitePress Plugin Sidebar Toggle for your documentation site.

## Prerequisites

Before installing VitePress Plugin Sidebar Toggle, you need to have:

- A VitePress project set up
- Node.js and npm/yarn/pnpm/bun installed

If you don't have a VitePress project yet, follow the [VitePress installation guide](https://vitepress.dev/guide/getting-started) to create one.

## Installation

1. Install the plugin using your preferred package manager:

:::: code-group

```bash [npm]
npm install vitepress-plugin-sidebar-toggle
```

```bash [yarn]
yarn add vitepress-plugin-sidebar-toggle
```

```bash [pnpm]
pnpm add vitepress-plugin-sidebar-toggle
```

```bash [bun]
bun add vitepress-plugin-sidebar-toggle
```

::::

## Basic Configuration

2. Add the plugin to your VitePress theme configuration file:

:::: code-group

```js [.vitepress/theme/index.js]
import DefaultTheme from 'vitepress/theme'
import { useSidebarToggle } from 'vitepress-plugin-sidebar-toggle'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    useSidebarToggle({
      app: ctx.app,
      router: ctx.router,
    })
  },
}
```

```ts [.vitepress/theme/index.ts]
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { useSidebarToggle } from 'vitepress-plugin-sidebar-toggle'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    useSidebarToggle({
      app: ctx.app,
      router: ctx.router,
    })
  },
} satisfies Theme
```

::::

That's it! Your VitePress site now has a sidebar toggle button that allows users to hide or show the sidebar.

## How It Works

The plugin adds a toggle button to your VitePress site that allows users to hide or show the sidebar. When the sidebar is hidden, the content area expands to use the full width of the page.

The plugin also remembers the user's preference using localStorage, so the sidebar state will be preserved when the user navigates between pages or returns to the site later.

## Customization

The plugin uses CSS variables from your VitePress theme for styling, so it should blend in with your site's design automatically. If you want to customize the appearance of the toggle button, you can override the CSS variables in your own stylesheet.

## Next Steps

Now that you have installed and configured VitePress Plugin Sidebar Toggle, you can:

- Check out the [Example](/example/page-with-sidebar) page to see the plugin in action
- Explore other VitePress plugins and themes to enhance your documentation site
