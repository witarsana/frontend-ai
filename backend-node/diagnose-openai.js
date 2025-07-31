const OpenAI = require("openai");
require("dotenv").config();

async function diagnoseOpenAI() {
  console.log("🔍 Diagnosing OpenAI connection issues...\n");

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ No OpenAI API key found in .env file");
    return;
  }

  console.log("✅ OpenAI API key found");
  console.log(
    `🔑 Key preview: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`
  );

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 second timeout
  });

  try {
    console.log("\n🌐 Testing basic API connectivity...");

    const start = Date.now();
    const models = await client.models.list();
    const duration = Date.now() - start;

    console.log(`✅ OpenAI API connection successful! (${duration}ms)`);
    console.log(`📋 Found ${models.data.length} models available`);

    // Check if whisper-1 is available
    const whisperModel = models.data.find((m) => m.id === "whisper-1");
    if (whisperModel) {
      console.log("✅ Whisper-1 model is available");
    } else {
      console.log("⚠️ Whisper-1 model not found in available models");
    }
  } catch (error) {
    console.log("\n❌ OpenAI connection failed:");
    console.log(`   Message: ${error.message}`);
    console.log(`   Code: ${error.code || "N/A"}`);
    console.log(`   Status: ${error.status || "N/A"}`);
    console.log(`   Type: ${error.type || "N/A"}`);

    // Provide specific suggestions based on error
    if (error.code === "ENOTFOUND") {
      console.log("\n🔍 DIAGNOSIS: DNS resolution failed");
      console.log("   - Check your internet connection");
      console.log("   - Try using a different DNS server (8.8.8.8)");
      console.log("   - Check if api.openai.com is accessible");
    } else if (error.code === "ECONNREFUSED") {
      console.log("\n🔍 DIAGNOSIS: Connection refused");
      console.log("   - OpenAI servers may be down");
      console.log("   - Check https://status.openai.com/");
      console.log("   - Try again in a few minutes");
    } else if (
      error.code === "ECONNRESET" ||
      error.message.includes("socket hang up")
    ) {
      console.log("\n🔍 DIAGNOSIS: Connection interrupted");
      console.log("   - Network instability or timeout");
      console.log("   - Try using a more stable internet connection");
      console.log("   - Consider using a VPN if behind corporate firewall");
    } else if (error.status === 401) {
      console.log("\n🔍 DIAGNOSIS: Authentication failed");
      console.log("   - Check if your API key is valid");
      console.log("   - Regenerate API key at https://platform.openai.com/");
    } else if (error.status === 429) {
      console.log("\n🔍 DIAGNOSIS: Rate limit or quota exceeded");
      console.log("   - Check your usage at https://platform.openai.com/usage");
      console.log("   - Wait and try again later");
    } else if (error.message.includes("timeout")) {
      console.log("\n🔍 DIAGNOSIS: Request timed out");
      console.log("   - Slow internet connection");
      console.log("   - Try increasing timeout or use different network");
    } else {
      console.log("\n🔍 DIAGNOSIS: Unknown connection issue");
      console.log("   - Try using Deepgram or Hugging Face instead");
      console.log("   - Check firewall/proxy settings");
    }
  }

  console.log("\n💡 RECOMMENDATIONS:");
  console.log(
    '   1. Try selecting "Deepgram" instead (faster & more reliable)'
  );
  console.log('   2. Try selecting "Hugging Face" (free alternative)');
  console.log("   3. Check https://status.openai.com/ for service status");
  console.log("   4. Test from a different network if possible");
}

diagnoseOpenAI();
