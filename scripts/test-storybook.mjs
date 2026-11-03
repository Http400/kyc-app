// Browser regression coverage for Storybook development previews. Run on Node 26.
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

import { chromium, expect } from '@playwright/test'

const children = []
function start(args) {
  const child = spawn('npm', args, {
    detached: true,
    stdio: 'inherit',
  })
  children.push(child)
  return child
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${url}`)
    if (
      await fetch(url)
        .then((r) => r.ok)
        .catch(() => false)
    )
      return
    await delay(500)
  }
  throw new Error(`Server did not start: ${url}`)
}

let browser
try {
  const stories = start([
    'run',
    'storybook',
    '--workspace',
    '@kyc/ui',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    '16006',
    '--ci',
    '--no-open',
  ])
  await ready('http://127.0.0.1:16006/index.json', stories)
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    console.error('Browser page error:', error.message)
  })
  const index = await fetch('http://127.0.0.1:16006/index.json').then((r) =>
    r.json(),
  )
  const entries = Object.values(index.entries).filter((e) => e.type === 'story')
  expect(entries.length).toBe(15)
  const firstOnly = process.argv.includes('--first-story')
  for (const entry of firstOnly ? entries.slice(0, 1) : entries) {
    console.log('Checking story:', entry.id)
    await page.goto(
      `http://127.0.0.1:16006/iframe.html?id=${entry.id}&viewMode=story`,
    )
    await expect(page.locator('#storybook-root')).not.toBeEmpty()
    await expect(page.locator('.sb-errordisplay')).not.toBeVisible()
  }
  if (!firstOnly) {
    const docsEntries = Object.values(index.entries).filter(
      (e) => e.type === 'docs',
    )
    expect(docsEntries.map((entry) => entry.id)).toContain(
      'design-system-components--docs',
    )
    for (const entry of docsEntries) {
      console.log('Checking docs:', entry.id)
      await page.goto(
        `http://127.0.0.1:16006/iframe.html?id=${entry.id}&viewMode=docs`,
      )
      await expect(page.locator('#storybook-docs')).not.toBeEmpty()
      await expect(page.locator('.sb-errordisplay')).not.toBeVisible()
    }
    await page.goto(
      'http://127.0.0.1:16006/?path=/docs/design-system-components--docs',
    )
    const docsFrame = page.frameLocator('#storybook-preview-iframe')
    await expect(
      docsFrame.getByRole('heading', { name: 'Components', exact: true }),
    ).toBeVisible()
    await expect(
      docsFrame.getByRole('button', { name: 'Continue', exact: true }).first(),
    ).toBeVisible()

    await page.goto(
      'http://127.0.0.1:16006/?path=/story/design-system-components--button-primary',
    )
    await expect(
      page
        .frameLocator('#storybook-preview-iframe')
        .getByRole('button', { name: 'Continue', exact: true }),
    ).toBeVisible()
    await page.goto(
      'http://127.0.0.1:16006/iframe.html?id=design-system-components--select&viewMode=story',
    )
    await page
      .getByRole('button', { name: 'Submitted Status', exact: true })
      .click()
    await page.getByRole('option', { name: 'Approved', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Approved Status', exact: true }),
    ).toBeVisible()
  }
  expect(errors).toEqual([])
  console.log(
    firstOnly
      ? 'PASS first Storybook preview; no page errors'
      : 'PASS Storybook: 15 local previews, Docs pages and manager iframe, interactive select; no page errors',
  )
} finally {
  await browser?.close()
  for (const child of children) {
    if (child.exitCode === null && child.pid)
      process.kill(-child.pid, 'SIGTERM')
  }
}
