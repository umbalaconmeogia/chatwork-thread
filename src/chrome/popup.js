// Popup JavaScript for Chatwork Thread Tool
class ThreadToolPopup {
    constructor() {
        this.currentTab = null;
        this.init();
    }
    
    async init() {
        await this.getCurrentTab();
        this.setupElements();
        this.bindEvents();
        this.updateStatus();
    }
    
    async getCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tabs[0];
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }
    
    setupElements() {
        this.openPanelBtn = document.getElementById('open-panel-btn');
        this.configBtn = document.getElementById('config-btn');
        this.reloadBtn = document.getElementById('reload-btn');
        this.statusEl = document.getElementById('status');
        
        // Modal elements
        this.configModal = document.getElementById('config-modal');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.saveTokenBtn = document.getElementById('save-token-btn');
        this.apiTokenInput = document.getElementById('api-token');
    }
    
    bindEvents() {
        this.openPanelBtn.addEventListener('click', () => this.openSidePanel());
        this.configBtn.addEventListener('click', () => this.openConfigModal());
        this.reloadBtn.addEventListener('click', () => this.reloadCurrentTab());
        
        // Modal events
        this.closeModalBtn.addEventListener('click', () => this.closeConfigModal());
        this.cancelBtn.addEventListener('click', () => this.closeConfigModal());
        this.saveTokenBtn.addEventListener('click', () => this.saveApiToken());
        
        // Close modal when clicking outside
        this.configModal.addEventListener('click', (e) => {
            if (e.target === this.configModal) {
                this.closeConfigModal();
            }
        });
        
        // Handle Enter key in token input
        this.apiTokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiToken();
            }
        });
    }
    
    async openSidePanel() {
        try {
            this.showStatus('サイドパネルを開いています...', 'info');
            
            // Open side panel directly from popup (required in Manifest V3)
            if (this.currentTab) {
                await chrome.sidePanel.open({ tabId: this.currentTab.id });
                this.showStatus('サイドパネルが開きました', 'success');
                // Close popup after a short delay
                setTimeout(() => window.close(), 1000);
            } else {
                this.showStatus('エラー: タブが見つかりません', 'error');
            }
        } catch (error) {
            console.error('Error opening side panel:', error);
            this.showStatus('エラー: ' + error.message, 'error');
        }
    }
    
    async reloadCurrentTab() {
        try {
            if (this.currentTab) {
                await chrome.tabs.reload(this.currentTab.id);
                this.showStatus('ページをリロードしました', 'success');
                setTimeout(() => window.close(), 1000);
            }
        } catch (error) {
            console.error('Error reloading tab:', error);
            this.showStatus('エラー: ' + error.message, 'error');
        }
    }
    
    isChatworkPage() {
        return this.currentTab && this.currentTab.url && this.currentTab.url.includes('chatwork.com');
    }
    
    async openConfigModal() {
        try {
            // Load existing token
            const result = await chrome.storage.local.get(['chatworkApiToken']);
            if (result.chatworkApiToken) {
                this.apiTokenInput.value = result.chatworkApiToken;
            }
            
            this.configModal.style.display = 'flex';
            this.apiTokenInput.focus();
        } catch (error) {
            console.error('Error opening config modal:', error);
            this.showStatus('設定を開けませんでした', 'error');
        }
    }
    
    closeConfigModal() {
        this.configModal.style.display = 'none';
        this.apiTokenInput.value = '';
    }
    
    async saveApiToken() {
        try {
            const token = this.apiTokenInput.value.trim();
            
            if (!token) {
                this.showStatus('APIトークンを入力してください', 'error');
                return;
            }
            
            // Validate token format (basic check)
            if (token.length < 20) {
                this.showStatus('無効なAPIトークンです', 'error');
                return;
            }
            
            // Save token to storage
            await chrome.storage.local.set({ chatworkApiToken: token });
            
            this.showStatus('APIトークンを保存しました', 'success');
            this.closeConfigModal();
            
            // Notify side panel about token update
            try {
                chrome.runtime.sendMessage({ 
                    action: 'tokenUpdated',
                    token: token 
                });
            } catch (e) {
                // Side panel might not be open, that's ok
            }
            
        } catch (error) {
            console.error('Error saving API token:', error);
            this.showStatus('トークンの保存に失敗しました', 'error');
        }
    }
    
    updateStatus() {
        this.showStatus('Thread Tool準備完了', 'success');
        this.openPanelBtn.disabled = false;
        
        // Check if API token is configured
        this.checkApiTokenStatus();
    }
    
    async checkApiTokenStatus() {
        try {
            const result = await chrome.storage.local.get(['chatworkApiToken']);
            if (result.chatworkApiToken) {
                this.configBtn.textContent = 'API設定済み';
                this.configBtn.style.background = 'rgba(40, 167, 69, 0.2)';
            } else {
                this.configBtn.textContent = 'API設定';
                this.configBtn.style.background = '';
            }
        } catch (error) {
            console.error('Error checking API token status:', error);
        }
    }
    
    showStatus(message, type = 'info') {
        this.statusEl.textContent = message;
        this.statusEl.className = 'status ' + type;
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ThreadToolPopup();
});
