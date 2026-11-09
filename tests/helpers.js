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

export async function tracePagerToggle(page) {
  return page.evaluate(async () => {
    const pager = document.querySelector('.VPDocFooter .next')
    const measure = () => {
      const { left, right, width } = pager.getBoundingClientRect()
      return { left, right, width }
    }
    const before = measure()
    document.querySelector('.vp-sidebar-toggle').click()
    const immediate = measure()
    const frames = [immediate]
    await new Promise((resolve) => {
      function sample() {
        frames.push(measure())
        if (document.documentElement.classList.contains('vp-sidebar-transitioning')) {
          requestAnimationFrame(sample)
        }
        else {
          resolve()
        }
      }
      requestAnimationFrame(sample)
    })
    const after = frames.at(-1)
    return {
      before,
      immediate,
      after,
      rightDrift: Math.max(...frames.map(frame => Math.abs(frame.right - before.right))),
      hasIntermediateWidth: frames.some(frame => frame.width > Math.min(before.width, after.width) + 1
        && frame.width < Math.max(before.width, after.width) - 1),
    }
  })
}

// Seed each new document before application code runs.
export async function seedSidebarPreference(page, value) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, value)
  }, { key: SIDEBAR_STORAGE_KEY, value })
}

export async function readSidebarPreference(page) {
  return page.evaluate(key => localStorage.getItem(key), SIDEBAR_STORAGE_KEY)
}

export async function writeSidebarPreference(page, value) {
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value)
  }, { key: SIDEBAR_STORAGE_KEY, value })
}

export async function blockSidebarReadsOnLoad(page) {
  await page.addInitScript((sidebarKey) => {
    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      if (key === sidebarKey) {
        throw new DOMException('Storage blocked', 'SecurityError')
      }
      return getItem.call(this, key)
    }
  }, SIDEBAR_STORAGE_KEY)
}

export async function blockStorageWrites(page) {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    }
  })
}

export async function blockStorageAccess(page) {
  await page.evaluate(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Storage blocked', 'SecurityError') },
    })
  })
}

export async function blockSidebarWrites(page) {
  await page.evaluate((sidebarKey) => {
    const setItem = Storage.prototype.setItem
    window.failSidebarWrites = true
    Storage.prototype.setItem = function (key, value) {
      if (window.failSidebarWrites && key === sidebarKey) {
        throw new DOMException('Storage full', 'QuotaExceededError')
      }
      return setItem.call(this, key, value)
    }
  }, SIDEBAR_STORAGE_KEY)

  return async function restoreSidebarWrites() {
    await page.evaluate(() => {
      window.failSidebarWrites = false
    })
  }
}

export async function trackContentObservers(page) {
  await page.addInitScript(() => {
    const NativeMutationObserver = window.MutationObserver
    const targetsByObserver = new Map()
    let callbacks = 0

    window.MutationObserver = class extends NativeMutationObserver {
      constructor(callback) {
        super((mutations, observer) => {
          if (targetsByObserver.has(observer)) {
            callbacks++
          }
          callback(mutations, observer)
        })
      }

      observe(target, options) {
        super.observe(target, options)
        if (target instanceof Element && target.matches('.VPContent')) {
          if (!targetsByObserver.has(this)) {
            targetsByObserver.set(this, new Set())
          }
          targetsByObserver.get(this).add(target)
        }
      }

      disconnect() {
        super.disconnect()
        targetsByObserver.delete(this)
      }
    }

    window.contentObserverStats = () => ({
      activeTargets: [...targetsByObserver.values()].reduce((count, targets) => count + targets.size, 0),
      callbacks,
    })
  })

  return () => page.evaluate(() => window.contentObserverStats())
}

export async function readDocumentLayout(page) {
  return page.evaluate(() => {
    function measure(selector) {
      const element = document.querySelector(selector)
      if (!element) {
        return null
      }
      const style = getComputedStyle(element)
      return {
        width: element.getBoundingClientRect().width,
        maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
      }
    }

    return {
      outerContent: measure('.VPContent'),
      docContainer: measure('.VPDoc > .container'),
      docColumn: measure('.VPDoc > .container > .content'),
      readingColumn: measure('.VPDoc .content-container'),
      localNav: measure('.VPLocalNav'),
    }
  })
}
