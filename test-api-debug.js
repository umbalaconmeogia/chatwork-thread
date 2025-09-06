const { ConfigManager } = require('./dist/core/config/ConfigManager');
const { ChatworkAPI } = require('./dist/core/api/ChatworkAPI');

async function testAPI() {
  try {
    console.log('🧪 Testing Chatwork API...');
    
    const config = ConfigManager.getInstance();
    const apiConfig = config.getConfig().api;
    const api = new ChatworkAPI(apiConfig.token, apiConfig);
    
    console.log('✅ API instance created');
    
    // Test connection
    console.log('🔗 Testing connection...');
    const me = await api.getMe();
    console.log('👤 Current user:', me.name);
    
    // Test get messages
    console.log('📨 Getting messages from room 368838329...');
    const messages = await api.getMessages('368838329', true); // force=1
    console.log('📊 Messages type:', typeof messages);
    console.log('📊 Messages array?', Array.isArray(messages));
    console.log('📊 Messages length:', messages?.length || 'No length property');
    
    if (messages && messages.length > 0) {
      console.log('📨 First message:', {
        id: messages[0].id,
        sender: messages[0].sender_name,
        content: messages[0].content.substring(0, 50) + '...'
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPI();
