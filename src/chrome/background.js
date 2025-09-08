// Background Script for Chatwork Thread Tool
class ChatworkBackgroundScript {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('Chatwork Thread Tool: Background script loaded');
        
        // Listen for extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
        
        // Listen for messages from content script and side panel
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
        
        // Listen for action (toolbar button) clicks
        chrome.action.onClicked.addListener((tab) => {
            this.handleActionClick(tab);
        });
        
        // Set up side panel behavior
        this.setupSidePanel();
    }
    
    handleInstallation(details) {
        console.log('Extension installed:', details);
        
        if (details.reason === 'install') {
            // First time installation
            this.showWelcomeNotification();
        } else if (details.reason === 'update') {
            // Extension updated
            console.log('Extension updated to version:', chrome.runtime.getManifest().version);
        }
    }
    
    handleMessage(message, sender, sendResponse) {
        console.log('Background script received message:', message, 'from:', sender);
        
        switch (message.action) {
            case 'closeSidePanel':
                this.closeSidePanel(sender.tab?.id)
                    .then(() => {
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        console.error('Error closing side panel:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                break;
                
            case 'getStorageData':
                this.getStorageData(message.keys)
                    .then(data => {
                        sendResponse({ success: true, data });
                    })
                    .catch(error => {
                        console.error('Error getting storage data:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                break;
                
            case 'setStorageData':
                this.setStorageData(message.data)
                    .then(() => {
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        console.error('Error setting storage data:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action: ' + message.action });
        }
    }
    
    async handleActionClick(tab) {
        console.log('Extension action clicked for tab:', tab);
        
        // Open side panel directly (works from any page)
        try {
            await chrome.sidePanel.open({ tabId: tab.id });
            console.log('Side panel opened from action click');
        } catch (error) {
            console.error('Error opening side panel from action:', error);
            this.showNotification(
                'Chatwork Thread Tool',
                'サイドパネルを開けませんでした。',
                'error'
            );
        }
    }
    
    setupSidePanel() {
        // Enable side panel for all pages
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            await chrome.sidePanel.setOptions({
                tabId: activeInfo.tabId,
                path: 'sidepanel.html',
                enabled: true
            });
        });
        
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                await chrome.sidePanel.setOptions({
                    tabId: tabId,
                    path: 'sidepanel.html',
                    enabled: true
                });
            }
        });
    }
    
    async openSidePanel(tabId) {
        try {
            if (tabId) {
                await chrome.sidePanel.open({ tabId });
                console.log('Side panel opened for tab:', tabId);
            } else {
                // Open for current active tab
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab) {
                    await chrome.sidePanel.open({ tabId: activeTab.id });
                    console.log('Side panel opened for active tab:', activeTab.id);
                }
            }
        } catch (error) {
            console.error('Error opening side panel:', error);
            throw error;
        }
    }
    
    async closeSidePanel(tabId) {
        try {
            // Note: Chrome doesn't have a direct API to close side panel
            // This is handled by the panel itself
            console.log('Side panel close requested for tab:', tabId);
        } catch (error) {
            console.error('Error closing side panel:', error);
            throw error;
        }
    }
    
    async getStorageData(keys) {
        try {
            if (keys) {
                return await chrome.storage.local.get(keys);
            } else {
                return await chrome.storage.local.get();
            }
        } catch (error) {
            console.error('Error getting storage data:', error);
            throw error;
        }
    }
    
    async setStorageData(data) {
        try {
            await chrome.storage.local.set(data);
            console.log('Storage data set:', Object.keys(data));
        } catch (error) {
            console.error('Error setting storage data:', error);
            throw error;
        }
    }
    
    isChatworkPage(url) {
        if (!url) return false;
        return url.includes('chatwork.com');
    }
    
    showWelcomeNotification() {
        this.showNotification(
            'Chatwork Thread Tool',
            'インストールありがとうございます！Chatworkページでご利用ください。',
            'info'
        );
    }
    
    showNotification(title, message, type = 'info') {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message
            });
        } else {
            console.log(`Notification: ${title} - ${message}`);
        }
    }
}

// Initialize background script
new ChatworkBackgroundScript();
