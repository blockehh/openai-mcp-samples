import dotenv from "dotenv";
import twilio from "twilio";
import OpenAI from "openai";

dotenv.config();

const { AUTH_TOKEN, MCP_SERVER, OPENAI_API_KEY } = process.env;

if (!AUTH_TOKEN || !MCP_SERVER || !OPENAI_API_KEY) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

// Configure available Twilio services
const services = [
  'Conversations',
  'PhoneNumbers',
  'Studio',
  'Voice',
  'Messaging',
  'Verify',
  'Lookups'
];

const url = `${MCP_SERVER}/mcp?${services.map(s => `services=${s}`).join('&')}`;
const signature = twilio.getExpectedTwilioSignature(AUTH_TOKEN, url, {});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function runMCP(userInput) {
  try {
    const response = await openai.responses.create({
      model: "o3",
      instructions: "You are a helpful assistant with access to Twilio tools. Use these tools to accomplish the tasks given to you. Always verify inputs and handle errors appropriately.",
      input: userInput,
      tools: [
        {
          type: "mcp",
          server_label: "twilio",
          server_url: url,
          require_approval: "always", // For security, require approval for all tool actions
          headers: {
            "x-twilio-signature": signature,
          },
        },
      ],
    });

    console.log("Assistant Response:", response.output_text);
    
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log("\nTool Calls Made:");
      response.tool_calls.forEach((call, index) => {
        console.log(`\n${index + 1}. Tool Call:`, call.type);
        console.log("Function:", call.function?.name || 'N/A');
        console.log("Arguments:", call.function?.arguments || 'N/A');
      });
    }

    return response;
  } catch (error) {
    console.error("Error running MCP:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    throw error;
  }
}

// Example usage
const userQuery = "What Twilio phone numbers are available in my account?";
runMCP(userQuery).catch(console.error);