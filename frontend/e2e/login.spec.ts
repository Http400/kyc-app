import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`Applicant signs in with cookies using the keyboard at ${width}px`, async ({
    page,
    context,
  }) => {
    const email = `login-${width}-${Date.now()}@example.com`
    const response = await context.request.post('/api/v1/applicant-accounts', {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      data: {
        data: {
          type: 'applicant-accounts',
          attributes: { email, password: 'Secure!1' },
        },
      },
    })
    expect(response.status()).toBe(201)
    await page.setViewportSize({ width, height: 900 })
    await page.goto(
      '/sign-in?returnTo=%2Fapplications%2Fignored%2Fpersonal-details',
    )
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByLabel('Email address')).toBeFocused()
    await page.keyboard.type(email)
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()
    await page.keyboard.type('Wrong!1')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toContainText(
      'Invalid email or password',
    )
    await expect(page.getByRole('alert').locator('..')).toBeFocused()
    await expect(page.getByLabel('Email address')).toHaveValue(email)
    await page.getByLabel('Password').fill('Secure!1')
    await page.getByLabel('Password').press('Tab')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/applications\/current$/)
    const cookies = await context.cookies()
    expect(
      cookies.find((cookie) => cookie.name === '__Host-KYCSESSION')?.httpOnly,
    ).toBe(true)
    expect(cookies.some((cookie) => cookie.name === 'XSRF-TOKEN')).toBe(true)
    const authenticatedStatus = await page.evaluate(
      async () =>
        (
          await fetch('/api/v1/applicant-applications/current', {
            headers: { Accept: 'application/vnd.api+json' },
          })
        ).status,
    )
    expect(authenticatedStatus).toBe(204)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}
