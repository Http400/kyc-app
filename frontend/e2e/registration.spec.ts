import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'mobile', width: 320, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`Applicant registers using the keyboard and receives duplicate-email feedback on ${viewport.name}`, async ({
    page,
    context,
  }, testInfo) => {
    const email = `registration-${viewport.name}-${Date.now()}@example.com`
    const sessionRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/applicant-sessions'))
        sessionRequests.push(request.url())
    })
    await page.setViewportSize(viewport)
    await page.goto('/create-account?returnTo=%2Fapplications%2Fcurrent')
    await expect(
      page.getByRole('heading', { name: 'Create your account' }),
    ).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath('registration-empty.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByLabel('Email address')).toBeFocused()
    await expect(page.getByLabel('Email address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    )
    await expect(
      page.getByLabel('Confirm password'),
    ).toHaveAccessibleDescription('Confirm your password.')
    await page.screenshot({
      path: testInfo.outputPath('registration-errors.png'),
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.keyboard.type(email)
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
    await page.keyboard.type('Secure!1')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Confirm password')).toBeFocused()
    await page.keyboard.type('Secure!1')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Create account' }),
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Account created' }),
    ).toBeVisible()
    await expect(page.getByRole('status').locator('..')).toBeFocused()
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
    expect(
      (await context.cookies()).some((cookie) =>
        cookie.name.includes('KYCSESSION'),
      ),
    ).toBe(false)
    expect(sessionRequests).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath('registration-success.png'),
      fullPage: true,
    })
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(
      /\/sign-in\?returnTo=%2Fapplications%2Fcurrent/,
    )
    await page.goto('/create-account')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('Secure!1')
    await page.getByLabel('Confirm password').fill('Secure!1')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('alert')).toContainText('already exists')
    await expect(page.getByLabel('Email address')).toHaveValue(email)
    await expect(page.getByLabel('Email address')).toBeFocused()
  })
}

test('pending registration exposes busy state and recovers from throttling', async ({
  page,
}, testInfo) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/applicant-accounts', async (route) => {
    await held
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '30' },
      contentType: 'application/vnd.api+json',
      body: JSON.stringify({
        errors: [
          {
            status: '429',
            code: 'rate-limited',
            title: 'Too many requests',
            detail: 'Try again later.',
          },
        ],
      }),
    })
  })
  await page.goto('/create-account')
  await page.getByLabel('Email address').fill('pending@example.com')
  await page.getByLabel('Password', { exact: true }).fill('Secure!1')
  await page.getByLabel('Confirm password').fill('Secure!1')
  await page.getByRole('button', { name: 'Create account' }).click()
  try {
    await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByRole('button', { name: 'Creating account…' }),
    ).toBeDisabled()
    await expect(page.getByRole('status')).toHaveText(
      'Creating your account. Please wait.',
    )
    await page.screenshot({
      path: testInfo.outputPath('registration-pending.png'),
      fullPage: true,
    })
  } finally {
    release()
  }
  await expect(page.getByRole('alert')).toContainText('30 seconds')
  await expect(page.getByRole('alert').locator('..')).toBeFocused()
  await expect(page.locator('form')).toHaveAttribute('aria-busy', 'false')
  await expect(
    page.getByRole('button', { name: 'Create account' }),
  ).toBeEnabled()
  await expect(page.getByLabel('Email address')).toHaveValue(
    'pending@example.com',
  )
})
