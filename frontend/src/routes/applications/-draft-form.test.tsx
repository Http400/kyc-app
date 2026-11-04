import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { expect, it } from 'vitest'

import { server } from '../../test/server'

import { DraftPage } from './-draft-form'

const id = 'b9ac53c6-7526-40eb-a637-bb18ecf434af'
const path = `/api/v1/applicant-applications/${id}/form`
const response = (
  answers = { name: 'Ada', consentConfirmed: false },
  version = 1,
) =>
  HttpResponse.json({
    data: {
      type: 'applicant-application-forms',
      id,
      attributes: {
        status: 'draft',
        currentStep: 'personal-details',
        answers,
        documentEvidence: { present: false },
        version,
      },
    },
  })
function setup() {
  server.use(http.get(path, () => response()))
  const router = createMemoryRouter([
    { path: '/', element: <DraftPage id={id} step="personal-details" /> },
  ])
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
it('preserves edits on failed save and only announces success after retry', async () => {
  server.use(http.patch(path, () => new HttpResponse(null, { status: 503 })))
  const user = setup()
  const name = await screen.findByLabelText('Name (required)')
  await user.clear(name)
  await user.type(name, 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('request failed')
  expect(name).toHaveValue('Grace')
  expect(screen.getByRole('status')).not.toHaveTextContent('was saved')
  server.use(
    http.patch(path, () =>
      response({ name: 'Grace', consentConfirmed: false }, 2),
    ),
  )
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('was saved'),
  )
  await user.type(name, ' Hopper')
  expect(screen.getByRole('status')).not.toHaveTextContent('was saved')
})
it('retains conflicting edits until explicit reload confirmation', async () => {
  server.use(http.patch(path, () => new HttpResponse(null, { status: 409 })))
  const user = setup()
  const name = await screen.findByLabelText('Name (required)')
  await user.type(name, ' edited')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.click(
    await screen.findByRole('button', { name: 'Reload saved form' }),
  )
  await user.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(name).toHaveValue('Ada edited')
  await user.click(screen.getByRole('button', { name: 'Reload saved form' }))
  await user.click(screen.getByRole('button', { name: 'Discard changes' }))
  await waitFor(() => expect(name).toHaveValue('Ada'))
})
it.each([401, 422])(
  'keeps entered answers when the API returns %s',
  async (status) => {
    server.use(http.patch(path, () => new HttpResponse(null, { status })))
    const user = setup()
    const name = await screen.findByLabelText('Name (required)')
    await user.type(name, ' changed')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(name).toHaveValue('Ada changed')
    expect(screen.getByRole('status')).not.toHaveTextContent('was saved')
    if (status === 401)
      expect(
        screen.getByRole('link', { name: 'Sign in again' }),
      ).toHaveAttribute('href', '/sign-in')
  },
)
it('prevents duplicate requests and exposes pending outside the busy form', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let calls = 0
  server.use(
    http.patch(path, async () => {
      calls++
      await held
      return response()
    }),
  )
  const user = setup()
  await screen.findByLabelText('Name (required)')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  try {
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('status').closest('[aria-busy="true"]')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(calls).toBe(1)
  } finally {
    release()
  }
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('was saved'),
  )
})
