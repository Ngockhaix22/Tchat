import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { handleDemo } from "./routes/demo";

// Proxy configuration
const PROXY_LIST = [
  "apollo.p.shifter.io:11435",
  "apollo.p.shifter.io:11436",
  "apollo.p.shifter.io:11437",
  "apollo.p.shifter.io:11438",
  "apollo.p.shifter.io:11439",
  "apollo.p.shifter.io:11440",
  "apollo.p.shifter.io:11441",
];

const getRandomProxy = () => {
  const idx = Math.floor(Math.random() * PROXY_LIST.length);
  return PROXY_LIST[idx];
};

// Create proxy agent function
function createProxyAgent(proxyUrl: string) {
  try {
    console.log(`🌐 Using proxy: ${proxyUrl}`);

    // For HTTPS requests (TextFree API uses HTTPS)
    const httpsAgent = new HttpsProxyAgent(`http://${proxyUrl}`);
    // For HTTP requests (fallback)
    const httpAgent = new HttpProxyAgent(`http://${proxyUrl}`);

    return { httpsAgent, httpAgent };
  } catch (error: any) {
    console.error("❌ Error creating proxy agent:", error.message);
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
      Host: "api.pinger.com",
      "content-type": "application/json",
      "x-gid": "0",
      "x-rest-method": "POST",
      authorization:
        'OAuth realm="https://api.pinger.com",oauth_consumer_key="2175909957-3879335701%3Btextfree-voice-iphone-free-5D63A131-F5C1-4B10-A28D-5A2A5DFF3390",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1755758058",oauth_nonce="D97D71C8-5342-4341-8A08-B1CF1121AF4C", oauth_signature="fLspkC3xW6zt6zuEmeIR3BoNNmk%3D"',
      accept: "*/*",
      "x-os": "ios,16.7.11",
      "x-udid":
        "7CDDF743-7383-4B53-9DA5-8601C0A5C4CB,92ADE5A3-D162-456C-B9D0-703887529370",
      "x-install-id": "f6bdcaae0d6488e87abff136159172f8",
      "accept-language": "en-US,en;q=0.9",
      "x-source": "ios",
      "user-agent": "TextfreeVoice/16317 CFNetwork/1410.1 Darwin/22.6.0",
      "x-client": "textfree-voice-iphone-free,12.99,16317",
      "x-bg": "0",
    },
  },
];

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Get all accounts
  app.get("/api/accounts", (req, res) => {
    const accounts = TEXTFREE_ACCOUNTS.map((account) => ({
      id: account.id,
      number: account.number,
      isActive:
        account.headers &&
        account.headers.authorization &&
        !account.headers.authorization.includes("YOUR_KEY_HERE"),
    }));
    res.json(accounts);
  });

  // Get conversations using batch API
  app.post("/api/getConvertion", async (req, res) => {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      // Find the account configuration
      const account = TEXTFREE_ACCOUNTS.find(
        (acc) => acc.id === parseInt(accountId),
      );
      if (!account) {
        return res.status(404).json({
          success: false,
          error: "Account not found",
        });
      }

      // Check if account is properly configured
      if (
        !account.headers.authorization ||
        account.headers.authorization.includes("YOUR_KEY_HERE")
      ) {
        return res.status(400).json({
          success: false,
          error: `Account ${account.number} is not properly configured. Please add the curl headers.`,
        });
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
              { updatedSince: "2025-08-21 03:42:24.472958" },
            ],
            resource: "/2.0/communications/sync",
          },
          {
            method: "GET",
            contentType: "application/json",
            resource: "/2.0/my/inbox",
            queryParams: [],
            body: "",
            useHTTPS: "1",
          },
          {
            useHTTPS: "1",
            body: "",
            contentType: "application/json",
            method: "GET",
            resource: "/2.0/bsms",
            queryParams: [{ since: "2025-08-20 03:42:24.472958" }],
          },
        ],
      };

      // Prepare axios config
      const axiosConfig: any = {
        headers: account.headers,
        timeout: 15000,
      };

      // Add proxy agents if available
      if (agents) {
        axiosConfig.httpsAgent = agents.httpsAgent;
        axiosConfig.httpAgent = agents.httpAgent;
      }

      const apiUrl = "https://api.pinger.com/1.0/batch";
      const response = await axios.post(apiUrl, payload, axiosConfig);

      console.log("TextFree API response:", response.status);

      // Parse the response data since it's returned as a string
      let parsedData = response.data.result;
      if (
        Array.isArray(parsedData) &&
        parsedData.length > 0 &&
        typeof parsedData[0].body === "string"
      ) {
        // Parse the JSON strings in the body field
        parsedData = parsedData.map((item) => ({
          ...item,
          body:
            typeof item.body === "string" ? JSON.parse(item.body) : item.body,
        }));
      }

      res.json({
        success: true,
        data: parsedData,
        proxy: proxyUrl,
      });
    } catch (error: any) {
      console.error(
        "Error sending batch request:",
        error.response?.data || error.message,
      );

      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || null,
      });
    }
  });

  return app;
}
