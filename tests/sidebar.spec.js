import { expect, test } from '@playwright/test'
import {
  blockSidebarReadsOnLoad,
  blockSidebarWrites,
  blockStorageAccess,
  blockStorageWrites,
  openSidebar,
  readSidebarPreference,
  sidebarPage,
  updateContent,
  writeSidebarPreference,
} from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', route => route.abort())
})

test('repeated hidden content updates keep sidebar spacing removed', async ({ page }) => {
  await openSidebar(page, true)
  await updateContent(page)
  await expect(page.locator('.VPContent')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPLocalNav')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPDoc')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPFooter')).not.toHaveClass(/has-sidebar/)

  await updateContent(page)
  await expect(page.locator('.VPContent')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPLocalNav')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPDoc')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPFooter')).not.toHaveClass(/has-sidebar/)
  await expect(page.locator('.vp-sidebar-toggle')).toHaveCount(1)
  await page.locator('.vp-sidebar-toggle').click()
  await expect(page.locator('.VPContent')).toHaveClass(/has-sidebar/)
})

test('blocked storage reads still initialize a usable toggle', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await blockSidebarReadsOnLoad(page)
  await page.goto(sidebarPage)
  const button = page.locator('.vp-sidebar-toggle')
  await expect(button).toBeVisible()
  await button.click()
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await updateContent(page)
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await button.click()
  await expect(page.locator('html')).not.toHaveClass(/vp-sidebar-hidden/)
  expect(errors).toEqual([])
})

test('failed storage writes preserve the toggle and finish its transition', async ({ page }) => {
  await openSidebar(page)
  const errors = []
  const warnings = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning') {
      warnings.push(message.text())
    }
  })
  await blockStorageWrites(page)
  await page.locator('.vp-sidebar-toggle').click()
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await expect(page.locator('html')).not.toHaveClass(/vp-sidebar-transitioning/)
  await blockStorageAccess(page)
  await updateContent(page)
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  expect(errors).toEqual([])
  expect(warnings.some(message => message.includes('Unable to save'))).toBe(true)
})

test('failed writes keep the preference through navigation until a write succeeds', async ({ page }) => {
  await openSidebar(page)
  const restoreWrites = await blockSidebarWrites(page)

  const button = page.locator('.vp-sidebar-toggle')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(await readSidebarPreference(page)).toBe('0')
  await page.locator('.VPDocFooter .prev').click()
  await expect(page.locator('h1')).toContainText('Getting Started')
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await updateContent(page)
  await expect(button).toHaveAttribute('aria-expanded', 'false')

  await restoreWrites()
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(await readSidebarPreference(page)).toBe('0')
  await writeSidebarPreference(page, '1')
  await updateContent(page)
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await expect(button).toHaveAttribute('aria-expanded', 'false')
})

test('button exposes its expanded state across toggles, reloads and navigation', async ({ page }) => {
  await page.goto(sidebarPage)
  const button = page.locator('.vp-sidebar-toggle')
  await expect(button).toHaveAttribute('type', 'button')
  await expect(button).toHaveAttribute('aria-controls', 'VPSidebarNav')
  await expect(page.locator('#VPSidebarNav')).toHaveCount(1)
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(await readSidebarPreference(page)).toBe('1')
  await page.reload()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await page.locator('.VPDocFooter').getByRole('link', { name: 'Next page Page without Sidebar' }).click()
  await expect(button).toHaveCount(0)
  await page.goBack()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(await readSidebarPreference(page)).toBe('0')
})

test('keyboard focus has a visible outline and Space toggles the sidebar', async ({ page }) => {
  await openSidebar(page)
  const button = page.locator('.vp-sidebar-toggle')
  await page.keyboard.press('Tab')
  await button.focus()
  await expect(button).toBeFocused()
  await expect(button).toHaveCSS('outline-style', 'solid')
  await expect(button).toHaveCSS('outline-width', '2px')
  await expect(button).toHaveCSS('outline-offset', '2px')
  await page.keyboard.press('Space')
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
})
