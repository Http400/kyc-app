import { z } from 'zod'

export interface LoginValues {
  email: string
  password: string
}
export type LoginErrors = Partial<Record<keyof LoginValues, string>>

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = 'Enter a valid email address.'
  if (!values.password.trim()) errors.password = 'Enter your password.'
  return errors
}

export class LoginFailure extends Error {
  constructor(
    message: string,
    readonly fields: LoginErrors = {},
  ) {
    super(message)
  }
}

// Parse URLs before checking the path so dot segments cannot escape the journey.
function isLoginDestination(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || /[\\\s]/.test(href))
    return false
  const url = new URL(href, 'https://kyc.invalid')
  return (
    url.origin === 'https://kyc.invalid' &&
    url.pathname.startsWith('/applications/')
  )
}
const session = z.object({
  data: z.object({
    type: z.literal('applicant-sessions'),
    id: z.uuid(),
    attributes: z.object({ href: z.string().refine(isLoginDestination) }),
  }),
})
const errorDocument = z.object({
  errors: z.array(
    z.object({
      detail: z.string().optional(),
      source: z.object({ pointer: z.string().optional() }).optional(),
    }),
  ),
})
const genericFailure = 'We could not sign you in. Please try again.'

export async function loginApplicant(values: LoginValues): Promise<string> {
  let response: Response
  try {
    response = await fetch('/api/v1/applicant-sessions', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: { type: 'applicant-sessions', attributes: values },
      }),
    })
  } catch {
    throw new LoginFailure(
      'We could not reach the server. Check your connection and try again.',
    )
  }
  if (response.status === 401)
    throw new LoginFailure('Invalid email or password. Please try again.')
  if (response.status === 429) {
    const delay = response.headers.get('Retry-After')
    throw new LoginFailure(
      delay &&
        /^\d+$/.test(delay) &&
        Number.isSafeInteger(Number(delay)) &&
        Number(delay) > 0
        ? `Too many attempts. Try again in ${delay} seconds.`
        : 'Too many attempts. Please try again later.',
    )
  }
  if (response.status === 201) {
    const result = session.safeParse(await response.json().catch(() => null))
    if (result.success) return result.data.data.attributes.href
    throw new LoginFailure(genericFailure)
  }
  if (response.status === 400) {
    const result = errorDocument.safeParse(
      await response.json().catch(() => null),
    )
    const fields: LoginErrors = {}
    if (result.success)
      for (const error of result.data.errors) {
        let field: keyof LoginValues | undefined
        if (error.source?.pointer === '/data/attributes/email') field = 'email'
        if (error.source?.pointer === '/data/attributes/password')
          field = 'password'
        if (field && error.detail?.trim())
          fields[field] = [fields[field], error.detail]
            .filter(Boolean)
            .join(' ')
      }
    throw new LoginFailure(
      'Check your email and password and try again.',
      fields,
    )
  }
  throw new LoginFailure(genericFailure)
}
