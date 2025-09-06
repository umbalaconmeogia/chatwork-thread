const { ConfigManager, ChatworkAPI, DatabaseManager, ThreadAnalyzer } = require('./dist/core/index.js');

console.log('🧵 Testing ThreadAnalyzer with specific message...\n');

async function testSpecificThread() {
  try {
    // Test 1: Initialize components
    console.log('1. Initializing components...');
    const configManager = ConfigManager.getInstance();
    const apiConfig = configManager.getChatworkAPIConfig();
    const dbPath = configManager.getDatabasePath();
    
    const api = new ChatworkAPI(apiConfig);
    const db = new DatabaseManager(dbPath);
    const analyzer = new ThreadAnalyzer(api, db);
    
    console.log('✅ Components initialized');

    // Test 2: Setup database
    console.log('\n2. Setting up database...');
    await db.setupMigrations();
    console.log('✅ Database setup completed');

    // Test 3: Test API connection
    console.log('\n3. Testing API connection...');
    const isConnected = await api.testConnection();
    if (!isConnected) {
      console.log('❌ API connection failed');
      return;
    }
    console.log('✅ API connection successful');

    // Test 4: Parse message ID from URL
    console.log('\n4. Parsing message ID from URL...');
    const chatworkUrl = 'https://www.chatwork.com/#!rid368838329-2015294412468527105';
    const parsed = ChatworkAPI.parseMessageIdFromUrl(chatworkUrl);
    const roomId = parsed.roomId;
    const messageId = parsed.messageId;
    
    console.log(`✅ Parsed - Room ID: ${roomId}, Message ID: ${messageId}`);

    // Test 5: Get the specific message
    console.log('\n5. Getting specific message...');
    try {
      const message = await api.getMessage(roomId, messageId);
      console.log(`✅ Message retrieved:`);
      console.log(`   ID: ${message.message_id}`);
      console.log(`   Body: ${message.body.substring(0, 200)}...`);
      console.log(`   Send time: ${new Date(message.send_time * 1000).toLocaleString()}`);
      console.log(`   Account: ${message.account.name}`);
    } catch (error) {
      console.log(`❌ Failed to get message: ${error.message}`);
      return;
    }

    // Test 6: Analyze and create thread
    console.log('\n6. Analyzing and creating thread...');
    try {
      const analysisResult = await analyzer.analyzeAndCreateThread(
        roomId,
        messageId,
        'Test Thread from Specific Message'
      );

      console.log('✅ Thread analysis completed');
      console.log(`   Thread: ${analysisResult.thread.name} (ID: ${analysisResult.thread.id})`);
      console.log(`   Messages: ${analysisResult.messages.length}`);
      console.log(`   Analysis Score: ${analysisResult.analysisScore.toFixed(2)}`);
      console.log(`   Keywords: [${analysisResult.keywords.join(', ')}]`);
      console.log(`   Is Complete: ${analysisResult.isComplete}`);

      // Show some related messages
      if (analysisResult.relatedMessages.length > 0) {
        console.log('\n   Related messages:');
        analysisResult.relatedMessages.slice(0, 3).forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.body.substring(0, 100)}...`);
        });
      }

    } catch (error) {
      if (error.message.includes('already exists in thread')) {
        console.log('⚠️ Message already exists in thread (expected for testing)');
      } else {
        console.log(`❌ Thread analysis failed: ${error.message}`);
        return;
      }
    }

    // Test 7: Get database stats
    console.log('\n7. Getting database stats...');
    const stats = db.getDatabaseStats();
    console.log(`✅ Database stats:`);
    console.log(`   Threads: ${stats.threads}`);
    console.log(`   Messages: ${stats.messages}`);
    console.log(`   Users: ${stats.users}`);

    // Test 8: Close database
    console.log('\n8. Closing database...');
    db.close();
    console.log('✅ Database closed');

    console.log('\n🎉 ThreadAnalyzer test with specific message completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests
testSpecificThread();
