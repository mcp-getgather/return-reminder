# ReturnReminder

ReturnReminder is a web app that helps you track and never miss return deadlines for your online purchases from major retailers like Amazon, Wayfair, and Office Depot.

**Live Demo:** https://returnreminder.com/

## Features

- **Connect Shopping Accounts:** Securely connect your Amazon, Wayfair, and Office Depot accounts.
- **Automatic Import:** Instantly fetch your recent purchases and their return windows.
- **Unified Dashboard:** View all your return deadlines in one place.
- **Urgent Alerts:** Highlight items with return windows expiring soon.
- **Calendar Integration:** Add reminders to Google, Apple, Outlook, or download as ICS.
- **Privacy-Focused:** Credentials are used only for session and never stored.

## How It Works

1. **Connect Accounts:** Use the dashboard to connect your retailer accounts via a secure sign-in dialog.
2. **Import Purchases:** The app fetches your order history and return windows.
3. **Track Deadlines:** See all your return deadlines, with urgent items highlighted.
4. **Get Reminders:** Add reminders to your calendar or download all as an ICS file.

## Supported Retailers

- Amazon
- Wayfair
- Office Depot
- (TODO) Nordstrom

## Technical Overview

- **Frontend:** React (Vite), TypeScript, Tailwind CSS.
- **Backend:** Express.js, geolocation via MaxMind.
- **Data Model:** Purchases include brand, order date, products, return dates, etc.
- **Calendar Integration:** Add reminders to Google, Apple, Outlook, or download ICS.

## Configuration

Create a `.env` file in the project root with the following variables:

```env
GETGATHER_URL=http://localhost:8000
```

## Development

```bash
npm install
npm run dev
```

## Deployment (Fly.io)

### Prerequisites

1. Install the Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Sign up for a Fly.io account: https://fly.io/app/sign-up

### Deploy Steps

1. **Login to Fly.io**:

   ```bash
   fly auth login
   ```

2. **Create and deploy the app**:

   ```bash
   fly launch
   ```

   This will:
   - Create a new app on Fly.io
   - Use the existing `fly.toml` configuration
   - Build and deploy using the existing Dockerfile
   - Sometimes it will update app name

3. **Set up secrets**:

   ```bash
   cp .env.template .env
   # IMPORTANT, edit .env with your actual values
   fly secrets import < .env
   ```

4. **Deploy updates**:
   ```bash
   fly deploy
   ```

### Configuration

The `fly.toml` file contains the deployment configuration:

- **Memory**: 1GB RAM
- **Auto-scaling**: Starts/stops machines based on traffic
- **HTTPS**: Automatically enforced

### Monitoring

- **View logs**: `fly logs`
- **Check status**: `fly status`
- **Open in browser**: `fly open`
