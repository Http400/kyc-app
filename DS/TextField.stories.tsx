import { TextField } from './Primitives'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Design System/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: { label: 'Email address', type: 'email', autoComplete: 'email' },
} satisfies Meta<typeof TextField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Required: Story = {
  args: {
    required: true,
    helperText: 'Use the email address for your account.',
  },
}
export const Invalid: Story = {
  args: { error: true, helperText: 'Enter a valid email address.' },
}
export const Disabled: Story = {
  args: { disabled: true, value: 'applicant@example.com' },
}
export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    helperText:
      'Use at least six characters, including one uppercase letter and one special character.',
  },
}
