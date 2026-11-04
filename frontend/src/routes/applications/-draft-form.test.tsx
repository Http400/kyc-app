import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { server } from '../../test/server'

import * as api from './-draft-api'
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
afterEach(() => vi.restoreAllMocks())

function setup(step: api.Step = 'personal-details') {
  server.use(http.get(path, () => response()))
  const router = createMemoryRouter([
    { path: '/', element: <DraftPage id={id} step={step} /> },
    { path: '/sign-in', element: <h1>Signed out</h1> },
    { path: '/applications/:id/:step', element: <h1>Next step</h1> },
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
it('allows canceling logout before revoking the session', async () => {
  let calls = 0
  server.use(
    http.delete('/api/v1/applicant-sessions/current', () => {
      calls++
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = setup()
  await user.type(await screen.findByLabelText('Name (required)'), ' edited')
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  await user.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(calls).toBe(0)
  expect(screen.getByLabelText('Name (required)')).toHaveValue('Ada edited')
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
    expect(screen.getByRole('button', { name: 'Log out' })).toBeDisabled()
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

it('refreshes after an uploaded document without overwriting concurrent answers', async () => {
  const initial: api.Draft = {
    status: 'draft',
    currentStep: 'identity-and-address',
    answers: { street: 'Original' },
    documentEvidence: { present: false },
    version: 1,
  }
  vi.spyOn(api, 'loadDraft')
    .mockResolvedValueOnce(initial)
    .mockRejectedValueOnce(new Error('Refresh failed'))
    .mockRejectedValueOnce(new Error('Still unavailable'))
    .mockResolvedValueOnce({
      ...initial,
      answers: { street: 'Other tab edit' },
      documentEvidence: { present: true },
      version: 4,
    })
  const upload = vi.spyOn(api, 'uploadEvidence').mockResolvedValue(undefined)
  const save = vi
    .spyOn(api, 'saveDraft')
    .mockResolvedValue({ ...initial, version: 2 })
  const user = setup('identity-and-address')
  const street = await screen.findByLabelText('Street (required)')
  await user.upload(
    screen.getByLabelText('Document evidence (JPG or PNG, up to 10 MiB)'),
    new File(['png'], 'id.png', { type: 'image/png' }),
  )
  await user.click(screen.getByRole('button', { name: /^Save$/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Refresh failed')
  expect(street).toHaveValue('Original')
  expect(street).toBeDisabled()
  expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Save and review' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Retry refresh' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Still unavailable',
  )
  expect(street).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Retry refresh' }))
  await waitFor(() => expect(street).toHaveValue('Other tab edit'))
  expect(street).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Review it before continuing',
  )
  expect(screen.queryByText('Next step')).not.toBeInTheDocument()
  expect(save).toHaveBeenCalledTimes(1)
  expect(upload).toHaveBeenCalledTimes(1)
})

it('leaves after a single dirty-logout confirmation', async () => {
  const logout = vi.spyOn(api, 'logoutApplicant').mockResolvedValue(undefined)
  const user = setup()
  await user.type(await screen.findByLabelText('Name (required)'), ' edited')
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  await user.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(
    await screen.findByRole('heading', { name: 'Signed out' }),
  ).toBeVisible()
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(logout).toHaveBeenCalledTimes(1)
})

it('preserves edits and navigation protection after logout failure and allows retry', async () => {
  vi.spyOn(api, 'logoutApplicant')
    .mockRejectedValueOnce(new Error('Logout failed'))
    .mockResolvedValueOnce(undefined)
  const user = setup()
  const name = await screen.findByLabelText('Name (required)')
  await user.type(name, ' edited')
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  await user.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Logout failed')
  expect(name).toHaveValue('Ada edited')
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(await screen.findByRole('alertdialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Keep editing' }))
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  await user.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(
    await screen.findByRole('heading', { name: 'Signed out' }),
  ).toBeVisible()
})

it('blocks incomplete navigation while allowing partial Save', async () => {
  const save = vi.spyOn(api, 'saveDraft').mockResolvedValue({
    status: 'draft',
    currentStep: 'personal-details',
    answers: { name: 'Ada' },
    documentEvidence: { present: false },
    version: 2,
  })
  const user = setup()
  await screen.findByLabelText('Name (required)')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(save).not.toHaveBeenCalled()
  expect(screen.queryByText('Next step')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^Save$/ }))
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
})
