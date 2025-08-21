# TextFree Multi-Account Setup

## Quick Start

### 1. Install Server Dependencies
```bash
cd server
npm install express cors axios
# or if you prefer, copy the server-package.json to server/package.json and run npm install
```

### 2. Start the Node.js Server
```bash
cd server
node textfree-server.js
```
The server will run on http://localhost:3001

### 3. Start the React Client (in a new terminal)
```bash
# From the root directory
pnpm dev
```
The client will run on the configured port

## Configuration

### Adding More TextFree Accounts

Edit `server/textfree-server.js` and update the `TEXTFREE_ACCOUNTS` array:

```javascript
{
  id: 2,
  number: "(555) 123-4567", // Replace with your actual number
  apiUrl: 'https://api.pinger.com/2.2/message',
  headers: {
    // Add your actual curl headers here
    'Host': 'api.pinger.com',
    'content-type': 'application/json',
    'authorization': 'OAuth realm="https://api.pinger.com",oauth_consumer_key="YOUR_ACTUAL_KEY_HERE"',
    // ... copy all headers from your curl command
  }
}
```

### Features

- ✅ Multiple TextFree accounts
- ✅ Real-time messaging
- ✅ Conversation history
- ✅ Phone number only display (no account names)
- ✅ Modern UI with React + Tailwind
- ✅ Message status tracking
- ✅ New message creation

### API Endpoints

- `GET /api/accounts` - Get all configured accounts
- `GET /api/conversations/:accountId` - Get conversations for an account
- `POST /api/send-message` - Send a message
- `GET /api/health` - Health check

### Notes

1. Only Account 1 has real TextFree credentials configured
2. Accounts 2-5 need their curl headers added to work
3. The UI will show inactive status for unconfigured accounts
4. Messages are stored in memory (use a database for production)
