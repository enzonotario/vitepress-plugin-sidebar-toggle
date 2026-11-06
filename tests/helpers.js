import { expect } from '@playwright/test'

export const sidebarPage = '/example/page-with-sidebar'
const SIDEBAR_STORAGE_KEY = 'vp-sidebar-hidden'

// Invoke the real VitePress callbacks without changing the DOM between updates.
export async function updateContent(page) {
  await page.evaluate(async () => {
    // Include Vite's version query to reuse the module already loaded by the app.
    const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname.endsWith('/vitepress/dist/client/app/utils.js'))
    if (!resource) {
      throw new Error('VitePress client utilities were not loaded')
    }
    const { contentUpdatedCallbacks } = await import(resource.name)
    if (!contentUpdatedCallbacks.length) {
      throw new Error('VitePress content callbacks were not loaded')
    }
    contentUpdatedCallbacks.forEach(callback => callback())
  })
}

export async function openSidebar(page, hidden = false) {
  await seedSidebarPreference(page, hidden ? '1' : '0')
  await page.goto(sidebarPage)
  await expect(page.locator('.vp-sidebar-toggle')).toBeVisible()
}

// Seed each new document before application code runs.
export async function seedSidebarPreference(page, value) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, value)
  }, { key: SIDEBAR_STORAGE_KEY, value })
}
