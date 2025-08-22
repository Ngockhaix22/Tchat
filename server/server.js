import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Proxy configuration
const PROXY_LIST = [
  "198.199.94.130:10001",
  "198.199.94.130:10002",
  "198.199.94.130:10003",
  "198.199.94.130:10004",
  "198.199.94.130:10005",
  "198.199.94.130:10006",
  "198.199.94.130:10007",
  "198.199.94.130:10008",
  "198.199.94.130:10009",
  "198.199.94.130:10010",
  "198.199.94.130:10011",
  "198.199.94.130:10012",
  "198.199.94.130:10013",
  "198.199.94.130:10014",
  "198.199.94.130:10015",
  "198.199.94.130:10016",
  "198.199.94.130:10017",
  "198.199.94.130:10018",
  "198.199.94.130:10019",
  "198.199.94.130:10020",
  "198.199.94.130:10021",
  "198.199.94.130:10022",
  "198.199.94.130:10023",
  "198.199.94.130:10024",
  "198.199.94.130:10025",
];

const getRandomProxy = () => {
  const idx = Math.floor(Math.random() * PROXY_LIST.length);
  return PROXY_LIST[idx];
}

// Create proxy agent function
function createProxyAgent(proxyUrl) {
  try {
    console.log(`🌐 Using proxy: ${proxyUrl}`);

    // For HTTPS requests (TextFree API uses HTTPS)
    const httpsAgent = new HttpsProxyAgent(`http://${proxyUrl}`);
    // For HTTP requests (fallback)
    const httpAgent = new HttpProxyAgent(`http://${proxyUrl}`);

    return { httpsAgent, httpAgent };
  } catch (error) {
    console.error('❌ Error creating proxy agent:', error.message);
    return null;
  }
}

// TextFree API configuration for multiple accounts
const TEXTFREE_ACCOUNTS = [
  {
    id: 1,
    number: "(808) 301-3193",
    apiUrl: "https://api.pinger.com/2.2/message",
    headers: {
      "Host": "api.pinger.com",
      "content-type": "application/json",
      "x-gid": "0",
      "x-rest-method": "POST",
      "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175909957-3879335701%3Btextfree-voice-iphone-free-BF9C3F06-17E3-4E17-AB7B-0F1D4C5956E5",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755777468",oauth_nonce="2BD1507A-1F49-4423-BCCD-232E79EFF8FC", oauth_signature="HFdtM72ur%2BnuWD8GcEMUKbQAgxM%3D"',
      "accept": "*/*",
      "x-os": "ios,18.7.6",
      "x-udid": "9CC15284-208A-4933-A7C7-6E5A553E401D,00000000-0000-0000-0000-000000000000",
      "x-install-id": "cd75b2ee7d2c3ccc5598d849a613e226",
      "accept-language": "en-US,en;q=0.9",
      "x-source": "ios",
      "user-agent": "TextfreeVoice/16317 CFNetwork/1410.1 Darwin/22.6.0",
      "x-client": "textfree-voice-iphone-free,12.99,16317",
      "x-bg": "0",
    },
    authConvertion: { "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175909957-3879335701%3Btextfree-voice-iphone-free-BF9C3F06-17E3-4E17-AB7B-0F1D4C5956E5",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755777469",oauth_nonce="1D3402CD-39CA-4029-90CF-0576F71F73D5", oauth_signature="rnmvnrO4amdib0kFVscAT4pjWhk%3D"' }

  },
  {
    id: 2,
    number: "(508) 301-5916",
    apiUrl: "https://api.pinger.com/2.2/message",
    headers: {
      "Host": "api.pinger.com",
      "content-type": "application/json",
      "x-gid": "0",
      "x-rest-method": "POST",
      "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175753805-3879179565%3Btextfree-voice-iphone-free-6C54C19A-3ECB-47FB-B97A-1D78500291D0",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755777164",oauth_nonce="43CA3247-E521-406F-B564-0C93EB2A6BE1", oauth_signature="kJvejqPb0L82S%2FtAJ7pfe9B%2F6cA%3D"',
      "accept": "*/*",
      "x-os": "ios,16.7.11",
      "x-udid": "01A17BD5-C78B-464C-B487-E9D72F3E9C05,7A274723-4349-49A9-992C-26E7B3940E27",
      "x-install-id": "f27afe0b5b60179ffb8b9f7513dd4cf5",
      "accept-language": "en-US,en;q=0.9",
      "x-source": "ios",
      "user-agent": "TextfreeVoice/16317 CFNetwork/1410.1 Darwin/22.6.0",
      "x-client": "textfree-voice-iphone-free,12.99,16317",
      "x-bg": "0",
    },
    authConvertion: { "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175753805-3879179565%3Btextfree-voice-iphone-free-6C54C19A-3ECB-47FB-B97A-1D78500291D0",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755777165",oauth_nonce="6CC1AD7A-66B0-4213-B595-14906583A834", oauth_signature="2hQhRF8MSFPyYPdf%2FDbxIJkAAHI%3D"' }
  },
];

// In-memory storage for message history (use database in production)
let messageHistory = {};
let conversations = {};

// Initialize message history for each account
TEXTFREE_ACCOUNTS.forEach(account => {
  messageHistory[account.id] = [];
  conversations[account.id] = [];
});

// Helper function to format phone number
function formatPhoneNumber(phone) {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  console.log(`📞 Input phone: "${phone}" -> Cleaned: "${cleaned}"`);

  // Handle different phone number formats
  if (cleaned.length === 10) {
    // US 10-digit number (missing country code)
    const formatted = '1' + cleaned;
    console.log(`📞 Added country code: ${formatted}`);
    return formatted;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US 11-digit number (already has country code)
    console.log(`📞 Already has country code: ${cleaned}`);
    return cleaned;
  } else if (cleaned.length === 11 && !cleaned.startsWith('1')) {
    // 11 digits but doesn't start with 1 - might be invalid
    console.log(`📞 Invalid 11-digit number (doesn't start with 1): ${cleaned}`);
    return cleaned;
  } else {
    // Other lengths - return as is and let API handle validation
    console.log(`📞 Unusual length (${cleaned.length} digits): ${cleaned}`);
    return cleaned;
  }
}

// Get all accounts
app.get('/api/accounts', (req, res) => {
  const accounts = TEXTFREE_ACCOUNTS.map(account => ({
    id: account.id,
    number: account.number,
    isActive: account.headers && account.headers.authorization && !account.headers.authorization.includes('YOUR_KEY_HERE')
  }));
  res.json(accounts);
});

// Test proxy endpoint
app.get('/api/test-proxy', async (req, res) => {
  try {
    const proxyUrl = getRandomProxy();
    const agents = createProxyAgent(proxyUrl);

    if (!agents) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create proxy agent'
      });
    }

    // Test with a simple request
    const response = await axios.get('https://httpbin.org/ip', {
      httpsAgent: agents.httpsAgent,
      timeout: 10000
    });

    res.json({
      success: true,
      proxy: proxyUrl,
      response: response.data,
      message: 'Proxy is working'
    });

  } catch (error) {
    console.error('Proxy test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Proxy test failed'
    });
  }
});

// Send message using specific account
app.post('/api/send-message', async (req, res) => {
  try {
    const { accountId, phoneNumber, message } = req.body;

    if (!accountId || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, phone number and message are required'
      });
    }

    // Get random proxy
    const proxyUrl = getRandomProxy();
    const agents = createProxyAgent(proxyUrl);

    // Find the account configuration
    const account = TEXTFREE_ACCOUNTS.find(acc => acc.id === parseInt(accountId));
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Check if account is properly configured
    if (!account.headers.authorization || account.headers.authorization.includes('YOUR_KEY_HERE')) {
      return res.status(400).json({
        success: false,
        error: `Account ${account.number} is not properly configured. Please add the curl headers.`
      });
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);
    const displayNumber = `(${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7)}`;

    const payload = {
      to: [{
        name: displayNumber,
        TN: formattedNumber
      }],
      text: message
    };

    console.log(`Sending message from ${account.number} via proxy ${proxyUrl}:`, payload);

    // Prepare axios config
    const axiosConfig = {
      headers: account.headers,
      timeout: 15000,
    };

    // Add proxy agents if available
    if (agents) {
      axiosConfig.httpsAgent = agents.httpsAgent;
      axiosConfig.httpAgent = agents.httpAgent;
    }

    // Send request with proxy
    const response = await axios.post(account.apiUrl, payload, axiosConfig);

    console.log('TextFree API response:', response.status, response.data);

    // Create or update conversation
    if (!conversations[accountId]) {
      conversations[accountId] = [];
    }

    let conversation = conversations[accountId].find(c => c.number === displayNumber);
    if (!conversation) {
      conversation = {
        id: `conv_${Date.now()}`,
        number: displayNumber,
        messages: [],
        lastMessage: '',
        lastActivity: new Date(),
        unreadCount: 0
      };
      conversations[accountId].push(conversation);
    }

    // Add message to conversation
    const messageRecord = {
      id: Date.now().toString(),
      text: message,
      fromMe: true,
      timestamp: new Date(),
      proxy: proxyUrl
    };

    conversation.messages.push(messageRecord);
    conversation.lastMessage = message;
    conversation.lastActivity = new Date();

    // Keep only last 100 messages per conversation
    if (conversation.messages.length > 100) {
      conversation.messages = conversation.messages.slice(-100);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      proxy: proxyUrl,
      data: response.data,
      messageRecord,
      conversation
    });

  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);

    let errorMessage = 'Failed to send message';
    let errorDetails = error.message;

    if (error.response?.status === 401 || error.message.includes('credentials')) {
      errorMessage = 'Bad credentials - OAuth tokens may be expired. Please update your TextFree authentication.';
    } else if (error.code === 'ECONNRESET' || error.message.includes('proxy')) {
      errorMessage = 'Proxy connection failed. Trying different proxy...';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      needsCredentialUpdate: error.response?.status === 401,
      proxyError: error.code === 'ECONNRESET' || error.message.includes('proxy')
    });
  }
});
app.post('/api/getConvertion', async (req, res) => {

  try {

    const authenticationOfHeader = { "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175753805-3879179565%3Btextfree-voice-iphone-free-5D63A131-F5C1-4B10-A28D-5A2A5DFF3390",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755774617",oauth_nonce="390417B0-AB7F-4271-A890-B4F86DDD10CB", oauth_signature="dCV%2Bs%2Bw5JcgfPmaThG03G7qql0Y%3D"' };
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }

    // Find the account configuration
    const account = TEXTFREE_ACCOUNTS.find(acc => acc.id === parseInt(accountId));
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    const authHeader = account.headers.authorization;
    const timestampMatch = authHeader.match(/oauth_timestamp="([^"]+)"/);
    const oauthTimestamp = timestampMatch ? timestampMatch[1] : null;

    if (!oauthTimestamp) {
      return res.status(400).json({
        success: false,
        error: 'oauth_timestamp not found in account authorization header'
      });
    }

    // Get current timestamp for updatedSince
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();
    // Check if account is properly configured
    if (!account.headers.authorization || account.headers.authorization.includes('YOUR_KEY_HERE')) {
      return res.status(400).json({
        success: false,
        error: `Account ${account.number} is not properly configured. Please add the curl headers.`
      });
    }
    const newHeader = {
      ...account.headers,
      authorization: account.authConvertion.authorization
    }
    const proxyUrl = getRandomProxy();
    const agents = createProxyAgent(proxyUrl);
    const payload = {
      requests: [
        {
          method: "GET",
          contentType: "application/json",
          useHTTPS: "1",
          body: "",
          queryParams: [
            { createdSince: "2025-08-20 03:42:24.472958" },
            { updatedSince: "2025-08-21 03:42:24.472958" }
          ],
          resource: "/2.0/communications/sync"
        },
        {
          method: "GET",
          contentType: "application/json",
          resource: "/2.0/my/inbox",
          queryParams: [],
          body: "",
          useHTTPS: "1"
        },
        {
          useHTTPS: "1",
          body: "",
          contentType: "application/json",
          method: "GET",
          resource: "/2.0/bsms",
          queryParams: [
            { since: "2025-08-20 03:42:24.472958" }
          ]
        }
      ]
    };
    // Prepare axios config
    const axiosConfig = {
      headers: newHeader,
      timeout: 15000,
    };

    // Add proxy agents if available
    if (agents) {
      axiosConfig.httpsAgent = agents.httpsAgent;
      axiosConfig.httpAgent = agents.httpAgent;
    }
    const apiUrl = "https://api.pinger.com/1.0/batch";
    const response = await axios.post(apiUrl, payload, axiosConfig);
    res.json({
      success: true,
      data: response.data.result[0].body,
      proxy: proxyUrl
    });
  } catch (error) {
    console.error("Error sending batch request:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Test proxy: GET http://localhost:${PORT}/api/test-proxy`);
  console.log(`Available proxies: ${PROXY_LIST.length}`);
});

export default app;