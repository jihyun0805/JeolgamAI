This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Runtime Notes (JeolgamAI)

- App state is persisted to `.jeolgamai/state.json` (sessions, analyses, recommendations, logs).
- Auth is cookie-based (`jeolgamai_session`) through:
  - `GET /api/auth/login?role=company_admin|company_operator|system_admin&redirect=/dashboard`
  - `GET /api/auth/logout?redirect=/`
- Protected routes are enforced in `proxy.ts`.

### Mock-First Data Mode (Default)

By default, this frontend branch runs in mock/demo mode.

- `MOCK_DATA_MODE=true` (default): force mock data behavior across integration validation and architecture preview.
- `MOCK_DATA_MODE=false`: allow live connector validation if enabled.

### Optional Live Connector Validation

To run live external validation, set both env variables below:

```bash
MOCK_DATA_MODE=false
LIVE_CONNECTOR_VALIDATION=true
```

When enabled:
- AWS integration will run STS + service read checks (Cost Explorer, EC2, RDS, S3).
- Kubernetes integration will validate cluster API/nodes/namespaces/pods endpoints.
- Prometheus integration will execute required metric queries.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
