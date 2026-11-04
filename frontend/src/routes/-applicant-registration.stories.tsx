import { useState } from 'react'

import {
  ApplicantRegistration,
  type ApplicantRegistrationProps,
} from './-applicant-registration'
import '../styles.css'

import type { Meta, StoryObj } from '@storybook/react-vite'

function InteractiveRegistration(args: ApplicantRegistrationProps) {
  const [values, setValues] = useState(args.values)
  return (
    <ApplicantRegistration
      {...args}
      values={values}
      onChange={(field, value) =>
        setValues((previous) => ({ ...previous, [field]: value }))
      }
    />
  )
}
const meta = {
  title: 'Applicant/Registration',
  component: ApplicantRegistration,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    values: { email: '', password: '', confirmation: '' },
    errors: {},
    state: 'idle',
    signInHref: '/sign-in',
    onSubmit: () => {},
    onChange: () => {},
  },
  render: (args) => <InteractiveRegistration {...args} />,
} satisfies Meta<typeof ApplicantRegistration>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Filled: Story = {
  args: {
    values: {
      email: 'applicant@example.com',
      password: 'Example!',
      confirmation: 'Example!',
    },
  },
}
export const FieldErrors: Story = {
  args: {
    errors: {
      email: 'Enter a valid email address.',
      password:
        'Use at least six characters, including one uppercase letter and one special character.',
      confirmation: 'Passwords must match.',
    },
  },
}
export const Submitting: Story = { args: { ...Filled.args, state: 'pending' } }
export const DuplicateEmail: Story = {
  args: {
    ...Filled.args,
    errors: { email: 'This email address is already registered.' },
    message: 'Sign in or use a different email.',
  },
}
export const RateLimited: Story = {
  args: { message: 'Too many attempts. Try again in 30 seconds.' },
}
export const NetworkFailure: Story = {
  args: {
    message:
      'We could not reach the server. Check your connection and try again.',
  },
}
export const UnexpectedFailure: Story = {
  args: { message: 'We could not create your account. Please try again.' },
}
export const Success: Story = { args: { state: 'success' } }
