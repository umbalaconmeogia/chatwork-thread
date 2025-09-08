// Desktop Application Main Script
class ChatworkThreadApp {
    constructor() {
        this.currentThread = null;
        this.selectedThread = null;
        this.savedThreads = [];
        this.isLoading = false;
        this.settings = {
            apiToken: '',
            autoSave: true,
            theme: 'light'
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Chatwork Thread Desktop App...');
        
        // Initialize UI elements
        this.initializeElements();
        
        // Setup event listeners
        this.bindEvents();
        
        // Load application data
        await this.loadSettings();
        await this.loadThreads();
        
        // Setup menu handlers
        this.setupMenuHandlers();
        
        // Load app version
        await this.loadAppVersion();
        
        console.log('Application initialized successfully');
    }
    
    initializeElements() {
        // Header elements
        this.appStatus = document.getElementById('app-status');
        this.settingsBtn = document.getElementById('settings-btn');
        this.refreshAllBtn = document.getElementById('refresh-all-btn');
        
        // Sidebar elements
        this.newThreadBtn = document.getElementById('new-thread-btn');
        this.threadList = document.getElementById('thread-list');
        this.threadsLoading = document.getElementById('threads-loading');
        this.threadsPlaceholder = document.getElementById('threads-placeholder');
        
        // Main panel elements
        this.threadDetails = document.getElementById('thread-details');
        this.currentThreadName = document.getElementById('current-thread-name');
        this.threadMessageCount = document.getElementById('thread-message-count');
        this.threadCreatedDate = document.getElementById('thread-created-date');
        this.editThreadBtn = document.getElementById('edit-thread-btn');
        this.deleteThreadBtn = document.getElementById('delete-thread-btn');
        
        // Messages elements
        this.messagesContainer = document.getElementById('messages-container');
        this.messagesPlaceholder = document.getElementById('messages-placeholder');
        this.messagesList = document.getElementById('messages-list');
        this.addMessageForm = document.getElementById('add-message-form');
        this.messageIdInput = document.getElementById('message-id-input');
        this.addMessageBtn = document.getElementById('add-message-btn');
        
        // Modal elements
        this.createThreadModal = document.getElementById('create-thread-modal');
        this.closeCreateModal = document.getElementById('close-create-modal');
        this.createThreadForm = document.getElementById('create-thread-form');
        this.threadNameInput = document.getElementById('thread-name');
        this.initialMessageIdInput = document.getElementById('initial-message-id');
        this.cancelCreateBtn = document.getElementById('cancel-create-btn');
        this.createThreadBtn = document.getElementById('create-thread-btn');
        
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsModalBtn = document.getElementById('close-settings-modal');
        this.apiTokenInput = document.getElementById('api-token');
        this.autoSaveCheckbox = document.getElementById('auto-save');
        this.themeSelect = document.getElementById('theme-select');
        this.cancelSettingsBtn = document.getElementById('cancel-settings-btn');
        this.saveSettingsBtn = document.getElementById('save-settings-btn');
        
        // Status bar elements
        this.statusMessage = document.getElementById('status-message');
        this.appVersion = document.getElementById('app-version');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
    }
    
    bindEvents() {
        // Header events
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.refreshAllBtn.addEventListener('click', () => this.refreshAllThreads());
        
        // Sidebar events
        this.newThreadBtn.addEventListener('click', () => this.openCreateThreadModal());
        
        // Thread details events
        this.editThreadBtn.addEventListener('click', () => this.editCurrentThread());
        this.deleteThreadBtn.addEventListener('click', () => this.deleteCurrentThread());
        
        // Add message events
        this.addMessageBtn.addEventListener('click', () => this.addMessage());
        this.messageIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addMessage();
            }
        });
        
        // Create thread modal events
        this.closeCreateModal.addEventListener('click', () => this.closeCreateThreadModal());
        this.cancelCreateBtn.addEventListener('click', () => this.closeCreateThreadModal());
        this.createThreadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createThread();
        });
        this.createThreadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.createThread();
        });
        
        // Settings modal events
        this.closeSettingsModalBtn.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        // Modal backdrop clicks
        this.createThreadModal.addEventListener('click', (e) => {
            if (e.target === this.createThreadModal) {
                this.closeCreateThreadModal();
            }
        });
        
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettingsModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.openCreateThreadModal();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshAllThreads();
                        break;
                    case ',':
                        e.preventDefault();
                        this.openSettingsModal();
                        break;
                }
            }
            
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    setupMenuHandlers() {
        if (window.electronAPI) {
            window.electronAPI.onMenuAction((event, action) => {
                switch (action) {
                    case 'menu-new-thread':
                        this.openCreateThreadModal();
                        break;
                    case 'menu-preferences':
                        this.openSettingsModal();
                        break;
                    case 'menu-help':
                        this.showHelp();
                        break;
                    case 'import-threads':
                        this.handleImportThreads(event.detail);
                        break;
                }
            });
        }
    }
    
    async loadAppVersion() {
        try {
            if (window.electronAPI) {
                const version = await window.electronAPI.app.getVersion();
                this.appVersion.textContent = `v${version}`;
            }
        } catch (error) {
            console.error('Error loading app version:', error);
        }
    }
    
    async loadSettings() {
        try {
            // In a real app, this would load from electron-store or database
            const saved = localStorage.getItem('chatwork-thread-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
            
            // Apply theme
            document.documentElement.setAttribute('data-theme', this.settings.theme);
            
            // Update UI
            this.updateAppStatus();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            // Get values from form
            this.settings.apiToken = this.apiTokenInput.value.trim();
            this.settings.autoSave = this.autoSaveCheckbox.checked;
            this.settings.theme = this.themeSelect.value;
            
            // Save to localStorage (in real app, use electron-store)
            localStorage.setItem('chatwork-thread-settings', JSON.stringify(this.settings));
            
            // Apply theme
            document.documentElement.setAttribute('data-theme', this.settings.theme);
            
            // Update UI
            this.updateAppStatus();
            this.closeSettingsModal();
            this.showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }
    
    updateAppStatus() {
        if (this.settings.apiToken) {
            this.appStatus.textContent = '✅';
            this.appStatus.title = 'API Token configured';
        } else {
            this.appStatus.textContent = '⚠️';
            this.appStatus.title = 'API Token not configured';
        }
    }
    
    async loadThreads() {
        try {
            this.setLoadingState(true);
            
            if (window.electronAPI) {
                const result = await window.electronAPI.database.getThreads();
                if (result.success) {
                    this.savedThreads = result.data;
                } else {
                    console.error('Error loading threads:', result.error);
                    this.showToast('Failed to load threads', 'error');
                }
            } else {
                // Fallback for development
                const saved = localStorage.getItem('chatwork-threads');
                this.savedThreads = saved ? JSON.parse(saved) : [];
            }
            
            this.displayThreads();
        } catch (error) {
            console.error('Error loading threads:', error);
            this.showToast('Failed to load threads', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    setLoadingState(loading) {
        if (loading) {
            this.threadsLoading.style.display = 'block';
            this.threadsPlaceholder.style.display = 'none';
        } else {
            this.threadsLoading.style.display = 'none';
            if (this.savedThreads.length === 0) {
                this.threadsPlaceholder.style.display = 'block';
            } else {
                this.threadsPlaceholder.style.display = 'none';
            }
        }
    }
    
    displayThreads() {
        if (this.savedThreads.length === 0) {
            this.threadList.innerHTML = '';
            this.threadsPlaceholder.style.display = 'block';
            return;
        }
        
        this.threadsPlaceholder.style.display = 'none';
        
        const threadsHtml = this.savedThreads.map((thread, index) => `
            <div class="thread-item" data-thread-index="${index}">
                <div class="thread-info">
                    <h3>${this.escapeHtml(thread.name || `Thread #${thread.id}`)}</h3>
                    <div class="thread-meta">
                        <span>${thread.message_count || 0} messages</span>
                        <span>${this.formatDate(thread.created_at)}</span>
                    </div>
                </div>
                <div class="thread-actions-mini">
                    <button class="thread-refresh-btn" data-thread-index="${index}" title="Refresh">⟳</button>
                </div>
            </div>
        `).join('');
        
        this.threadList.innerHTML = threadsHtml;
        
        // Bind events
        this.threadList.querySelectorAll('.thread-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('thread-refresh-btn')) return;
                
                const index = parseInt(item.dataset.threadIndex);
                this.selectThread(index);
            });
        });
        
        this.threadList.querySelectorAll('.thread-refresh-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.threadIndex);
                this.refreshThread(index);
            });
        });
    }
    
    async selectThread(index) {
        try {
            // Clear previous selection
            this.threadList.querySelectorAll('.thread-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select new thread
            const threadItem = this.threadList.querySelector(`[data-thread-index="${index}"]`);
            if (threadItem) {
                threadItem.classList.add('selected');
            }
            
            // Load full thread data
            const thread = this.savedThreads[index];
            if (window.electronAPI) {
                const result = await window.electronAPI.database.getThread(thread.id);
                if (result.success && result.data) {
                    this.selectedThread = result.data;
                } else {
                    this.selectedThread = thread;
                }
            } else {
                this.selectedThread = thread;
            }
            
            // Update UI
            this.displayThreadDetails();
            this.displayMessages();
            
            // Enable action buttons
            this.editThreadBtn.disabled = false;
            this.deleteThreadBtn.disabled = false;
            this.addMessageForm.style.display = 'block';
            
        } catch (error) {
            console.error('Error selecting thread:', error);
            this.showToast('Failed to load thread details', 'error');
        }
    }
    
    displayThreadDetails() {
        if (!this.selectedThread) return;
        
        this.currentThreadName.textContent = this.selectedThread.name || `Thread #${this.selectedThread.id}`;
        
        const messageCount = this.selectedThread.data?.messages?.length || 0;
        this.threadMessageCount.textContent = `${messageCount} messages`;
        
        if (this.selectedThread.created_at) {
            this.threadCreatedDate.textContent = this.formatDate(this.selectedThread.created_at);
        }
    }
    
    displayMessages() {
        if (!this.selectedThread || !this.selectedThread.data || !this.selectedThread.data.messages) {
            this.messagesPlaceholder.style.display = 'block';
            this.messagesList.innerHTML = '';
            return;
        }
        
        this.messagesPlaceholder.style.display = 'none';
        
        const messages = this.selectedThread.data.messages;
        const messagesHtml = messages.map((message, index) => `
            <div class="message-item" data-message-index="${index}">
                <div class="message-header">
                    <span class="message-sender">${this.escapeHtml(message.sender || 'Unknown')}</span>
                    <span class="message-time">${this.formatDateTime(message.timestamp)}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.content || '')}</div>
                <button class="message-delete-btn" data-message-index="${index}" title="Delete message">×</button>
            </div>
        `).join('');
        
        this.messagesList.innerHTML = messagesHtml;
        
        // Bind delete events
        this.messagesList.querySelectorAll('.message-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.messageIndex);
                this.deleteMessage(index);
            });
        });
    }
    
    async createThread() {
        try {
            const threadName = this.threadNameInput.value.trim();
            const messageId = this.initialMessageIdInput.value.trim();
            
            if (!threadName) {
                this.showToast('Please enter thread name', 'error');
                return;
            }
            
            if (!messageId) {
                this.showToast('Please enter message ID', 'error');
                return;
            }
            
            this.createThreadBtn.disabled = true;
            this.createThreadBtn.textContent = 'Creating...';
            
            // Create mock thread
            const thread = await this.createMockThread(messageId, threadName);
            
            // Save thread
            if (window.electronAPI) {
                const result = await window.electronAPI.database.saveThread(thread);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                // Fallback for development
                this.savedThreads.push(thread);
                localStorage.setItem('chatwork-threads', JSON.stringify(this.savedThreads));
            }
            
            // Refresh threads list
            await this.loadThreads();
            
            // Select new thread
            const newIndex = this.savedThreads.findIndex(t => t.id === thread.id);
            if (newIndex >= 0) {
                this.selectThread(newIndex);
            }
            
            this.closeCreateThreadModal();
            this.showToast('Thread created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating thread:', error);
            this.showToast('Failed to create thread: ' + error.message, 'error');
        } finally {
            this.createThreadBtn.disabled = false;
            this.createThreadBtn.textContent = 'Create Thread';
        }
    }
    
    async createMockThread(messageId, threadName) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            id: messageId,
            name: threadName,
            created_at: new Date().toISOString(),
            data: {
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
                ]
            }
        };
    }
    
    async addMessage() {
        try {
            const messageId = this.messageIdInput.value.trim();
            
            if (!messageId) {
                this.showToast('Please enter message ID', 'error');
                return;
            }
            
            if (!this.selectedThread) {
                this.showToast('Please select a thread first', 'error');
                return;
            }
            
            this.addMessageBtn.disabled = true;
            this.addMessageBtn.textContent = 'Adding...';
            
            // Create mock message
            const newMessage = await this.createMockMessage(messageId);
            
            // Add to thread
            if (!this.selectedThread.data.messages) {
                this.selectedThread.data.messages = [];
            }
            this.selectedThread.data.messages.push(newMessage);
            
            // Save thread
            if (window.electronAPI) {
                const result = await window.electronAPI.database.saveThread(this.selectedThread);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                // Update in savedThreads
                const index = this.savedThreads.findIndex(t => t.id === this.selectedThread.id);
                if (index >= 0) {
                    this.savedThreads[index] = this.selectedThread;
                    localStorage.setItem('chatwork-threads', JSON.stringify(this.savedThreads));
                }
            }
            
            // Update display
            this.displayMessages();
            this.displayThreadDetails();
            this.displayThreads();
            
            this.messageIdInput.value = '';
            this.showToast('Message added successfully', 'success');
            
        } catch (error) {
            console.error('Error adding message:', error);
            this.showToast('Failed to add message: ' + error.message, 'error');
        } finally {
            this.addMessageBtn.disabled = false;
            this.addMessageBtn.textContent = 'Add Message';
        }
    }
    
    async createMockMessage(messageId) {
        // Simulate API delay
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
    
    async deleteMessage(messageIndex) {
        try {
            if (!this.selectedThread || !this.selectedThread.data || !this.selectedThread.data.messages) {
                return;
            }
            
            if (messageIndex >= this.selectedThread.data.messages.length) {
                this.showToast('Message not found', 'error');
                return;
            }
            
            if (!confirm('このメッセージを削除しますか？')) {
                return;
            }
            
            // Remove message
            this.selectedThread.data.messages.splice(messageIndex, 1);
            
            // Save thread
            if (window.electronAPI) {
                const result = await window.electronAPI.database.saveThread(this.selectedThread);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                // Update in savedThreads
                const index = this.savedThreads.findIndex(t => t.id === this.selectedThread.id);
                if (index >= 0) {
                    this.savedThreads[index] = this.selectedThread;
                    localStorage.setItem('chatwork-threads', JSON.stringify(this.savedThreads));
                }
            }
            
            // Update display
            this.displayMessages();
            this.displayThreadDetails();
            this.displayThreads();
            
            this.showToast('Message deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showToast('Failed to delete message: ' + error.message, 'error');
        }
    }
    
    async deleteCurrentThread() {
        try {
            if (!this.selectedThread) {
                return;
            }
            
            if (!confirm(`Are you sure you want to delete "${this.selectedThread.name}"?`)) {
                return;
            }
            
            // Delete from database
            if (window.electronAPI) {
                const result = await window.electronAPI.database.deleteThread(this.selectedThread.id);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                // Remove from savedThreads
                this.savedThreads = this.savedThreads.filter(t => t.id !== this.selectedThread.id);
                localStorage.setItem('chatwork-threads', JSON.stringify(this.savedThreads));
            }
            
            // Clear selection
            this.selectedThread = null;
            this.currentThreadName.textContent = 'Select a thread';
            this.threadMessageCount.textContent = '0 messages';
            this.threadCreatedDate.textContent = '';
            this.editThreadBtn.disabled = true;
            this.deleteThreadBtn.disabled = true;
            this.addMessageForm.style.display = 'none';
            this.messagesPlaceholder.style.display = 'block';
            this.messagesList.innerHTML = '';
            
            // Refresh threads list
            await this.loadThreads();
            
            this.showToast('Thread deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting thread:', error);
            this.showToast('Failed to delete thread: ' + error.message, 'error');
        }
    }
    
    async refreshAllThreads() {
        this.setStatus('Refreshing threads...');
        await this.loadThreads();
        this.setStatus('Ready');
        this.showToast('Threads refreshed', 'success');
    }
    
    async refreshThread(index) {
        // Mock refresh
        this.showToast(`Refreshing thread ${index + 1}...`, 'info');
    }
    
    // Modal methods
    openCreateThreadModal() {
        this.createThreadModal.style.display = 'flex';
        this.threadNameInput.focus();
    }
    
    closeCreateThreadModal() {
        this.createThreadModal.style.display = 'none';
        this.threadNameInput.value = '';
        this.initialMessageIdInput.value = '';
    }
    
    openSettingsModal() {
        this.apiTokenInput.value = this.settings.apiToken;
        this.autoSaveCheckbox.checked = this.settings.autoSave;
        this.themeSelect.value = this.settings.theme;
        this.settingsModal.style.display = 'flex';
        this.apiTokenInput.focus();
    }
    
    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }
    
    closeAllModals() {
        this.closeCreateThreadModal();
        this.closeSettingsModal();
    }
    
    // Utility methods
    setStatus(message) {
        this.statusMessage.textContent = message;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP');
        } catch {
            return dateString;
        }
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP');
        } catch {
            return dateString;
        }
    }
    
    editCurrentThread() {
        if (this.selectedThread) {
            // Open edit modal (to be implemented)
            this.showToast('Edit functionality coming soon', 'info');
        }
    }
    
    showHelp() {
        this.showToast('Help documentation coming soon', 'info');
    }
    
    handleImportThreads(threads) {
        // Handle imported threads
        this.showToast(`Imported ${threads.length} threads`, 'success');
        this.loadThreads();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChatworkThreadApp();
    window.threadApp = app; // Expose globally for debugging
});

// Handle app updates and notifications
if (window.electronAPI) {
    // Additional Electron-specific initialization
    console.log('Running in Electron environment');
    console.log('Platform:', window.electronAPI.platform);
    console.log('Versions:', window.electronAPI.versions);
} else {
    console.log('Running in browser environment (development)');
}
