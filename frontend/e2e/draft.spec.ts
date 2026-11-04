import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) {
  test(`saves answers and evidence and resumes after logout at ${width}px`, async ({
    page,
    context,
  }) => {
    const email = `draft-${width}-${Date.now()}@example.com`
    await context.request.post('/api/v1/applicant-accounts', {
      headers: { 'Content-Type': 'application/vnd.api+json' },
      data: {
        data: {
          type: 'applicant-accounts',
          attributes: { email, password: 'Secure!1' },
        },
      },
    })
    await page.setViewportSize({ width, height: 900 })
    async function login() {
      await page.goto('/sign-in')
      await page.getByLabel('Email address').fill(email)
      await page.getByLabel('Password').fill('Secure!1')
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    }
    await login()
    await page.getByRole('button', { name: 'Start application' }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL(/personal-details$/)
    await expect(
      page.getByLabel('Name (required)', { exact: true }),
    ).toBeFocused()
    await expect(
      page.getByLabel('Name (required)', { exact: true }),
    ).toHaveAttribute('autocomplete', 'name')
    await page
      .getByLabel('Name (required)', { exact: true })
      .fill('Ada Lovelace')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status')).toContainText(
      'Your progress was saved',
    )
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/sign-in$/)
    await login()
    await expect(
      page.getByLabel('Name (required)', { exact: true }),
    ).toHaveValue('Ada Lovelace')
    const personal = {
      'Date of birth': '1980-01-02',
      Country: 'Poland',
      Nationality: 'Polish',
      Email: email,
      Phone: '123456789',
    }
    for (const [label, value] of Object.entries(personal))
      await page.getByLabel(`${label} (required)`, { exact: true }).fill(value)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL(/personal-details$/)
    await expect(page.getByRole('checkbox')).toBeFocused()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    const identity = {
      'Document type': 'Passport',
      'Document number': 'AB123',
      'Document country': 'Poland',
      Expiry: '2030-01-02',
      Street: 'Main Street',
      City: 'Warsaw',
      'Postal code': '00-001',
      'Residential country': 'Poland',
    }
    for (const [label, value] of Object.entries(identity))
      await page.getByLabel(`${label} (required)`, { exact: true }).fill(value)
    await page.getByRole('button', { name: 'Save and review' }).click()
    await expect(page).toHaveURL(/identity-and-address$/)
    await expect(page.getByLabel('Document evidence (JPG')).toBeFocused()
    if (width === 320)
      await page.route('**/document-evidence', (route) =>
        route.fulfill({ status: 503 }),
      )
    await page.getByLabel('Document evidence (JPG').setInputFiles({
      name: 'evidence.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK3sAAAAASUVORK5CYII=',
        'base64',
      ),
    })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    if (width === 320) {
      await expect(page.getByRole('alert')).toContainText('request failed')
      await expect(page.getByText('Your answers were saved, but')).toBeVisible()
      await expect(
        page.getByLabel('Street (required)', { exact: true }),
      ).toHaveValue('Main Street')
      await page.unroute('**/document-evidence')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    }
    await expect(page.getByRole('status')).toContainText(
      'Your progress was saved',
    )
    await expect(page.getByText('Document evidence is saved.')).toBeVisible()
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/sign-in$/)
    await login()
    for (const [label, value] of Object.entries(identity))
      await expect(
        page.getByLabel(`${label} (required)`, { exact: true }),
      ).toHaveValue(value)
    await expect(page.getByText('Document evidence is saved.')).toBeVisible()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    for (const [label, value] of Object.entries(personal))
      await expect(
        page.getByLabel(`${label} (required)`, { exact: true }),
      ).toHaveValue(value)
    await expect(page.getByRole('checkbox')).toBeChecked()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page
      .getByLabel('Name (required)', { exact: true })
      .fill('Unsaved name')
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page).toHaveURL(/sign-in$/)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })
}
