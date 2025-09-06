// Run with: node test-chatwork-api.js
const { ConfigManager, ChatworkAPI } = require('../dist/core/index.js');

console.log('🚀 Testing ChatworkAPI with Real Token...\n');

async function testChatworkAPI() {
  try {
    // Test 1: Load configuration from .env
    console.log('1. Loading configuration from .env file...');
    const configManager = ConfigManager.getInstance();
    const apiConfig = configManager.getChatworkAPIConfig();
    console.log('✅ Configuration loaded successfully');
    console.log(`   API Base URL: ${apiConfig.baseURL}`);
    console.log(`   API Timeout: ${apiConfig.timeout}ms`);

    // Test 2: Create API instance
    console.log('\n2. Creating ChatworkAPI instance...');
    const api = new ChatworkAPI(apiConfig);
    console.log('✅ ChatworkAPI instance created');

    // Test 3: Test API connection
    console.log('\n3. Testing API connection...');
    const isConnected = await api.testConnection();
    if (isConnected) {
      console.log('✅ API connection successful!');
    } else {
      console.log('❌ API connection failed');
      return;
    }

    // Test 4: Get my information
    console.log('\n4. Getting my information...');
    const me = await api.getMe();
    console.log(`✅ My info: ${me.name} (ID: ${me.account_id})`);
    console.log(`   Avatar: ${me.avatar_image_url || 'No avatar'}`);

    // Test 5: Get rooms
    console.log('\n5. Getting rooms...');
    const rooms = await api.getRooms();
    console.log(`✅ Found ${rooms.length} rooms`);
    
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      console.log(`   First room: ${firstRoom.name} (ID: ${firstRoom.room_id})`);
      console.log(`   Type: ${firstRoom.type}, Role: ${firstRoom.role}`);
      console.log(`   Unread: ${firstRoom.unread_num}, Messages: ${firstRoom.message_num}`);

      // Test 6: Get messages from first room
      console.log('\n6. Getting messages from first room...');
      const messages = await api.getMessages(firstRoom.room_id);
      console.log(`✅ Found ${messages.length} messages`);
      
      if (messages.length > 0) {
        const firstMessage = messages[0];
        console.log(`   First message: ${firstMessage.body.substring(0, 100)}...`);
        console.log(`   Message ID: ${firstMessage.message_id}`);
        console.log(`   Sender: ${firstMessage.account.name} (ID: ${firstMessage.account.account_id})`);
        console.log(`   Send time: ${new Date(firstMessage.send_time * 1000).toLocaleString()}`);

        // Test 7: Get specific message
        console.log('\n7. Getting specific message...');
        const specificMessage = await api.getMessage(firstRoom.room_id, firstMessage.message_id);
        console.log(`✅ Retrieved message: ${specificMessage.body.substring(0, 100)}...`);
        console.log(`   Full message length: ${specificMessage.body.length} characters`);

        // Test 8: Test URL parsing
        console.log('\n8. Testing URL parsing...');
        const testUrl = 'https://www.chatwork.com/#!rid368838329-2015782344493105152';
        const parsed = ChatworkAPI.parseMessageIdFromUrl(testUrl);
        if (parsed) {
          console.log(`✅ Parsed URL: Room ID ${parsed.roomId}, Message ID ${parsed.messageId}`);
        } else {
          console.log('❌ URL parsing failed');
        }

        // Test 9: Test message ID validation
        console.log('\n9. Testing message ID validation...');
        const isValid = ChatworkAPI.isValidMessageId(firstMessage.message_id);
        console.log(`✅ Message ID validation: ${isValid ? 'Valid' : 'Invalid'}`);

        // Test 10: Test room ID validation
        console.log('\n10. Testing room ID validation...');
        const isRoomValid = ChatworkAPI.isValidRoomId(firstRoom.room_id);
        console.log(`✅ Room ID validation: ${isRoomValid ? 'Valid' : 'Invalid'}`);

      } else {
        console.log('⚠️ No messages found in the first room');
      }
    } else {
      console.log('⚠️ No rooms found');
    }

    console.log('\n🎉 ChatworkAPI test completed successfully!');

  } catch (error) {
    console.error('\n❌ ChatworkAPI test failed:', error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    console.error('Stack trace:', error.stack);
  }
}

// Run tests
testChatworkAPI();
