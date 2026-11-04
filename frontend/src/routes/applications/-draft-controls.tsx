import { Alert } from '@kyc/ui'

import { DraftFailure } from './-draft-api'

export function Failure({ error }: { error: unknown }) {
  return (
    <>
      <Alert role="alert" severity="error">
        {error instanceof Error ? error.message : 'Please try again.'}
      </Alert>
      {error instanceof DraftFailure && [401, 403].includes(error.status) ? (
        <a href="/sign-in">Sign in again</a>
      ) : null}
    </>
  )
}
