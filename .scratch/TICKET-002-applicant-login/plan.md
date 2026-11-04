# Applicant login

Source: [TICKET-002](../../tickets/TICKET-002-frontend-login.md).

1. Separate validation and JSON:API login request from form behavior.
2. Add accessible validation, errors, pending feedback and synchronous duplicate protection. Navigate only to a validated API journey URL after 201; preserve browser-managed cookies.
3. Add component/API and browser tests including real authentication, keyboard and mobile behavior.
4. Run frontend tests, typecheck, build and repository quality checks. Keep originals read-only. Commit with the user-authorized message `feat(TICKET-002): implement applicant login`; do not push.
