import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { expect, it, vi } from 'vitest'

import { server } from '../test/server'

import { SignInForm } from './-sign-in-form'

const endpoint = '/api/v1/applicant-sessions'
const href = '/applications/real-id/identity-and-address'
const success = (destination = href) =>
  HttpResponse.json(
    {
      data: {
        type: 'applicant-sessions',
        id: 'b9ac53c6-7526-40eb-a637-bb18ecf434af',
        attributes: { href: destination },
      },
    },
    { status: 201 },
  )
function setup() {
  const onSuccess = vi.fn()
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { mutations: { retry: 2, retryDelay: 0 } },
        })
      }
    >
      <SignInForm onSuccess={onSuccess} returnTo="/applications/current" />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onSuccess }
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Email address'),
    'applicant@example.com',
  )
  await user.type(screen.getByLabelText('Password'), 'Secure!1 ')
}
const submit = () => screen.getByRole('button', { name: 'Sign in' })
it('validates and focuses required fields repeatedly without a request', async () => {
  const request = vi.fn(() => success())
  server.use(http.post(endpoint, request))
  const { user, onSuccess } = setup()
  await user.click(submit())
  expect(screen.getByLabelText('Email address')).toHaveFocus()
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
    'Enter your password.',
  )
  await user.click(submit())
  expect(screen.getByLabelText('Email address')).toHaveFocus()
  expect(request).not.toHaveBeenCalled()
  expect(onSuccess).not.toHaveBeenCalled()
  expect((await axe(document.body)).violations).toEqual([])
})
it('sends exact credentials and follows the API journey instead of returnTo', async () => {
  server.use(
    http.post(endpoint, async ({ request }) => {
      expect(request.credentials).toBe('same-origin')
      expect(request.headers.get('Content-Type')).toBe(
        'application/vnd.api+json',
      )
      expect(request.headers.get('Accept')).toBe('application/vnd.api+json')
      expect(await request.json()).toEqual({
        data: {
          type: 'applicant-sessions',
          attributes: { email: 'applicant@example.com', password: 'Secure!1 ' },
        },
      })
      return success()
    }),
  )
  const { user, onSuccess } = setup()
  await fill(user)
  await user.click(submit())
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(href))
  expect(screen.getByLabelText('Password')).toHaveValue('')
})
it.each([
  [401, 'Invalid email or password'],
  [400, 'Check your email and password'],
  [429, '30 seconds'],
  [500, 'could not sign you in'],
  [406, 'could not sign you in'],
  [415, 'could not sign you in'],
])('handles %s without retries and retains email', async (status, message) => {
  const request = vi.fn(
    () =>
      new HttpResponse('not JSON', {
        status,
        headers: { 'Retry-After': '30' },
      }),
  )
  server.use(http.post(endpoint, request))
  const { user, onSuccess } = setup()
  await fill(user)
  await user.click(submit())
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByRole('alert').parentElement).toHaveFocus()
  expect(screen.getByLabelText('Email address')).toHaveValue(
    'applicant@example.com',
  )
  expect(request).toHaveBeenCalledTimes(1)
  expect(onSuccess).not.toHaveBeenCalled()
})
it.each([
  'https://evil.example',
  '//evil.example',
  '/applications/../../reviewer',
  '/applications/..\\../reviewer',
])('rejects unsafe success destination %s', async (destination) => {
  server.use(http.post(endpoint, () => success(destination)))
  const { user, onSuccess } = setup()
  await fill(user)
  await user.click(submit())
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not sign you in',
  )
  expect(onSuccess).not.toHaveBeenCalled()
})
it.each([null, {}, { data: { type: 'wrong' } }])(
  'rejects malformed success %#',
  async (body) => {
    server.use(
      http.post(endpoint, () => HttpResponse.json(body, { status: 201 })),
    )
    const { user, onSuccess } = setup()
    await fill(user)
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not sign you in',
    )
    expect(onSuccess).not.toHaveBeenCalled()
  },
)
it('announces pending outside busy form, prevents duplicates, and recovers after network failure', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const request = vi.fn(async () => {
    await held
    return HttpResponse.error()
  })
  server.use(http.post(endpoint, request))
  const { user, onSuccess } = setup()
  await fill(user)
  await user.click(submit())
  try {
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    const progress = screen.getByRole('status', { name: 'Sign-in progress' })
    expect(progress).toHaveTextContent('Signing in. Please wait.')
    expect(progress.closest('[aria-busy="true"]')).toBeNull()
    fireEvent.submit(document.querySelector('form')!)
    fireEvent.submit(document.querySelector('form')!)
    expect(request).toHaveBeenCalledTimes(1)
  } finally {
    release()
  }
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Check your connection',
  )
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  server.use(http.post(endpoint, () => success()))
  await user.click(submit())
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(href))
})
it('maps field errors and allows correction', async () => {
  server.use(
    http.post(endpoint, () =>
      HttpResponse.json(
        {
          errors: [
            {
              detail: 'Check this email.',
              source: { pointer: '/data/attributes/email' },
            },
          ],
        },
        { status: 400 },
      ),
    ),
  )
  const { user } = setup()
  await fill(user)
  await user.click(submit())
  await waitFor(() =>
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Check this email.',
    ),
  )
  expect(screen.getByLabelText('Email address')).toHaveFocus()
  await user.type(screen.getByLabelText('Email address'), 'x')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('keeps focus while correcting validation errors with the keyboard', async () => {
  const { user } = setup()
  await user.click(submit())
  await user.keyboard('applicant@example.com')
  expect(screen.getByLabelText('Email address')).toHaveValue(
    'applicant@example.com',
  )
  expect(screen.getByLabelText('Email address')).toHaveFocus()
  await user.tab()
  expect(screen.getByLabelText('Password')).toHaveFocus()
  await user.keyboard('Secure!1')
  expect(screen.getByLabelText('Password')).toHaveValue('Secure!1')
})

it('removes prior applicant data before navigating after login', async () => {
  const client = new QueryClient()
  client.setQueryData(['applicant', 'previous-id', 'form'], {
    name: 'Previous applicant',
  })
  const onSuccess = vi.fn(() => {
    expect(
      client.getQueryData(['applicant', 'previous-id', 'form']),
    ).toBeUndefined()
  })
  server.use(http.post(endpoint, () => success()))
  render(
    <QueryClientProvider client={client}>
      <SignInForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await fill(user)
  await user.click(submit())
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(href))
})
