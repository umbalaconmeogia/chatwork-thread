// Content Script for Chatwork Thread Tool
class ChatworkContentScript {
    constructor() {
        this.isInitialized = false;
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        this.isInitialized = true;
    }
    
    setup() {
        console.log('Chatwork Thread Tool: Content script loaded');
        
        // Listen for messages from side panel
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
        
        // Content script is now mainly for API communication
        console.log('Thread Tool ready for API calls');
    }
    
    
    handleMessage(message, sender, sendResponse) {
        console.log('Content script received message:', message);
        
        switch (message.action) {
            case 'createThread':
                this.createThreadFromMessageId(message.messageId)
                    .then(thread => {
                        sendResponse({ success: true, thread });
                    })
                    .catch(error => {
                        console.error('Error creating thread:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                break;
                
            case 'getPageInfo':
                sendResponse({
                    success: true,
                    url: window.location.href,
                    title: document.title
                });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }
    
    async createThreadFromMessageId(messageId) {
        console.log('Creating thread for message ID:', messageId);
        
        // Mock implementation - independent of current page
        return new Promise((resolve) => {
            // Simulate API call delay
            setTimeout(() => {
                const mockThread = {
                    id: messageId,
                    name: `Thread từ Message ${messageId}`,
                    messages: [
                        {
                            id: messageId,
                            content: 'これはテストメッセージです。Thread toolのテストです。',
                            sender: 'テストユーザー',
                            timestamp: new Date().toISOString()
                        },
                        {
                            id: messageId + '_reply1',
                            content: '[返信] 了解しました。このツールは便利ですね。',
                            sender: 'ユーザー2',
                            timestamp: new Date(Date.now() + 60000).toISOString()
                        },
                        {
                            id: messageId + '_reply2',
                            content: '[引用] そうですね。スレッド管理が楽になります。',
                            sender: 'ユーザー3', 
                            timestamp: new Date(Date.now() + 120000).toISOString()
                        }
                    ],
                    createdAt: new Date().toISOString()
                };
                
                resolve(mockThread);
            }, 1000);
        });
    }
}

// Initialize content script
new ChatworkContentScript();
