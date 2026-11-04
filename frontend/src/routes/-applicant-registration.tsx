import {
  Alert,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@kyc/ui'
import { useEffect, useRef } from 'react'

import styles from './account-access.module.css'

export interface RegistrationValues {
  email: string
  password: string
  confirmation: string
}
export type RegistrationErrors = Partial<
  Record<keyof RegistrationValues, string>
>
export interface ApplicantRegistrationProps {
  values: RegistrationValues
  errors: RegistrationErrors
  message?: string
  state: 'idle' | 'pending' | 'success'
  signInHref: string
  feedbackVersion?: number
  onChange: (field: keyof RegistrationValues, value: string) => void
  onSubmit: () => void
}
export const passwordGuidance =
  'Use at least six characters, including one uppercase letter and one special character.'

export function ApplicantRegistration({
  values,
  errors,
  message,
  state,
  signInHref,
  feedbackVersion = 0,
  onChange,
  onSubmit,
}: ApplicantRegistrationProps) {
  const form = useRef<HTMLDivElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (feedbackVersion || state === 'success') {
      const invalid = form.current?.querySelector<HTMLInputElement>(
        'input[aria-invalid="true"]',
      )
      if (invalid) invalid.focus()
      else feedback.current?.focus()
    }
  }, [feedbackVersion, state])
  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          {state === 'success' ? (
            <Stack spacing={3}>
              <Typography component="h1" variant="heading">
                Account created
              </Typography>
              <div ref={feedback} tabIndex={-1}>
                <Alert severity="success">
                  Your account has been created. Sign in to begin your KYC
                  application.
                </Alert>
              </div>
              <Link href={signInHref}>Sign in</Link>
            </Stack>
          ) : (
            <div ref={form}>
              <Stack
                component="form"
                className={styles.form}
                spacing={3}
                aria-busy={state === 'pending'}
                onSubmit={(event) => {
                  event.preventDefault()
                  if (state !== 'pending') onSubmit()
                }}
              >
                <Stack spacing={1}>
                  <Typography component="h1" variant="heading">
                    Create your account
                  </Typography>
                  <Typography tone="muted">
                    Create credentials to begin your KYC application.
                  </Typography>
                </Stack>
                {(Boolean(message) || Object.keys(errors).length > 0) && (
                  <div ref={feedback} tabIndex={-1}>
                    <Alert severity="error">
                      {message ?? 'Check the highlighted fields.'}
                    </Alert>
                  </div>
                )}
                {(['email', 'password', 'confirmation'] as const).map(
                  (field) => (
                    <TextField
                      key={field}
                      label={
                        {
                          email: 'Email address',
                          password: 'Password',
                          confirmation: 'Confirm password',
                        }[field]
                      }
                      name={field}
                      type={field === 'email' ? 'email' : 'password'}
                      autoComplete={
                        field === 'email' ? 'email' : 'new-password'
                      }
                      value={values[field]}
                      onChange={(event) => onChange(field, event.target.value)}
                      error={Boolean(errors[field])}
                      helperText={
                        errors[field] ??
                        (field === 'password' ? passwordGuidance : undefined)
                      }
                      required
                      disabled={state === 'pending'}
                      fullWidth
                    />
                  ),
                )}
                <Button
                  className={styles.submit}
                  type="submit"
                  fullWidth
                  size="large"
                  isDisabled={state === 'pending'}
                >
                  {state === 'pending' ? 'Creating account…' : 'Create account'}
                </Button>
                {state === 'pending' && (
                  <Alert>Creating your account. Please wait.</Alert>
                )}
                <Typography
                  className={styles.footer}
                  align="center"
                  variant="caption"
                >
                  Already have an account?{' '}
                  <Link href={signInHref}>Sign in</Link>
                </Typography>
              </Stack>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
