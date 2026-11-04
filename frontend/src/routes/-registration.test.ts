import { describe, expect, it } from 'vitest'

import { validateRegistration } from './-registration'

describe('contract validation', () => {
  it.each(['Abcd!1', 'Éabcd!', 'Abcde ', 'Abcde😀'])(
    'accepts backend-valid password %s',
    (password) => {
      expect(
        validateRegistration({
          email: 'a@example.com',
          password,
          confirmation: password,
        }),
      ).toEqual({})
    },
  )
  it.each(['Abc!1', 'abcdef!', 'Abcdef'])(
    'rejects policy violation %s',
    (password) => {
      expect(
        validateRegistration({
          email: 'a@example.com',
          password,
          confirmation: password,
        }),
      ).toHaveProperty('password')
    },
  )
  it('rejects mismatched confirmation and malformed email', () => {
    expect(
      validateRegistration({
        email: 'a@localhost',
        password: 'Abcde!',
        confirmation: 'Abcde! ',
      }),
    ).toEqual({
      email: 'Enter a valid email address.',
      confirmation: 'Passwords must match.',
    })
  })
})
