import { expect, test } from '@playwright/test'
import {
  blockSidebarReadsOnLoad,
  blockSidebarWrites,
  blockStorageAccess,
  blockStorageWrites,
  openSidebar,
  readDocumentLayout,
  readSidebarPreference,
  seedSidebarPreference,
  sidebarPage,
  tracePagerToggle,
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

test('saved hidden preference leaves a page without a sidebar unchanged on reload', async ({ page }) => {
  await page.goto('/example/page-without-sidebar')
  await expect(page.locator('html')).toHaveClass(/has-sidebar-toggle/)
  const defaultLayout = await readDocumentLayout(page)

  await writeSidebarPreference(page, '1')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/has-sidebar-toggle/)
  await expect(page.locator('.VPSidebar')).toHaveCount(0)
  await expect(page.locator('.vp-sidebar-toggle')).toHaveCount(0)
  expect(await readSidebarPreference(page)).toBe('1')
  expect(await readDocumentLayout(page)).toEqual(defaultLayout)
})

test('navigation to a page without a sidebar restores its layout and retains the preference', async ({ page }) => {
  await page.goto('/example/page-without-sidebar')
  await expect(page.locator('html')).toHaveClass(/has-sidebar-toggle/)
  const defaultLayout = await readDocumentLayout(page)

  await page.locator('.VPDocFooter').getByRole('link', { name: 'Previous page Page with Sidebar' }).click()
  const button = page.locator('.vp-sidebar-toggle')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await page.locator('.VPDocFooter').getByRole('link', { name: 'Next page Page without Sidebar' }).click()
  await expect(page.locator('h1')).toContainText('Page without Sidebar')
  await expect(page.locator('.VPSidebar')).toHaveCount(0)
  await expect(button).toHaveCount(0)
  expect(await readSidebarPreference(page)).toBe('1')
  expect(await readDocumentLayout(page)).toEqual(defaultLayout)

  await page.locator('.VPDocFooter').getByRole('link', { name: 'Previous page Page with Sidebar' }).click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.VPSidebar')).toHaveCSS('display', 'none')
  await expect(page.locator('.VPContent')).not.toHaveClass(/has-sidebar/)
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

test('header placement follows the title in visual and keyboard order', async ({ page }) => {
  await openSidebar(page)
  const button = page.locator('.vp-sidebar-toggle')
  await expect(page.locator('.VPNavBar .content-body > :first-child')).toHaveClass('vp-sidebar-toggle')
  await expect(button).toHaveCSS('position', 'static')
  await page.locator('.VPNavBarTitle .title').focus()
  await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
})

test('header toggle leaves a gap beside the sidebar', async ({ page }) => {
  await openSidebar(page)
  const gap = await page.locator('.vp-sidebar-toggle').evaluate((button) => {
    const sidebar = document.querySelector('.VPSidebar')
    return button.getBoundingClientRect().left - sidebar.getBoundingClientRect().right
  })
  expect(gap).toBeCloseTo(12)
})

test('header sidebar classes remain under VitePress control', async ({ page }) => {
  await openSidebar(page)
  await page.locator('.vp-sidebar-toggle').click()
  await expect(page.locator('.VPNavBar')).toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPNavBarTitle')).toHaveClass(/has-sidebar/)
  await updateContent(page)
  await expect(page.locator('.VPNavBar')).toHaveClass(/has-sidebar/)
  await expect(page.locator('.VPNavBarTitle')).toHaveClass(/has-sidebar/)
})

test('toggle is prepended to content when the header is absent', async ({ page }) => {
  await openSidebar(page)
  await page.evaluate(() => {
    document.querySelector('.vp-sidebar-toggle').remove()
    document.querySelector('.VPNavBar').remove()
  })
  await updateContent(page)
  await expect(page.locator('.VPContent > :first-child')).toHaveClass('vp-sidebar-toggle')
  await expect(page.locator('.vp-sidebar-toggle')).toBeVisible()
})

test('hidden desktop sidebar releases document width and keyboard navigation', async ({ page }) => {
  await openSidebar(page)
  const content = page.locator('.VPDoc .content-container')
  const visibleWidth = await content.evaluate(element => element.getBoundingClientRect().width)
  await page.locator('.vp-sidebar-toggle').click()
  await expect(page.locator('.VPSidebar')).toHaveCSS('display', 'none')
  await expect(page.locator('.VPDoc > .container > .content')).toHaveCSS('max-width', 'none')
  await expect(page.locator('.VPDoc > .container')).toHaveCSS('max-width', '1376px')
  await expect(page.locator('html')).not.toHaveClass(/vp-sidebar-transitioning/)
  const widths = await content.evaluate((element) => {
    const column = element.parentElement
    const style = getComputedStyle(column)
    return {
      actual: element.getBoundingClientRect().width,
      available: column.getBoundingClientRect().width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
    }
  })
  expect(widths.actual).toBeCloseTo(widths.available)
  expect(widths.actual).toBeGreaterThan(visibleWidth)
  await page.locator('.vp-sidebar-toggle').focus()
  await page.locator('.VPSidebar a').first().evaluate(element => element.focus())
  await expect(page.locator('.vp-sidebar-toggle')).toBeFocused()
  await page.locator('.vp-sidebar-toggle').click()
  await expect(page.locator('.VPSidebar')).toBeVisible()
  await expect(content).toHaveCSS('max-width', '688px')
})

test('pager resizes smoothly and keeps its right edge when toggling', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openSidebar(page)

  const hiding = await tracePagerToggle(page)
  expect(hiding.immediate).toEqual(hiding.before)
  expect(hiding.after.width).toBeGreaterThan(hiding.before.width)
  expect(hiding.rightDrift).toBeLessThan(1)
  expect(hiding.hasIntermediateWidth).toBe(true)

  const showing = await tracePagerToggle(page)
  expect(showing.immediate).toEqual(showing.before)
  expect(showing.after.width).toBeLessThan(showing.before.width)
  expect(showing.rightDrift).toBeLessThan(1)
  expect(showing.hasIntermediateWidth).toBe(true)
  expect(showing.after.width).toBeCloseTo(hiding.before.width, 0)
  expect(showing.after.right).toBeCloseTo(hiding.before.right, 0)
})

test('saved desktop preference leaves mobile navigation and layout usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedSidebarPreference(page, '1')
  await page.goto(sidebarPage)
  await expect(page.locator('html')).toHaveClass(/vp-sidebar-hidden/)
  await expect(page.locator('.vp-sidebar-toggle')).toBeHidden()
  await expect(page.locator('.VPLocalNav')).toHaveCSS('padding-left', '0px')
  await page.locator('.VPLocalNav .menu').click()
  const sidebar = page.locator('.VPSidebar')
  await expect(sidebar).toHaveClass(/open/)
  await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await expect(sidebar).toBeInViewport()
  await sidebar.getByRole('link', { name: 'Getting Started' }).click()
  await expect(page).toHaveURL(/\/guide\/getting-started(?:\.html)?$/)
  await expect(sidebar).not.toHaveClass(/open/)
})
