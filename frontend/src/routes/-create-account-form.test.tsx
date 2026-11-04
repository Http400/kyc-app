import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../test/server'

import { CreateAccountForm } from './-create-account-form'

const endpoint = '/api/v1/applicant-accounts'
function setup() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { mutations: { retry: 2, retryDelay: 0 } },
        })
      }
    >
      <CreateAccountForm returnTo="/applications/current" />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('Email address'),
    'applicant@example.com',
  )
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'Secure!1',
  )
  await user.type(screen.getByLabelText('Confirm password'), 'Secure!1')
}
describe('Applicant registration', () => {
  it('validates all fields, associates errors, and focuses the first invalid field on repeated submits', async () => {
    const request = vi.fn(() => new HttpResponse(null, { status: 201 }))
    server.use(http.post(endpoint, request))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByLabelText('Email address')).toHaveFocus()
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    )
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Confirm your password.')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByLabelText('Email address')).toHaveFocus()
    expect((await axe(document.body)).violations).toEqual([])
    expect(request).not.toHaveBeenCalled()
  })
  it('sends only contract attributes and handles empty success without signing in', async () => {
    server.use(
      http.post(endpoint, async ({ request }) => {
        expect(request.headers.get('Content-Type')).toBe(
          'application/vnd.api+json',
        )
        expect(request.headers.get('Accept')).toBe('application/vnd.api+json')
        expect(await request.json()).toEqual({
          data: {
            type: 'applicant-accounts',
            attributes: {
              email: 'applicant@example.com',
              password: 'Secure!1',
            },
          },
        })
        return new HttpResponse(null, { status: 201 })
      }),
    )
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByRole('heading', { name: 'Account created' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in?returnTo=%2Fapplications%2Fcurrent',
    )
    expect(
      screen.queryByLabelText('Password', { exact: true }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status').parentElement).toHaveFocus()
    expect((await axe(document.body)).violations).toEqual([])
  })
  it('maps multiple API field errors and allows correction and retry', async () => {
    const requests: unknown[] = []
    server.use(
      http.post(endpoint, async ({ request }) => {
        requests.push(await request.json())
        return requests.length === 1
          ? HttpResponse.json(
              {
                errors: [
                  {
                    detail: 'Email rejected.',
                    source: { pointer: '/data/attributes/email' },
                  },
                  {
                    detail: 'Password rejected.',
                    source: { pointer: '/data/attributes/password' },
                  },
                ],
              },
              { status: 400 },
            )
          : new HttpResponse(null, { status: 201 })
      }),
    )
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() =>
      expect(
        screen.getByLabelText('Email address'),
      ).toHaveAccessibleDescription('Email rejected.'),
    )
    expect(
      screen.getByLabelText('Password', { exact: true }),
    ).toHaveAccessibleDescription('Password rejected.')
    expect(screen.getByLabelText('Email address')).toHaveFocus()
    await user.clear(screen.getByLabelText('Email address'))
    await user.type(
      screen.getByLabelText('Email address'),
      'corrected@example.com',
    )
    expect(
      screen.getByLabelText('Password', { exact: true }),
    ).toHaveAccessibleDescription('Password rejected.')
    await user.clear(screen.getByLabelText('Password', { exact: true }))
    await user.type(
      screen.getByLabelText('Password', { exact: true }),
      'Updated!2',
    )
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Passwords must match.')
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'Updated!2')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByRole('heading', { name: 'Account created' }),
    ).toBeInTheDocument()
    expect(requests).toHaveLength(2)
    expect(requests[1]).toEqual({
      data: {
        type: 'applicant-accounts',
        attributes: { email: 'corrected@example.com', password: 'Updated!2' },
      },
    })
  })
  it('revalidates confirmation after changing password and blocks invalid requests', async () => {
    const request = vi.fn(() => new HttpResponse(null, { status: 201 }))
    server.use(http.post(endpoint, request))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await fill(user)
    await user.type(screen.getByLabelText('Password', { exact: true }), '2')
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Passwords must match.')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByLabelText('Confirm password')).toHaveFocus()
    expect(request).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Confirm password'), '2')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Account created' })
    expect(request).toHaveBeenCalledOnce()
  })
  it.each([
    [409, 'already exists'],
    [429, '30 seconds'],
    [500, 'could not create'],
    [400, 'could not create'],
    [406, 'could not create'],
    [415, 'could not create'],
  ])(
    'handles %s with useful feedback and preserves email',
    async (status, message) => {
      server.use(
        http.post(
          endpoint,
          () =>
            new HttpResponse('not json', {
              status,
              headers: { 'Retry-After': '30' },
            }),
        ),
      )
      const user = setup()
      await fill(user)
      await user.click(screen.getByRole('button', { name: 'Create account' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      if (status === 409)
        expect(screen.getByLabelText('Email address')).toHaveFocus()
      else expect(screen.getByRole('alert').parentElement).toHaveFocus()
      expect(screen.getByLabelText('Email address')).toHaveValue(
        'applicant@example.com',
      )
    },
  )
  it('reports network failure', async () => {
    const request = vi.fn(() => HttpResponse.error())
    server.use(http.post(endpoint, request))
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your connection',
    )
    expect(request).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert').parentElement).toHaveFocus()
  })
  it.each([undefined, 'invalid', '0', '-1', '1.5', '999999999999999999999999'])(
    'uses fallback throttling feedback for Retry-After %s without retrying',
    async (delay) => {
      const request = vi.fn(
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: delay === undefined ? {} : { 'Retry-After': delay },
          }),
      )
      server.use(http.post(endpoint, request))
      const user = setup()
      await fill(user)
      await user.click(screen.getByRole('button', { name: 'Create account' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Too many attempts. Please try again later.',
      )
      expect(request).toHaveBeenCalledOnce()
    },
  )
  it.each([
    null,
    {},
    { errors: 'invalid' },
    { errors: [null, 3, {}, { detail: 4 }] },
    {
      errors: [
        { detail: '   ', source: { pointer: '/data/attributes/email' } },
      ],
    },
  ])('handles malformed validation document %j', async (body) => {
    server.use(
      http.post(endpoint, () => HttpResponse.json(body, { status: 400 })),
    )
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not create your account. Please try again.',
    )
    expect(screen.getByRole('alert').parentElement).toHaveFocus()
  })
  it('retains multiple errors for a field and exposes document errors', async () => {
    server.use(
      http.post(endpoint, () =>
        HttpResponse.json(
          {
            errors: [
              {
                detail: 'Email rejected.',
                source: { pointer: '/data/attributes/email' },
              },
              {
                detail: 'Use another address.',
                source: { pointer: '/data/attributes/email' },
              },
              {
                detail: 'The request could not be processed.',
                source: { pointer: '/data/type' },
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const user = setup()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The request could not be processed.',
    )
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Email rejected. Use another address.',
    )
  })
  it('prevents duplicate requests while pending', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    server.use(
      http.post(endpoint, async () => {
        calls++
        await held
        return new HttpResponse(null, { status: 201 })
      }),
    )
    const user = setup()
    await fill(user)
    await user.dblClick(screen.getByRole('button', { name: 'Create account' }))
    expect(
      screen.getByRole('button', { name: 'Creating account…' }),
    ).toBeDisabled()
    await waitFor(() => expect(calls).toBe(1))
    release()
    await screen.findByRole('heading', { name: 'Account created' })
  })
})
