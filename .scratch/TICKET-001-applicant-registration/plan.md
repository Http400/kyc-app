# TICKET-001 implementation plan

Source: [Applicant registration](../../tickets/TICKET-001-frontend-registration.md).

1. Build ApplicantRegistration in frontend with controlled values, errors, state and callbacks. Reuse DS controls; new reusable controls belong in DS with their own stories. Cover complete registration states in Storybook.
2. Connect validation and JSON:API registration, field and request errors, pending protection and explicit success without sign-in.
3. Verify component accessibility, MSW integration, backend browser flow, quality and builds. Keep original ticket and backend unchanged. No commits without request.
