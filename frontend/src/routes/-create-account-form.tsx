import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import {
  ApplicantRegistration,
  type RegistrationErrors,
  type RegistrationValues,
} from './-applicant-registration'
import {
  registerApplicant,
  RegistrationFailure,
  validateRegistration,
} from './-registration'
import { accountAccessHref } from './-return-target'

export interface CreateAccountFormProps {
  returnTo?: string
}
const emptyValues: RegistrationValues = {
  email: '',
  password: '',
  confirmation: '',
}
export function CreateAccountForm({ returnTo }: CreateAccountFormProps) {
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [message, setMessage] = useState<string>()
  const [feedbackVersion, setFeedbackVersion] = useState(0)
  const submitted = useRef(false)
  const pending = useRef(false)
  const mutation = useMutation({ mutationFn: registerApplicant, retry: false })
  async function submit() {
    if (pending.current || mutation.isSuccess) return
    submitted.current = true
    const validation = validateRegistration(values)
    setErrors(validation)
    setMessage(undefined)
    if (Object.keys(validation).length) {
      setFeedbackVersion((version) => version + 1)
      return
    }
    pending.current = true
    try {
      await mutation.mutateAsync(values)
      setValues(emptyValues)
    } catch (error) {
      setErrors(error instanceof RegistrationFailure ? error.fields : {})
      setMessage(
        error instanceof RegistrationFailure
          ? error.message
          : 'We could not create your account. Please try again.',
      )
    } finally {
      pending.current = false
      setFeedbackVersion((version) => version + 1)
    }
  }
  let state: 'idle' | 'pending' | 'success' = 'idle'
  if (mutation.isPending) state = 'pending'
  if (mutation.isSuccess) state = 'success'
  return (
    <ApplicantRegistration
      values={values}
      errors={errors}
      message={message}
      feedbackVersion={feedbackVersion}
      state={state}
      signInHref={accountAccessHref('/sign-in', returnTo)}
      onSubmit={() => {
        void submit()
      }}
      onChange={(field, value) => {
        const next = { ...values, [field]: value }
        setValues(next)
        setMessage(undefined)
        if (submitted.current) {
          const validation = validateRegistration(next)
          setErrors((previous) => {
            const updated = { ...previous }
            delete updated[field]
            if (validation[field]) updated[field] = validation[field]
            if (field === 'password') {
              delete updated.confirmation
              if (validation.confirmation)
                updated.confirmation = validation.confirmation
            }
            return updated
          })
        }
      }}
    />
  )
}
