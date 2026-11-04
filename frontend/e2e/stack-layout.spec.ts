import { expect, test } from '@playwright/test'

test('application form lays out actions without forwarding style props to the DOM', async ({
  page,
}) => {
  const reactWarnings: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('justifyContent')
    ) {
      reactWarnings.push(message.text())
    }
  })

  const id = 'b9ac53c6-7526-40eb-a637-bb18ecf434af'
  await page.route(`**/api/v1/applicant-applications/${id}/form`, (route) =>
    route.fulfill({
      json: {
        data: {
          type: 'applicant-application-forms',
          id,
          attributes: {
            status: 'draft',
            currentStep: 'personal-details',
            answers: {},
            documentEvidence: { present: false },
            version: 0,
          },
        },
      },
    }),
  )
  await page.goto(`/applications/${id}/personal-details`)

  const actions = page
    .getByRole('button', { name: 'Continue' })
    .locator('xpath=..')
  await expect(actions).toHaveCSS('justify-content', 'space-between')
  expect(reactWarnings).toEqual([])
})
