# GitRekt 💀

> **Commit fast, or get roasted.**

GitRekt is an extreme accountability tool for developers. It monitors your GitHub repositories and "motivates" you to ship code by threatening to roast you publicly on social media or delete your repository if you miss your deadlines.

## 🔥 Features

- **AI Roasting**: Uses Gemini AI to generate brutal roasts of your commit messages and code diffs.
- **Social Shaming**: Automatically posts your failures to **LinkedIn** and **X (Twitter)** if you don't fix your mistakes or ship on time.
- **Commit Revert**: Can automatically revert your bad commits to a previous safe state.
- **YOLO Mode**: For the truly unhinged—deletes your entire repository if you fail.
- **Neo-Brutalist UI**: A raw, high-contrast design that screams urgency.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS v4
- **Database**: SQLite (via Prisma ORM)
- **Auth**: NextAuth.js (GitHub, X, LinkedIn)
- **AI**: Google Gemini Pro
- **Job Scheduling**: Custom local node-cron runner

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- An ngrok account (required for local development to handle webhooks and OAuth callbacks)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Tim-Cooked/gitrekt.git
cd gitrekt
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory and add the following variables:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
AUTH_SECRET="your_random_generated_secret" # user `npx auth secret` to generate
NEXT_PUBLIC_APP_URL="http://localhost:3000" # or your ngrok URL

# OAuth Providers
AUTH_GITHUB_ID="your_github_client_id"
AUTH_GITHUB_SECRET="your_github_client_secret"

AUTH_TWITTER_ID="your_twitter_client_id"
AUTH_TWITTER_SECRET="your_twitter_client_secret"

LINKEDIN_CLIENT_ID="your_linkedin_client_id"
LINKEDIN_CLIENT_SECRET="your_linkedin_client_secret"

# AI
GEMINI_API_KEY="your_google_gemini_api_key"

# Cron Job Security
CRON_SECRET="your_custom_cron_secret"
```

### 3. Database Setup

Initialize the SQLite database:

```bash
npx prisma db push
```

### 4. Running Locally

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 5. Running the Cron Job ⏰

GitRekt relies on a background worker to check for expired deadlines and execute punishments. In a separate terminal window, run:

```bash
npm run cron
```

This starts the local scheduler defined in `scripts/local-cron.ts`.

### 6. Ngrok Tunneling (Critical)

Since GitHub webhooks and OAuth callbacks need to reach your localhost, you must use a tunnel like ngrok.

1.  Start ngrok:
    ```bash
    ngrok http 3000
    ```
2.  Update your OAuth applications (GitHub, X, LinkedIn) to use the ngrok URL for callbacks (e.g., `https://your-ngrok-url.ngrok-free.app/api/auth/callback/twitter`).
3.  Update `NEXT_PUBLIC_APP_URL` in `.env.local` to match your ngrok URL.

## 🛡️ OAuth Configuration

- **GitHub**: Homepage `http://localhost:3000` (or ngrok), Callback `.../api/auth/callback/github`
- **Twitter (X)**: Callback `.../api/auth/callback/twitter`. Ensure you enable "Confidential Client" and proper scopes (`tweet.read`, `tweet.write`, `users.read`, `offline.access`).
- **LinkedIn**: Callback `.../api/auth/callback/linkedin`. Scopes `openid`, `profile`, `email`, `w_member_social`.

## ⚠️ Disclaimer

**YOLO Mode allows this application to DELETE your GitHub repositories.** Use this feature at your own risk. The developers are not responsible for lost code, broken careers, or bruised egos.

## 📄 License

MIT
