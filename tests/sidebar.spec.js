import { expect, test } from '@playwright/test'
import {
  openSidebar,
  updateContent,
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
