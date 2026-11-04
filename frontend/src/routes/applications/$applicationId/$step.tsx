import { Button, Card, CardContent, Stack, Typography } from '@kyc/ui'
import { useNavigate } from 'react-router'

import { DraftPage } from '../-draft-form'
import styles from '../../application-step.module.css'

import type { Route } from './+types/$step'
export default function CurrentApplicationStepPage({
  params,
}: Route.ComponentProps) {
  const navigate = useNavigate()
  if (params.step === 'review') {
    return (
      <main className={styles.reviewPage}>
        <Card className={styles.reviewCard}>
          <CardContent>
            <Stack spacing={2}>
              <Typography component="h1" variant="heading">
                Review application
              </Typography>
              <Typography>Your application is ready for review.</Typography>
              <label>
                <input type="checkbox" /> I confirm the information is complete
                and accurate.
              </label>
              <Button
                onClick={() =>
                  void navigate(
                    `/applications/${params.applicationId}/submitted`,
                  )
                }
              >
                Submit
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  void navigate(
                    `/applications/${params.applicationId}/identity-and-address`,
                  )
                }
              >
                Return to form
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (
    params.step !== 'personal-details' &&
    params.step !== 'identity-and-address'
  )
    throw new Response('Not found', { status: 404 })
  return (
    <DraftPage
      key={`${params.applicationId}/${params.step}`}
      id={params.applicationId}
      step={params.step}
    />
  )
}
