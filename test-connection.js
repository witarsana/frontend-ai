// Quick test to check OpenAI connection
const OpenAI = require("openai");
require("dotenv").config();

async function testConnection() {
  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ No OpenAI API key found");
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log("🔍 Testing OpenAI connection...");

    // Simple API call to test connectivity
    const response = await Promise.race([
      client.models.list(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      ),
    ]);

    console.log("✅ OpenAI connection successful");
    console.log(`📋 Available models: ${response.data.length}`);
  } catch (error) {
    console.log("❌ OpenAI connection failed:");
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || "N/A"}`);
    console.log(`   Status: ${error.status || "N/A"}`);

    if (error.code === "ENOTFOUND") {
      console.log("🔍 DNS resolution failed - check internet connection");
    } else if (error.code === "ECONNREFUSED") {
      console.log("🔍 Connection refused - OpenAI servers may be down");
    } else if (error.message.includes("timeout")) {
      console.log("🔍 Request timed out - slow internet or server issues");
    }
  }
}

testConnection();
