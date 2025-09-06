const { ConfigManager, ChatworkAPI, DatabaseManager, ThreadAnalyzer } = require('./dist/core/index.js');

console.log('🧵 Testing ThreadAnalyzer...\n');

async function testThreadAnalyzer() {
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

    // Test 4: Get rooms and messages
    console.log('\n4. Getting rooms and messages...');
    const rooms = await api.getRooms();
    if (rooms.length === 0) {
      console.log('⚠️ No rooms found');
      return;
    }

    const firstRoom = rooms[0];
    console.log(`✅ Found room: ${firstRoom.name} (ID: ${firstRoom.room_id})`);

    const messages = await api.getMessages(firstRoom.room_id);
    if (messages.length === 0) {
      console.log('⚠️ No messages found in room');
      return;
    }

    console.log(`✅ Found ${messages.length} messages`);

    // Test 5: Test thread analysis (use first message as root)
    console.log('\n5. Testing thread analysis...');
    const rootMessage = messages[0];
    console.log(`   Root message: ${rootMessage.body.substring(0, 100)}...`);
    console.log(`   Message ID: ${rootMessage.message_id}`);

    try {
      const analysisResult = await analyzer.analyzeAndCreateThread(
        firstRoom.room_id,
        rootMessage.message_id,
        'Test Thread'
      );

      console.log('✅ Thread analysis completed');
      console.log(`   Thread: ${analysisResult.thread.name} (ID: ${analysisResult.thread.id})`);
      console.log(`   Messages: ${analysisResult.messages.length}`);
      console.log(`   Analysis Score: ${analysisResult.analysisScore.toFixed(2)}`);
      console.log(`   Keywords: [${analysisResult.keywords.join(', ')}]`);
      console.log(`   Is Complete: ${analysisResult.isComplete}`);

      // Test 6: Test adding message to thread
      console.log('\n6. Testing add message to thread...');
      if (messages.length > 1) {
        const secondMessage = messages[1];
        const added = await analyzer.addMessageToThread(
          analysisResult.thread.id,
          firstRoom.room_id,
          secondMessage.message_id
        );
        console.log(`✅ Add message result: ${added}`);
      }

      // Test 7: Test removing message from thread
      console.log('\n7. Testing remove message from thread...');
      if (messages.length > 1) {
        const secondMessage = messages[1];
        const removed = analyzer.removeMessageFromThread(
          analysisResult.thread.id,
          secondMessage.message_id
        );
        console.log(`✅ Remove message result: ${removed}`);
      }

      // Test 8: Get thread messages
      console.log('\n8. Getting thread messages...');
      const threadMessages = db.getThreadMessages(analysisResult.thread.id);
      console.log(`✅ Thread has ${threadMessages.length} messages`);

      // Test 9: Get database stats
      console.log('\n9. Getting database stats...');
      const stats = db.getDatabaseStats();
      console.log(`✅ Database stats:`);
      console.log(`   Threads: ${stats.threads}`);
      console.log(`   Messages: ${stats.messages}`);
      console.log(`   Users: ${stats.users}`);

    } catch (error) {
      if (error.message.includes('already exists in thread')) {
        console.log('⚠️ Message already exists in thread (expected for testing)');
      } else {
        throw error;
      }
    }

    // Test 10: Close database
    console.log('\n10. Closing database...');
    db.close();
    console.log('✅ Database closed');

    console.log('\n🎉 ThreadAnalyzer test completed successfully!');

  } catch (error) {
    console.error('\n❌ ThreadAnalyzer test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests
testThreadAnalyzer();
