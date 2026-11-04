import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { expect, it } from 'vitest'

import { TextField } from './Primitives'

it('connects required fields and errors to the input for assistive technology', async () => {
  const { container } = render(
    <TextField
      label="Email"
      required
      error
      helperText="Enter a valid email."
    />,
  )
  const input = screen.getByLabelText('Email')
  expect(input).toBeRequired()
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Enter a valid email.')
  await userEvent.setup().tab()
  expect(input).toHaveFocus()
  expect((await axe(container)).violations).toEqual([])
})
