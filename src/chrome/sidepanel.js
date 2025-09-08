// Side Panel JavaScript
class ChatworkThreadPanel {
    constructor() {
        this.currentThread = null;
        this.selectedThread = null;
        this.savedThreads = [];
        this.isLoading = false;
        this.apiToken = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedThreads();
        this.loadApiToken();
    }
    
    initializeElements() {
        // New layout elements
        this.threadNameInput = document.getElementById('thread-name-input');
        this.createMessageInput = document.getElementById('create-message-input');
        this.createThreadBtn = document.getElementById('create-thread-btn');
        this.addMessageInput = document.getElementById('add-message-input');
        this.addMessageBtn = document.getElementById('add-message-btn');
        this.savedThreadsContainer = document.getElementById('saved-threads');
        this.threadMessagesContainer = document.getElementById('thread-messages');
        this.currentThreadName = document.getElementById('current-thread-name');
        this.refreshAllBtn = document.getElementById('refresh-all-btn');
        this.toggleBtn = document.getElementById('toggle-panel');
    }
    
    bindEvents() {
        this.createThreadBtn.addEventListener('click', () => this.createThread());
        this.addMessageBtn.addEventListener('click', () => this.addMessage());
        this.refreshAllBtn.addEventListener('click', () => this.refreshAllThreads());
        this.toggleBtn.addEventListener('click', () => this.togglePanel());
        
        // Enter key handlers
        this.threadNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createThread();
            }
        });
        
        this.createMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createThread();
            }
        });
        
        this.addMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addMessage();
            }
        });
    }
    
    async loadApiToken() {
        try {
            const result = await chrome.storage.local.get(['chatworkApiToken']);
            this.apiToken = result.chatworkApiToken || null;
            this.updateApiStatus();
        } catch (error) {
            console.error('Error loading API token:', error);
        }
    }
    
    updateApiStatus() {
        // Show API status in header or somewhere visible
        const header = document.querySelector('.panel-header h1');
        if (this.apiToken) {
            header.textContent = 'Chatwork Thread Tool ✅';
            header.title = 'API Token configured';
        } else {
            header.textContent = 'Chatwork Thread Tool ⚠️';
            header.title = 'API Token not configured. Click extension icon → API設定';
        }
    }
    
    async createThread() {
        const threadName = this.threadNameInput.value.trim();
        const messageId = this.createMessageInput.value.trim();
        
        if (!threadName) {
            this.showError('Vui lòng nhập tên thread');
            return;
        }
        
        if (!messageId) {
            this.showError('Vui lòng nhập Message ID');
            return;
        }
        
        if (this.isLoading) {
            return;
        }
        
        this.setLoading(true);
        
        try {
            // Create thread directly (mock implementation)
            const thread = await this.createMockThread(messageId, threadName);
            
            // Add thread to saved threads
            this.savedThreads.push(thread);
            await this.saveThreads();
            
            // Update UI
            this.displaySavedThreads();
            this.selectThread(this.savedThreads.length - 1); // Select newly created thread
            
            this.showSuccess('Thread đã được tạo thành công!');
            this.threadNameInput.value = ''; // Clear thread name input
            this.createMessageInput.value = ''; // Clear message ID input
            
        } catch (error) {
            console.error('Error creating thread:', error);
            this.showError('Lỗi khi tạo thread: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }
    
    async createMockThread(messageId, threadName) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            id: messageId,
            name: threadName,
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
    }
    
    async addMessage() {
        const messageId = this.addMessageInput.value.trim();
        
        if (!messageId) {
            this.showError('Vui lòng nhập Message ID');
            return;
        }
        
        if (!this.selectedThread) {
            this.showError('Vui lòng chọn thread trước');
            return;
        }
        
        if (this.isLoading) {
            return;
        }
        
        // Temporarily disable button and show loading
        this.addMessageBtn.disabled = true;
        this.addMessageBtn.textContent = 'Đang thêm...';
        
        try {
            // Create mock message
            const newMessage = await this.createMockMessage(messageId);
            
            // Add to selected thread
            this.selectedThread.messages.push(newMessage);
            
            // Update display
            this.displayMessages(this.selectedThread.messages);
            
            // Save threads to storage
            await this.saveThreads();
            
            // Update thread list (to show new message count)
            this.displaySavedThreads();
            
            this.showSuccess('Message đã được thêm vào thread!');
            this.addMessageInput.value = '';
            
        } catch (error) {
            console.error('Error adding message:', error);
            this.showError('Lỗi khi thêm message: ' + error.message);
        } finally {
            // Re-enable button
            this.addMessageBtn.disabled = false;
            this.addMessageBtn.textContent = 'Thêm vào Thread';
        }
    }
    
    async createMockMessage(messageId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockContents = [
            'これは追加されたメッセージです。',
            '[返信] ありがとうございます。',
            '[引用] 了解しました。',
            'この件について確認します。',
            '資料を添付しました。',
            'ミーティングの時間を変更お願いします。',
            '進捗はいかがですか？',
            'レビューをお願いします。'
        ];
        
        const mockSenders = [
            'ユーザーA', 'ユーザーB', 'ユーザーC', 
            '田中さん', '佐藤さん', '鈴木さん',
            'プロジェクトマネージャー', 'デザイナー'
        ];
        
        return {
            id: messageId,
            content: mockContents[Math.floor(Math.random() * mockContents.length)],
            sender: mockSenders[Math.floor(Math.random() * mockSenders.length)],
            timestamp: new Date().toISOString()
        };
    }
    
    async refreshAllThreads() {
        this.showSuccess('Đang refresh tất cả threads...');
        await this.loadSavedThreads();
    }
    
    selectThread(threadIndex) {
        // Deselect previous thread
        document.querySelectorAll('.thread-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select new thread
        this.selectedThread = this.savedThreads[threadIndex];
        const threadElement = document.querySelector(`[data-thread-index="${threadIndex}"]`);
        if (threadElement) {
            threadElement.classList.add('selected');
        }
        
        // Update UI
        this.currentThreadName.textContent = this.selectedThread.name || `Thread ${this.selectedThread.id}`;
        this.displayMessages(this.selectedThread.messages);
        this.addMessageBtn.disabled = false;
    }
    
    displayMessages(messages) {
        if (!messages || messages.length === 0) {
            this.threadMessagesContainer.innerHTML = '<p class="placeholder">Thread này chưa có message nào</p>';
            return;
        }
        
        const messagesHtml = messages.map((message, index) => `
            <div class="message-item" data-message-index="${index}">
                <div class="message-header">
                    <span class="message-sender">${this.escapeHtml(message.sender || 'Unknown')}</span>
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.content || '')}</div>
                <button class="message-delete-btn" data-message-index="${index}" title="削除">×</button>
            </div>
        `).join('');
        
        this.threadMessagesContainer.innerHTML = messagesHtml;
        
        // Bind delete button events after HTML is inserted
        this.bindMessageDeleteEvents();
    }
    
    bindMessageDeleteEvents() {
        const deleteButtons = this.threadMessagesContainer.querySelectorAll('.message-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const messageIndex = parseInt(button.getAttribute('data-message-index'));
                console.log('Delete button clicked for message index:', messageIndex);
                this.deleteMessage(messageIndex);
            });
        });
    }
    
    deleteMessage(messageIndex) {
        console.log('deleteMessage called with index:', messageIndex);
        console.log('selectedThread:', this.selectedThread);
        
        if (!this.selectedThread) {
            console.error('No selected thread');
            this.showError('Không có thread nào được chọn');
            return;
        }
        
        if (!this.selectedThread.messages || messageIndex >= this.selectedThread.messages.length) {
            console.error('Invalid message index:', messageIndex);
            this.showError('Message không tồn tại');
            return;
        }
        
        if (confirm('このメッセージを削除しますか？')) {
            console.log('User confirmed deletion');
            
            // Remove message from selected thread
            this.selectedThread.messages.splice(messageIndex, 1);
            console.log('Message removed, remaining messages:', this.selectedThread.messages.length);
            
            // Update the corresponding thread in savedThreads array
            const threadIndex = this.savedThreads.findIndex(t => t.id === this.selectedThread.id);
            if (threadIndex >= 0) {
                this.savedThreads[threadIndex] = this.selectedThread;
            }
            
            // Update display
            this.displayMessages(this.selectedThread.messages);
            this.displaySavedThreads(); // Update thread list to show new message count
            
            // Save to storage
            this.saveThreads();
            this.showSuccess('Message đã được xóa');
        }
    }
    
    
    async loadSavedThreads() {
        try {
            const result = await chrome.storage.local.get(['savedThreads']);
            this.savedThreads = result.savedThreads || [];
            this.displaySavedThreads();
        } catch (error) {
            console.error('Error loading saved threads:', error);
        }
    }
    
    displaySavedThreads() {
        if (this.savedThreads.length === 0) {
            this.savedThreadsContainer.innerHTML = '<p class="placeholder">Chưa có thread nào được lưu</p>';
            return;
        }
        
        const threadsHtml = this.savedThreads.map((thread, index) => `
            <div class="thread-item" data-thread-index="${index}">
                <div class="thread-info">
                    <h4>${thread.name || `Thread #${thread.id}`}</h4>
                    <p>${thread.messages ? thread.messages.length : 0} messages - ${this.formatTime(thread.createdAt)}</p>
                </div>
                <div class="thread-actions">
                    <button class="thread-refresh-btn" data-thread-index="${index}" title="Refresh">⟳</button>
                </div>
            </div>
        `).join('');
        
        this.savedThreadsContainer.innerHTML = threadsHtml;
        
        // Bind click events for saved threads
        this.savedThreadsContainer.querySelectorAll('.thread-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't select if clicking on refresh button
                if (e.target.classList.contains('thread-refresh-btn')) return;
                
                const index = parseInt(item.dataset.threadIndex);
                this.selectThread(index);
            });
        });
        
        // Bind refresh button events
        this.savedThreadsContainer.querySelectorAll('.thread-refresh-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const threadIndex = parseInt(button.getAttribute('data-thread-index'));
                this.refreshThread(threadIndex);
            });
        });
    }
    
    refreshThread(threadIndex) {
        this.showSuccess(`Refreshing thread ${threadIndex + 1}...`);
        // Mock refresh - in real implementation, would re-fetch from API
    }
    
    async saveThreads() {
        try {
            await chrome.storage.local.set({ savedThreads: this.savedThreads });
        } catch (error) {
            console.error('Error saving threads:', error);
        }
    }
    
    
    async saveCurrentThread() {
        if (!this.currentThread) {
            this.showError('Không có thread nào để lưu');
            return;
        }
        
        try {
            this.savedThreads.push({
                ...this.currentThread,
                createdAt: new Date().toISOString()
            });
            
            await chrome.storage.local.set({ savedThreads: this.savedThreads });
            this.displaySavedThreads();
            this.showSuccess('Thread đã được lưu!');
        } catch (error) {
            console.error('Error saving thread:', error);
            this.showError('Không thể lưu thread: ' + error.message);
        }
    }
    
    async sendMessageToContentScript(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                } else {
                    reject(new Error('Không tìm thấy tab active'));
                }
            });
        });
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.createThreadBtn.disabled = loading;
        
        if (loading) {
            this.createThreadBtn.textContent = 'Đang xử lý...';
            // Show loading in thread messages area if no thread selected
            if (!this.selectedThread) {
                this.threadMessagesContainer.innerHTML = '<div class="loading">Đang tạo thread...</div>';
            }
        } else {
            this.createThreadBtn.textContent = 'Tạo Thread';
        }
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = type;
        messageEl.textContent = message;
        
        // Insert after controls section
        const controlsSection = document.querySelector('.controls-section');
        controlsSection.insertAdjacentElement('afterend', messageEl);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }
    
    togglePanel() {
        // This will be handled by the browser's side panel API
        window.close();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid time';
        }
    }
}

// Initialize the panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const panel = new ChatworkThreadPanel();
    window.threadPanel = panel; // Expose globally for onclick handlers
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Side panel received message:', message);
    
    if (message.action === 'threadCreated') {
        // Handle thread creation notification
        const panel = window.threadPanel;
        if (panel) {
            panel.savedThreads.push(message.thread);
            panel.saveThreads();
            panel.displaySavedThreads();
            panel.selectThread(panel.savedThreads.length - 1);
        }
    } else if (message.action === 'tokenUpdated') {
        // Handle API token update
        const panel = window.threadPanel;
        if (panel) {
            panel.apiToken = message.token;
            panel.updateApiStatus();
        }
    }
    
    sendResponse({ received: true });
});
