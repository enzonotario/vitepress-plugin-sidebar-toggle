import DefaultTheme from 'vitepress/theme'
import { useSidebarToggle } from '../../../src/index.js'
import 'uno.css'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    useSidebarToggle({
      app: ctx.app,
      router: ctx.router,
    })
  },
}
