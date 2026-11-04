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
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { loginApplicant, LoginFailure, validateLogin } from './-login'
import { accountAccessHref } from './-return-target'
import styles from './account-access.module.css'

export interface SignInFormProps {
  onNavigate?: (href: string) => void
  returnTo?: string
  onSuccess: (href: string) => void
}

export function SignInForm({
  onNavigate,
  returnTo,
  onSuccess,
}: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [emailError, setEmailError] = useState<string>()
  const [passwordError, setPasswordError] = useState<string>()
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  const feedback = useRef<HTMLDivElement>(null)
  const pending = useRef(false)
  const focusedFeedback = useRef(0)
  const completed = useRef(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedbackVersion, setFeedbackVersion] = useState(0)
  const mutation = useMutation({ mutationFn: loginApplicant, retry: false })

  useEffect(() => {
    if (feedbackVersion === focusedFeedback.current) return
    focusedFeedback.current = feedbackVersion
    if (emailError) emailInput.current?.focus()
    else if (passwordError) passwordInput.current?.focus()
    else feedback.current?.focus()
  }, [feedbackVersion, emailError, passwordError])

  async function submit(): Promise<void> {
    if (pending.current || completed.current) return
    const validation = validateLogin({ email, password })
    setError(undefined)
    setEmailError(validation.email)
    setPasswordError(validation.password)
    if (Object.keys(validation).length) {
      setFeedbackVersion((version) => version + 1)
      return
    }
    pending.current = true
    try {
      const destination = await mutation.mutateAsync({ email, password })
      completed.current = true
      setIsComplete(true)
      setPassword('')
      mutation.reset()
      onSuccess(destination)
    } catch (cause) {
      setError(
        cause instanceof LoginFailure
          ? cause.message
          : 'We could not sign you in. Please try again.',
      )
      setEmailError(
        cause instanceof LoginFailure ? cause.fields.email : undefined,
      )
      setPasswordError(
        cause instanceof LoginFailure ? cause.fields.password : undefined,
      )
      setFeedbackVersion((version) => version + 1)
    } finally {
      pending.current = false
    }
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          <div
            className="sr-only"
            role="status"
            aria-label="Sign-in progress"
            aria-live="polite"
            aria-atomic="true"
          >
            {mutation.isPending ? 'Signing in. Please wait.' : ''}
          </div>
          <Stack
            component="form"
            aria-busy={mutation.isPending}
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
            spacing={3}
          >
            <Stack spacing={1}>
              <Typography component="h1" variant="heading">
                Welcome back
              </Typography>
              <Typography tone="muted">
                Sign in to continue your KYC application.
              </Typography>
            </Stack>
            {(error ?? emailError ?? passwordError) ? (
              <div ref={feedback} tabIndex={-1}>
                <Alert role="alert" severity="error">
                  {error ?? emailError ?? passwordError}
                </Alert>
              </div>
            ) : null}
            <TextField
              autoComplete="email"
              error={Boolean(emailError)}
              fullWidth
              helperText={emailError}
              id="applicant-email"
              inputRef={emailInput}
              label="Email address"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailError(undefined)
                setError(undefined)
              }}
              disabled={mutation.isPending}
              required
              type="email"
              value={email}
            />
            <TextField
              autoComplete="current-password"
              error={Boolean(passwordError)}
              fullWidth
              helperText={passwordError}
              id="applicant-password"
              inputRef={passwordInput}
              label="Password"
              name="password"
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError(undefined)
                setError(undefined)
              }}
              disabled={mutation.isPending}
              required
              type="password"
              value={password}
            />
            <Button
              className={styles.submit}
              fullWidth
              size="large"
              type="submit"
              isDisabled={mutation.isPending || isComplete}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography
              className={styles.footer}
              align="center"
              variant="caption"
            >
              <span>New to KYC? </span>
              <Link
                href={accountAccessHref('/create-account', returnTo)}
                onClick={(event) => {
                  if (onNavigate) {
                    event.preventDefault()
                    onNavigate(accountAccessHref('/create-account', returnTo))
                  }
                }}
              >
                Create account
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}
