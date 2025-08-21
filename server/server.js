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
   "apollo.p.shifter.io:11435",
   "apollo.p.shifter.io:11436",
   "apollo.p.shifter.io:11437",
   "apollo.p.shifter.io:11438",
   "apollo.p.shifter.io:11439",
   "apollo.p.shifter.io:11440",
   "apollo.p.shifter.io:11441"
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
      "authorization": 'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175909957-3879335701%3Btextfree-voice-iphone-free-5D63A131-F5C1-4B10-A28D-5A2A5DFF3390",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755741394",oauth_nonce="56C8ACC5-1CFD-4974-905D-656DE09D4FBF",oauth_signature="3fYwLnu3dhYj7d1Eu3ZPjcgB9Z8%3D"',
      "accept": "*/*",
      "x-os": "ios,16.7.11",
      "x-udid": "7CDDF743-7383-4B53-9DA5-8601C0A5C4CB,92ADE5A3-D162-456C-B9D0-703887529370",
      "x-install-id": "f6bdcaae0d6488e87abff136159172f8",
      "accept-language": "en-US,en;q=0.9",
      "x-source": "ios",
      "user-agent": "TextfreeVoice/16317 CFNetwork/1410.1 Darwin/22.6.0",
      "x-client": "textfree-voice-iphone-free,12.99,16317",
      "x-bg": "0",
    },
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