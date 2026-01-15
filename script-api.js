// API Base URL - Automatically detects environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

// DOM Elements
const feedPage = document.getElementById('feedPage');
const postPage = document.getElementById('postPage');
const messageInput = document.getElementById('messageInput');
const anonymousNameInput = document.getElementById('anonymousName');
const categorySelect = document.getElementById('categorySelect');
const filterSelect = document.getElementById('filterSelect');
const postBtn = document.getElementById('postBtn');
const backBtn = document.getElementById('backBtn');
const addPostBtn = document.getElementById('addPostBtn');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const charCount = document.getElementById('charCount');
const messagesContainer = document.getElementById('messagesContainer');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const pullToRefresh = document.getElementById('pullToRefresh');

// Current filter
let currentFilter = 'all';

// Pull to refresh variables
let touchStartY = 0;
let touchEndY = 0;
let isRefreshing = false;

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('API Call:', url, options.method || 'GET');
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', endpoint, data);
        return data;
    } catch (error) {
        console.error('API call failed:', endpoint, error);
        throw error;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize background carousel
    initBackgroundCarousel();
    
    // Show feed page by default
    showFeedPage();
    
    // Load messages
    loadMessages();
    updateCharCount();
    
    // Event listeners
    messageInput.addEventListener('input', updateCharCount);
    categorySelect.addEventListener('change', updateCharCount);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            postMessage();
        }
    });
    postBtn.addEventListener('click', postMessage);
    backBtn.addEventListener('click', showFeedPage);
    addPostBtn.addEventListener('click', showPostPage);
    clearBtn.addEventListener('click', clearMessages);
    filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderMessages();
    });
    
    // Scroll to top button
    window.addEventListener('scroll', handleScroll);
    scrollToTopBtn.addEventListener('click', scrollToTop);
    
    // Pull to refresh
    setupPullToRefresh();
    
    // Cleanup expired messages periodically (every hour)
    setInterval(() => {
        cleanupExpiredMessages();
    }, 3600000);
});

/**
 * Initialize background carousel
 */
function initBackgroundCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;
    
    if (slides.length > 0) {
        slides[0].classList.add('active');
    }
    
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 6000);
}

/**
 * Show feed page
 */
function showFeedPage() {
    feedPage.classList.add('active');
    postPage.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show post page
 */
function showPostPage() {
    postPage.classList.add('active');
    feedPage.classList.remove('active');
    setTimeout(() => {
        messageInput.focus();
    }, 100);
}

/**
 * Handle scroll event
 */
function handleScroll() {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
}

/**
 * Scroll to top
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Setup pull to refresh
 */
function setupPullToRefresh() {
    let touchStart = 0;
    let touchMove = 0;
    
    feedPage.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0 && !isRefreshing) {
            touchStart = e.touches[0].clientY;
        }
    }, { passive: true });
    
    feedPage.addEventListener('touchmove', (e) => {
        if (touchStart > 0 && !isRefreshing) {
            touchMove = e.touches[0].clientY;
            const pullDistance = touchMove - touchStart;
            
            if (pullDistance > 0 && window.scrollY === 0) {
                e.preventDefault();
                if (pullDistance > 80) {
                    pullToRefresh.classList.add('active');
                    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Release to refresh';
                } else {
                    pullToRefresh.classList.add('active');
                    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Pull to refresh';
                }
            }
        }
    }, { passive: false });
    
    feedPage.addEventListener('touchend', () => {
        if (touchStart > 0 && !isRefreshing) {
            const pullDistance = touchMove - touchStart;
            
            if (pullDistance > 80 && window.scrollY === 0) {
                refreshMessages();
            } else {
                pullToRefresh.classList.remove('active');
            }
            
            touchStart = 0;
            touchMove = 0;
        }
    }, { passive: true });
}

/**
 * Refresh messages
 */
function refreshMessages() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Refreshing...';
    
    cleanupExpiredMessages().then(() => {
        loadMessages().then(() => {
            pullToRefresh.classList.remove('active');
            isRefreshing = false;
        });
    });
}

/**
 * Update character counter
 */
function updateCharCount() {
    if (!messageInput) return;
    
    const text = messageInput.value;
    const wordCount = countWords(text);
    
    charCount.textContent = wordCount;
    
    if (wordCount > 500) {
        charCount.style.color = '#e74c3c';
    } else if (wordCount > 450) {
        charCount.style.color = '#e74c3c';
    } else if (wordCount > 375) {
        charCount.style.color = '#f39c12';
    } else {
        charCount.style.color = '#ff6b9d';
    }
    
    const hasMessage = wordCount > 0 && wordCount <= 500;
    const hasCategory = categorySelect && categorySelect.value !== '';
    if (postBtn) {
        postBtn.disabled = !hasMessage || !hasCategory;
    }
    
    if (text.length > 4000) {
        const cursorPos = messageInput.selectionStart;
        messageInput.value = text.substring(0, 4000);
        setTimeout(() => {
            messageInput.setSelectionRange(Math.min(cursorPos, 4000), Math.min(cursorPos, 4000));
        }, 0);
    }
}

/**
 * Count words in text
 */
function countWords(text) {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
        return 'just now';
    } else if (minutes < 60) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (days < 7) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }
}

/**
 * Post a new message
 */
async function postMessage() {
    const messageText = messageInput.value.trim();
    const anonymousName = anonymousNameInput.value.trim() || 'Anonymous';
    const category = categorySelect.value;
    
    if (!messageText) {
        alert('Please enter a message.');
        return;
    }
    
    const wordCount = countWords(messageText);
    if (wordCount > 500) {
        alert(`Your message has ${wordCount} words. Maximum allowed is 500 words. Please shorten your message.`);
        return;
    }
    
    if (!category) {
        alert('Please select a category.');
        return;
    }
    
    try {
        console.log('📝 Posting message...');
        console.log('Message data:', { text: messageText.substring(0, 50) + '...', author: anonymousName, category });
        
        const result = await apiCall('/messages', {
            method: 'POST',
            body: JSON.stringify({
                text: messageText,
                author: anonymousName,
                category: category
            })
        });
        
        console.log('✅ Message posted successfully:', result);
        
        // Clear inputs
        messageInput.value = '';
        anonymousNameInput.value = '';
        categorySelect.value = '';
        updateCharCount();
        
        // Reset filter
        currentFilter = 'all';
        if (filterSelect) {
            filterSelect.value = 'all';
        }
        
        // Navigate to feed
        showFeedPage();
        
        // Force reload messages after a delay to ensure database is updated
        console.log('🔄 Reloading messages in 1 second...');
        setTimeout(async () => {
            await loadMessages();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1000);
    } catch (error) {
        console.error('❌ Error posting message:', error);
        const errorMsg = error.message || 'Unknown error';
        alert(`Failed to post message: ${errorMsg}\n\nCheck browser console (F12) for details.`);
    }
}

/**
 * Load messages from API
 */
async function loadMessages() {
    console.log('Loading messages...');
    try {
        await renderMessages();
        console.log('Messages loaded successfully');
    } catch (error) {
        console.error('Error loading messages:', error);
        // Show user-friendly error
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Failed to load messages. Please refresh the page.</div>';
        }
    }
}

/**
 * Render all messages
 */
async function renderMessages() {
    if (!messagesContainer) {
        console.error('❌ messagesContainer not found');
        return;
    }
    
    try {
        console.log('🔄 Fetching messages with filter:', currentFilter);
        const endpoint = currentFilter !== 'all' 
            ? `/messages?category=${encodeURIComponent(currentFilter)}`
            : '/messages';
        
        console.log('📡 Calling API:', `${API_BASE_URL}${endpoint}`);
        const messages = await apiCall(endpoint);
        console.log('✅ Received messages:', messages);
        console.log('📊 Message count:', messages ? messages.length : 0);
        
        messagesContainer.innerHTML = '';
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.log('ℹ️ No messages to display');
            if (emptyState) {
                emptyState.classList.remove('hidden');
                emptyState.querySelector('p').textContent = currentFilter === 'all' 
                    ? 'No messages yet. Be the first to post something!' 
                    : `No messages in ${currentFilter} category yet.`;
            }
        } else {
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
            
            console.log(`🎨 Rendering ${messages.length} messages`);
            for (const message of messages) {
                try {
                    const messageCard = await createMessageCard(message);
                    messagesContainer.appendChild(messageCard);
                } catch (error) {
                    console.error('Error creating message card:', error, message);
                }
            }
            console.log('✅ All messages rendered');
        }
    } catch (error) {
        console.error('❌ Error rendering messages:', error);
        console.error('Error details:', error.message, error.stack);
        
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').textContent = `Error loading messages: ${error.message}. Please refresh the page.`;
        }
        
        // Show detailed error to user
        const errorMsg = error.message || 'Unknown error';
        alert(`Failed to load messages: ${errorMsg}\n\nCheck browser console (F12) for details.`);
    }
}

/**
 * Create a message card element
 */
async function createMessageCard(message) {
    const card = document.createElement('div');
    card.className = 'message-card';
    
    // Message header
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const author = document.createElement('div');
    author.className = 'message-author';
    author.textContent = message.author || 'Anonymous';
    
    const category = document.createElement('div');
    category.className = 'message-category';
    category.textContent = message.category || 'Other';
    
    messageHeader.appendChild(author);
    messageHeader.appendChild(category);
    
    // Message text
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.text;
    
    // Message footer
    const messageFooter = document.createElement('div');
    messageFooter.className = 'message-footer';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = formatTimestamp(message.timestamp);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    // Like button
    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    
    try {
        const likesData = await apiCall(`/messages/${message.id}/likes`);
        const checkLike = await apiCall(`/messages/${message.id}/likes/check`);
        const isLiked = checkLike.liked;
        const likes = likesData.count || 0;
        
        if (isLiked) {
            likeBtn.classList.add('liked');
        }
        
        likeBtn.innerHTML = `
            <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
            <span class="like-count">${likes}</span>
        `;
        
        likeBtn.addEventListener('click', async () => {
            try {
                const result = await apiCall(`/messages/${message.id}/likes/toggle`, {
                    method: 'POST'
                });
                
                if (result.liked) {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('.like-icon').textContent = '❤️';
                } else {
                    likeBtn.classList.remove('liked');
                    likeBtn.querySelector('.like-icon').textContent = '🤍';
                }
                likeBtn.querySelector('.like-count').textContent = result.count;
            } catch (error) {
                console.error('Error toggling like:', error);
            }
        });
    } catch (error) {
        console.error('Error loading likes:', error);
        likeBtn.innerHTML = `
            <span class="like-icon">🤍</span>
            <span class="like-count">0</span>
        `;
    }
    
    // Comment button
    const commentBtn = document.createElement('button');
    commentBtn.className = 'comment-btn';
    
    try {
        const commentCountData = await apiCall(`/messages/${message.id}/comments/count`);
        const commentCount = commentCountData.count || 0;
        
        commentBtn.innerHTML = `
            <span class="comment-icon">💬</span>
            <span class="comment-count">${commentCount}</span>
        `;
    } catch (error) {
        console.error('Error loading comment count:', error);
        commentBtn.innerHTML = `
            <span class="comment-icon">💬</span>
            <span class="comment-count">0</span>
        `;
    }
    
    commentBtn.addEventListener('click', () => {
        toggleComments(card, message.id);
    });
    
    actionButtons.appendChild(likeBtn);
    actionButtons.appendChild(commentBtn);
    
    messageFooter.appendChild(timestamp);
    messageFooter.appendChild(actionButtons);
    
    // Comments section
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    commentsSection.id = `comments-${message.id}`;
    commentsSection.style.display = 'none';
    
    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'comments-container';
    commentsContainer.id = `comments-list-${message.id}`;
    commentsSection.appendChild(commentsContainer);
    
    // Comment form
    const commentForm = document.createElement('div');
    commentForm.className = 'comment-form';
    commentForm.innerHTML = `
        <input type="text" class="comment-name-input" placeholder="Your name (optional)" maxlength="20">
        <textarea class="comment-input" placeholder="Write a comment..." rows="2"></textarea>
        <div class="comment-form-footer">
            <button class="comment-submit-btn">Post Comment</button>
        </div>
    `;
    
    const commentSubmitBtn = commentForm.querySelector('.comment-submit-btn');
    const commentInput = commentForm.querySelector('.comment-input');
    const commentNameInput = commentForm.querySelector('.comment-name-input');
    
    commentSubmitBtn.addEventListener('click', async () => {
        const commentText = commentInput.value.trim();
        const commentAuthor = commentNameInput.value.trim() || 'Anonymous';
        
        if (commentText) {
            try {
                await apiCall(`/messages/${message.id}/comments`, {
                    method: 'POST',
                    body: JSON.stringify({
                        text: commentText,
                        author: commentAuthor
                    })
                });
                
                commentInput.value = '';
                commentNameInput.value = '';
                
                await renderComments(message.id, commentsContainer);
                
                const updatedCount = await apiCall(`/messages/${message.id}/comments/count`);
                commentBtn.querySelector('.comment-count').textContent = updatedCount.count;
            } catch (error) {
                console.error('Error posting comment:', error);
                alert('Failed to post comment. Please try again.');
            }
        }
    });
    
    commentsSection.appendChild(commentForm);
    card.appendChild(messageHeader);
    card.appendChild(messageText);
    card.appendChild(messageFooter);
    card.appendChild(commentsSection);
    
    return card;
}

/**
 * Toggle comments section
 */
function toggleComments(card, messageId) {
    const commentsSection = card.querySelector(`#comments-${messageId}`);
    if (!commentsSection) return;
    
    const isVisible = commentsSection.style.display !== 'none';
    commentsSection.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        const commentsContainer = commentsSection.querySelector('.comments-container');
        renderComments(messageId, commentsContainer);
        
        setTimeout(() => {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

/**
 * Render comments for a message
 */
async function renderComments(messageId, container) {
    try {
        const comments = await apiCall(`/messages/${messageId}/comments`);
        container.innerHTML = '';
        
        if (comments.length === 0) {
            const emptyComment = document.createElement('div');
            emptyComment.className = 'no-comments';
            emptyComment.textContent = 'No comments yet. Be the first to comment!';
            container.appendChild(emptyComment);
        } else {
            comments.forEach(comment => {
                const commentCard = createCommentCard(messageId, comment);
                container.appendChild(commentCard);
            });
        }
    } catch (error) {
        console.error('Error rendering comments:', error);
    }
}

/**
 * Create a comment card
 */
function createCommentCard(messageId, comment) {
    const commentCard = document.createElement('div');
    commentCard.className = 'comment-card';
    commentCard.id = `comment-${comment.id}`;
    
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';
    
    const commentAuthor = document.createElement('div');
    commentAuthor.className = 'comment-author';
    commentAuthor.textContent = comment.author || 'Anonymous';
    
    const commentTimestamp = document.createElement('div');
    commentTimestamp.className = 'comment-timestamp';
    commentTimestamp.textContent = formatTimestamp(comment.timestamp);
    
    commentHeader.appendChild(commentAuthor);
    commentHeader.appendChild(commentTimestamp);
    
    const commentText = document.createElement('div');
    commentText.className = 'comment-text';
    commentText.textContent = comment.text;
    
    const commentActions = document.createElement('div');
    commentActions.className = 'comment-actions';
    
    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn';
    replyBtn.textContent = 'Reply';
    replyBtn.addEventListener('click', () => {
        toggleReplyForm(messageId, comment.id, commentCard);
    });
    
    commentActions.appendChild(replyBtn);
    
    commentCard.appendChild(commentHeader);
    commentCard.appendChild(commentText);
    commentCard.appendChild(commentActions);
    
    // Render replies
    if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies-container';
        
        comment.replies.forEach(reply => {
            const replyCard = createReplyCard(reply);
            repliesContainer.appendChild(replyCard);
        });
        
        commentCard.appendChild(repliesContainer);
    }
    
    return commentCard;
}

/**
 * Create a reply card
 */
function createReplyCard(reply) {
    const replyCard = document.createElement('div');
    replyCard.className = 'reply-card';
    
    const replyHeader = document.createElement('div');
    replyHeader.className = 'comment-header';
    
    const replyAuthor = document.createElement('div');
    replyAuthor.className = 'comment-author';
    replyAuthor.textContent = reply.author || 'Anonymous';
    
    const replyTimestamp = document.createElement('div');
    replyTimestamp.className = 'comment-timestamp';
    replyTimestamp.textContent = formatTimestamp(reply.timestamp);
    
    replyHeader.appendChild(replyAuthor);
    replyHeader.appendChild(replyTimestamp);
    
    const replyText = document.createElement('div');
    replyText.className = 'comment-text';
    replyText.textContent = reply.text;
    
    replyCard.appendChild(replyHeader);
    replyCard.appendChild(replyText);
    
    return replyCard;
}

/**
 * Toggle reply form
 */
function toggleReplyForm(messageId, commentId, commentCard) {
    let existingForm = commentCard.querySelector('.reply-form');
    
    if (existingForm) {
        existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
    } else {
        const replyForm = document.createElement('div');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `
            <input type="text" class="reply-name-input" placeholder="Your name (optional)" maxlength="20">
            <textarea class="reply-input" placeholder="Write a reply..." rows="2"></textarea>
            <div class="reply-form-footer">
                <button class="reply-submit-btn">Post Reply</button>
                <button class="reply-cancel-btn">Cancel</button>
            </div>
        `;
        
        const replySubmitBtn = replyForm.querySelector('.reply-submit-btn');
        const replyInput = replyForm.querySelector('.reply-input');
        const replyNameInput = replyForm.querySelector('.reply-name-input');
        const replyCancelBtn = replyForm.querySelector('.reply-cancel-btn');
        
        replySubmitBtn.addEventListener('click', async () => {
            const replyText = replyInput.value.trim();
            const replyAuthor = replyNameInput.value.trim() || 'Anonymous';
            
            if (replyText) {
                try {
                    await apiCall(`/messages/${messageId}/comments`, {
                        method: 'POST',
                        body: JSON.stringify({
                            text: replyText,
                            author: replyAuthor,
                            parentId: commentId
                        })
                    });
                    
                    replyInput.value = '';
                    replyNameInput.value = '';
                    
                    const commentsSection = commentCard.closest('.comments-section');
                    const commentsContainer = commentsSection.querySelector('.comments-container');
                    await renderComments(messageId, commentsContainer);
                    
                    const commentBtn = commentsSection.closest('.message-card').querySelector('.comment-btn');
                    if (commentBtn) {
                        const updatedCount = await apiCall(`/messages/${messageId}/comments/count`);
                        commentBtn.querySelector('.comment-count').textContent = updatedCount.count;
                    }
                } catch (error) {
                    console.error('Error posting reply:', error);
                    alert('Failed to post reply. Please try again.');
                }
            }
        });
        
        replyCancelBtn.addEventListener('click', () => {
            replyForm.style.display = 'none';
        });
        
        const commentActions = commentCard.querySelector('.comment-actions');
        commentCard.insertBefore(replyForm, commentActions.nextSibling);
    }
}

/**
 * Clear all messages
 */
async function clearMessages() {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
        try {
            await apiCall('/messages', {
                method: 'DELETE'
            });
            
            currentFilter = 'all';
            if (filterSelect) {
                filterSelect.value = 'all';
            }
            await renderMessages();
        } catch (error) {
            console.error('Error clearing messages:', error);
            alert('Failed to clear messages. Please try again.');
        }
    }
}

/**
 * Cleanup expired messages
 */
async function cleanupExpiredMessages() {
    try {
        await apiCall('/cleanup', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error cleaning up messages:', error);
    }
}
