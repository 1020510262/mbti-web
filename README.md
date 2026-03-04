This is a Next.js MBTI web app with V2 payment + AI report flow.

## Getting Started

## Run

First, copy env template:

```bash
cp .env.example .env.local
```

Then run:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## V2 Docs

- Release/test/deploy playbook: `docs/v2-release-playbook.md`
- Env template for payment/model: `.env.example`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy

Use Vercel and configure environment variables before promoting to production.
