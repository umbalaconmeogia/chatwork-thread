const { ConfigManager, ChatworkAPI, DatabaseManager, ThreadAnalyzer } = require('./dist/core/index.js');

console.log('🧵 Simple ThreadAnalyzer test...\n');

async function simpleTest() {
  try {
    console.log('1. Testing URL parsing...');
    const chatworkUrl = 'https://www.chatwork.com/#!rid368838329-2015294412468527105';
    const parsed = ChatworkAPI.parseMessageIdFromUrl(chatworkUrl);
    console.log('✅ Parsed:', parsed);

    console.log('\n2. Testing API connection...');
    const configManager = ConfigManager.getInstance();
    const apiConfig = configManager.getChatworkAPIConfig();
    const api = new ChatworkAPI(apiConfig);
    
    const isConnected = await api.testConnection();
    console.log('✅ API connected:', isConnected);

    if (isConnected) {
      console.log('\n3. Testing get message...');
      const message = await api.getMessage(parsed.roomId, parsed.messageId);
      console.log('✅ Message retrieved:');
      console.log('   ID:', message.message_id);
      console.log('   Body:', message.body.substring(0, 100) + '...');
      console.log('   Account:', message.account.name);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

simpleTest();

