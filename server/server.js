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
  "31.58.20.100:5784",
"154.6.121.129:6096",
"46.202.227.211:6205",
"107.172.116.86:5542",
"38.154.197.15:6681",
"45.61.127.88:6027",
"136.0.189.126:6853",
"198.46.202.48:5328",
"173.211.0.190:6683",
"104.239.124.132:6410",
"45.61.97.217:6743",
"46.202.59.155:5646",
"104.239.106.196:5841",
"142.111.93.67:6628",
"142.111.93.222:6783",
"198.23.147.41:5056",
"104.233.12.150:6701",
"67.227.36.185:6227",
"216.74.115.108:6702",
"82.26.208.102:5409",
"107.173.93.144:6098",
"104.233.12.203:6754",
"173.211.69.100:6693",
"82.26.212.248:6055",
"23.236.196.183:6273",
"46.202.248.84:5578",
"216.74.114.146:6429",
"184.174.44.73:6499",
"198.154.89.47:6138",
"67.227.14.32:6624",
"46.202.227.60:6054",
"66.78.32.67:5117",
"149.57.85.36:6004",
"216.74.114.77:6360",
"82.26.208.76:5383",
"173.0.9.5:5588",
"161.123.154.50:6580",
"173.0.9.211:5794",
"38.170.173.11:7562",
"104.232.211.29:5642",
"142.147.240.237:6759",
"192.3.48.117:6110",
"216.74.115.144:6738",
"23.27.75.78:6158",
"69.58.9.63:7133",
"66.78.32.196:5246",
"136.0.105.49:6059",
"23.27.78.24:5604",
"104.233.12.114:6665",
"136.0.126.78:5839",
"104.238.37.216:6773",
"45.115.195.27:6005",
"89.249.193.84:5822",
"66.78.32.31:5081",
"31.59.18.137:6718",
"166.88.3.142:6613",
"172.245.157.239:6824",
"173.211.30.9:6443",
"142.111.58.3:6581",
"154.6.83.181:6652",
"23.26.94.169:6151",
"38.154.200.55:5756",
"23.94.7.160:5847",
"142.111.239.63:5641",
"154.30.242.179:9573",
"142.147.242.235:6214",
"166.88.58.172:5897",
"92.113.3.147:6156",
"191.101.181.220:6973",
"92.113.3.125:6134",
"104.253.77.173:5595",
"23.27.75.52:6132",
"45.41.162.247:6884",
"173.211.69.37:6630",
"198.89.123.4:6546",
"198.46.246.169:6793",
"38.154.206.243:9734",
"82.22.235.206:7012",
"45.61.116.108:6786",
"38.154.191.133:8710",
"38.154.200.7:5708",
"173.214.177.60:5751",
"206.206.73.81:6697",
"23.26.68.207:6190",
"67.227.14.50:6642",
"154.30.250.31:5543",
"46.202.224.18:5570",
"154.6.59.136:6604",
"154.6.128.126:6096",
"23.27.91.20:6099",
"31.57.87.4:5689",
"154.6.115.169:6638",
"38.153.139.126:9802",
"38.154.204.218:8259",
"166.88.83.156:6813",
"45.61.125.14:6025",
"192.186.186.21:6063",
"31.58.20.11:5695",
"46.202.224.75:5627",
"184.174.126.157:6449",
"38.154.197.225:6891",
"104.168.25.49:5731",
"142.111.192.75:5671",
"142.147.240.15:6537",
"82.26.212.246:6053",
"161.123.5.64:5113",
"23.229.126.105:7634",
"67.227.37.131:5673",
"104.238.37.160:6717",
"23.95.250.244:6517",
"66.78.32.177:5227",
"38.154.193.236:5509",
"142.147.132.60:6255",
"45.115.195.183:6161",
"23.27.210.240:6610",
"45.81.149.184:6616",
"173.244.41.84:6268",
"45.81.149.15:6447",
"161.123.154.201:6731",
"82.26.238.230:6537",
"104.233.12.189:6740",
"154.6.121.41:6008",
"161.123.101.38:6664",
"38.154.227.127:5828",
"185.202.175.66:6854",
"154.30.244.175:9616",
"173.244.41.15:6199",
"184.174.44.189:6615",
"161.123.154.237:6767",
"31.57.87.69:5754",
"45.41.176.156:6454",
"192.186.186.66:6108",
"107.173.36.30:5485",
"67.227.119.96:6425",
"23.94.7.213:5900",
"191.96.117.92:6847",
"216.74.118.183:6338",
"38.154.204.56:8097",
"166.88.169.33:6640",
"38.154.197.18:6684",
"188.215.5.25:5055",
"107.174.25.128:5582",
"209.127.127.133:7231",
"104.238.49.159:5813",
"192.210.191.187:6173",
"103.251.223.57:6036",
"107.173.93.129:6083",
"154.30.251.38:5179",
"46.202.59.182:5673",
"198.46.246.229:6853",
"154.30.241.119:9830",
"23.26.94.213:6195",
"31.58.16.241:6208",
"154.6.129.78:5548",
"67.227.36.216:6258",
"154.6.87.154:6624",
"107.175.119.58:6586",
"198.23.214.139:6406",
"38.170.188.238:5811",
"192.186.176.229:8279",
"107.172.156.70:5718",
"154.30.251.252:5393",
"198.46.241.185:6720",
"2.57.20.141:6133",
"166.88.169.90:6697",
"107.172.221.153:6108",
"23.95.250.5:6278",
"104.232.209.251:6209",
"148.135.148.244:6237",
"198.23.128.210:5838",
"31.57.87.24:5709",
"23.26.94.203:6185",
"136.0.194.49:6786",
"38.153.132.23:5130",
"45.61.125.25:6036",
"104.239.124.210:6488",
"192.3.48.31:6024",
"173.239.219.6:5915",
"38.154.233.56:5466",
"23.27.209.24:6043",
"142.111.239.4:5582",
"161.123.101.78:6704",
"23.95.250.235:6508",
"50.114.93.16:6000",
"92.113.7.13:6739",
"188.215.5.3:5033",
"64.64.115.6:5641",
"107.173.137.128:6382",
"142.147.128.19:6519",
"64.64.110.223:6746",
"107.173.93.96:6050",
"198.46.161.5:5055",
"136.0.105.204:6214",
"206.206.69.25:6289",
"23.229.110.218:8746",
"38.154.197.198:6864",
"154.30.241.87:9798",
"38.170.189.251:9817",
"142.111.131.236:6314",
"198.46.137.19:6223",
"45.61.122.136:6428",
"82.26.238.162:6469",
"191.96.254.112:6159",
"38.154.204.177:8218",
"173.214.177.184:5875",
"38.170.189.245:9811",
"104.233.12.81:6632",
"46.202.71.179:6174",
"136.0.105.228:6238",
"45.61.127.168:6107",
"45.61.118.61:5758",
"107.175.56.207:6480",
"142.111.131.216:6294",
"23.229.125.252:5521",
"154.6.23.58:6525",
"188.215.5.49:5079",
"206.206.73.126:6742",
"38.154.206.111:9602",
"136.0.180.221:6242",
"23.236.196.174:6264",
"185.216.106.15:6092",
"104.224.90.103:6264",
"148.135.144.215:5711",
"38.154.194.148:9561",
"104.238.37.165:6722",
"192.177.103.215:6708",
"64.64.118.201:6784",
"45.41.160.11:5993",
"142.111.239.130:5708",
"154.6.23.26:6493",
"92.113.7.217:6943",
"38.154.204.254:8295",
"185.216.106.12:6089",
"45.61.118.17:5714",
"216.10.27.149:6827",
"23.27.75.108:6188",
"45.41.176.83:6381",
"166.88.235.217:5845",
"23.95.250.107:6380",
"89.249.195.214:6969",
"181.214.13.191:6032",
"198.89.123.242:6784",
"107.172.163.192:6708",
"198.46.246.42:6666",
"31.58.26.53:6636",
"45.41.162.125:6762",
"154.6.127.224:5695",
"198.46.161.91:5141",
"23.27.93.186:5765",
"161.123.154.233:6763",
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