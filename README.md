# ReturnReminder

Return Reminder is a web app that helps you track and never miss return deadlines for your online purchases from major retailers like Amazon, Wayfair, and Office Depot.

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

### Using Docker

For proper MaxMind geolocation, we will use `--network=host` to get real client IPs:

```bash
docker run --network=host \
  -e GETGATHER_URL=your_local_mcp_getgather_url \
  -e MAXMIND_ACCOUNT_ID=your_maxmind_account_id \
  -e MAXMIND_LICENSE_KEY=your_maxmind_license_key \
  ghcr.io/mcp-getgather/return-reminder:latest
```

If you cannot access the application on macOS, update Docker Desktop to version 4.34+ and enable host networking in Settings → Resources → Network.

Then open [localhost:3000](http://localhost:3000) to access the application.

### Local Development

```bash
npm install
npm run dev
```
