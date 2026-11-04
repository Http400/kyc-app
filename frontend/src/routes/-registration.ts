import {
  passwordGuidance,
  type RegistrationErrors,
  type RegistrationValues,
} from './-applicant-registration'

export function validateRegistration(
  values: RegistrationValues,
): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = 'Enter a valid email address.'
  // Match the supplied backend policy, including Unicode uppercase letters and spaces as special characters.
  const characters = values.password.split('')
  if (
    values.password.length < 6 ||
    !characters.some((character) => /\p{Uppercase}/u.test(character)) ||
    !characters.some((character) => !/[\p{L}\p{Nd}]/u.test(character))
  )
    errors.password = passwordGuidance
  if (!values.confirmation) errors.confirmation = 'Confirm your password.'
  else if (values.confirmation !== values.password)
    errors.confirmation = 'Passwords must match.'
  return errors
}
export class RegistrationFailure extends Error {
  constructor(
    message: string,
    readonly fields: RegistrationErrors = {},
  ) {
    super(message)
  }
}
const genericFailure = 'We could not create your account. Please try again.'
export async function registerApplicant(
  values: RegistrationValues,
): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/v1/applicant-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'applicant-accounts',
          attributes: { email: values.email, password: values.password },
        },
      }),
    })
  } catch {
    throw new RegistrationFailure(
      'We could not reach the server. Check your connection and try again.',
    )
  }
  if (response.status === 201) return
  if (response.status === 409)
    throw new RegistrationFailure(
      'An account already exists for this email address. Sign in or use a different email.',
      { email: 'This email address is already registered.' },
    )
  if (response.status === 429) {
    const delay = response.headers.get('Retry-After')
    throw new RegistrationFailure(
      delay &&
        /^\d+$/.test(delay) &&
        Number.isSafeInteger(Number(delay)) &&
        Number(delay) > 0
        ? `Too many attempts. Try again in ${delay} seconds.`
        : 'Too many attempts. Please try again later.',
    )
  }
  if (response.status === 400) {
    const body: unknown = await response.json().catch(() => null)
    const fields: RegistrationErrors = {}
    const messages: string[] = []
    if (
      body &&
      typeof body === 'object' &&
      'errors' in body &&
      Array.isArray(body.errors)
    ) {
      for (const error of body.errors) {
        if (
          !error ||
          typeof error !== 'object' ||
          typeof error.detail !== 'string' ||
          !error.detail.trim()
        )
          continue
        const pointer: unknown = error.source?.pointer
        let field: 'email' | 'password' | undefined
        if (pointer === '/data/attributes/email') field = 'email'
        if (pointer === '/data/attributes/password') field = 'password'
        if (field)
          fields[field] = [fields[field], error.detail]
            .filter(Boolean)
            .join(' ')
        else messages.push(error.detail)
      }
    }
    throw new RegistrationFailure(
      messages.join(' ') ||
        (Object.keys(fields).length
          ? 'Check the highlighted fields.'
          : genericFailure),
      fields,
    )
  }
  throw new RegistrationFailure(genericFailure)
}
