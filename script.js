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

// LocalStorage keys
const STORAGE_KEY = 'gaPodMessages';
const LIKES_KEY = 'gaPodLikes';
const COMMENTS_KEY = 'gaPodComments';

// Current filter
let currentFilter = 'all';

// Pull to refresh variables
let touchStartY = 0;
let touchEndY = 0;
let isRefreshing = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize background carousel
    initBackgroundCarousel();
    
    // Show feed page by default
    showFeedPage();
    
    // Remove expired messages on load
    removeExpiredMessages();
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
    
    // Check for expired messages periodically (every hour)
    setInterval(() => {
        removeExpiredMessages();
        renderMessages();
    }, 3600000); // 1 hour in milliseconds
});

/**
 * Initialize background carousel
 */
function initBackgroundCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;
    
    // Set first slide as active
    if (slides.length > 0) {
        slides[0].classList.add('active');
    }
    
    // Auto-rotate carousel every 6 seconds
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 6000); // Change image every 6 seconds
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
    // Focus on message input when opening post page
    setTimeout(() => {
        messageInput.focus();
    }, 100);
}

/**
 * Handle scroll event to show/hide scroll to top button
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
 * Setup pull to refresh functionality
 */
function setupPullToRefresh() {
    let touchStart = 0;
    let touchMove = 0;
    
    // Touch events
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
    
    // Mouse events for desktop
    let mouseStart = 0;
    let mouseMove = 0;
    let isMouseDown = false;
    
    feedPage.addEventListener('mousedown', (e) => {
        // Only trigger if at top of page and not clicking on interactive elements
        if (window.scrollY === 0 && !isRefreshing && 
            e.target.tagName !== 'BUTTON' && 
            e.target.tagName !== 'SELECT' && 
            e.target.tagName !== 'INPUT' && 
            e.target.tagName !== 'TEXTAREA' &&
            !e.target.closest('button') &&
            !e.target.closest('select')) {
            mouseStart = e.clientY;
            isMouseDown = true;
        }
    });
    
    feedPage.addEventListener('mousemove', (e) => {
        if (isMouseDown && !isRefreshing) {
            mouseMove = e.clientY;
            const pullDistance = mouseMove - mouseStart;
            
            if (pullDistance > 0 && window.scrollY === 0) {
                if (pullDistance > 80) {
                    pullToRefresh.classList.add('active');
                    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Release to refresh';
                } else {
                    pullToRefresh.classList.add('active');
                    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Pull to refresh';
                }
            }
        }
    });
    
    feedPage.addEventListener('mouseup', () => {
        if (isMouseDown && !isRefreshing) {
            const pullDistance = mouseMove - mouseStart;
            
            if (pullDistance > 80 && window.scrollY === 0) {
                refreshMessages();
            } else {
                pullToRefresh.classList.remove('active');
            }
            
            isMouseDown = false;
            mouseStart = 0;
            mouseMove = 0;
        }
    });
    
    feedPage.addEventListener('mouseleave', () => {
        if (isMouseDown) {
            pullToRefresh.classList.remove('active');
            isMouseDown = false;
            mouseStart = 0;
            mouseMove = 0;
        }
    });
}

/**
 * Refresh messages
 */
function refreshMessages() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    pullToRefresh.querySelector('.pull-to-refresh-text').textContent = 'Refreshing...';
    
    // Remove expired messages and reload
    removeExpiredMessages();
    
    // Simulate refresh delay
    setTimeout(() => {
        loadMessages();
        pullToRefresh.classList.remove('active');
        isRefreshing = false;
    }, 500);
}

/**
 * Count words in text (handles multiple spaces, newlines, etc.)
 */
function countWords(text) {
    if (!text || text.trim().length === 0) return 0;
    // Split by whitespace and filter out empty strings
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Update word counter
 */
function updateCharCount() {
    if (!messageInput) return;
    
    const text = messageInput.value;
    const wordCount = countWords(text);
    
    // Update display to show word count
    charCount.textContent = wordCount;
    
    // Update color based on word count (500 words max)
    if (wordCount > 500) {
        charCount.style.color = '#e74c3c';
    } else if (wordCount > 450) {
        charCount.style.color = '#e74c3c';
    } else if (wordCount > 375) {
        charCount.style.color = '#f39c12';
    } else {
        charCount.style.color = '#ff6b9d';
    }
    
    // Enable/disable post button based on word count and category
    const hasMessage = wordCount > 0 && wordCount <= 500;
    const hasCategory = categorySelect && categorySelect.value !== '';
    if (postBtn) {
        postBtn.disabled = !hasMessage || !hasCategory;
    }
    
    // Prevent typing beyond reasonable character limit (safety check)
    // Allow up to 4000 characters to accommodate 500 words with long words
    if (text.length > 4000) {
        const cursorPos = messageInput.selectionStart;
        messageInput.value = text.substring(0, 4000);
        // Restore cursor position
        setTimeout(() => {
            messageInput.setSelectionRange(Math.min(cursorPos, 4000), Math.min(cursorPos, 4000));
        }, 0);
    }
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Formatted relative time string
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
        // For older messages, show actual date
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
function postMessage() {
    const messageText = messageInput.value.trim();
    const anonymousName = anonymousNameInput.value.trim() || 'Anonymous';
    const category = categorySelect.value;
    
    // Validation
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
    
    // Create message object
    const message = {
        id: Date.now(),
        text: messageText,
        author: anonymousName,
        category: category,
        timestamp: Date.now(),
        likes: 0
    };
    
    // Get existing messages from LocalStorage
    const messages = getMessages();
    
    // Add new message at the beginning (newest first)
    messages.unshift(message);
    
    // Save to LocalStorage
    saveMessages(messages);
    
    // Clear inputs
    messageInput.value = '';
    anonymousNameInput.value = '';
    categorySelect.value = '';
    updateCharCount();
    
    // Reset filter to show all messages
    currentFilter = 'all';
    if (filterSelect) {
        filterSelect.value = 'all';
    }
    
    // Navigate to feed page
    showFeedPage();
    
    // Render messages
    renderMessages();
    
    // Scroll to top to show new message
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

/**
 * Get messages from LocalStorage
 * @returns {Array} - Array of message objects
 */
function getMessages() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const messages = stored ? JSON.parse(stored) : [];
        // Filter out expired messages
        return messages.filter(msg => !isMessageExpired(msg));
    } catch (error) {
        console.error('Error reading from LocalStorage:', error);
        return [];
    }
}

/**
 * Check if a message has expired (older than 5 days)
 * @param {Object} message - Message object with timestamp
 * @returns {boolean} - True if message is expired
 */
function isMessageExpired(message) {
    const now = Date.now();
    const messageTime = message.timestamp;
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
    return (now - messageTime) > fiveDaysInMs;
}

/**
 * Remove expired messages from LocalStorage
 */
function removeExpiredMessages() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        
        const messages = JSON.parse(stored);
        const validMessages = messages.filter(msg => !isMessageExpired(msg));
        
        // Only update if messages were removed
        if (validMessages.length !== messages.length) {
            saveMessages(validMessages);
            // Also clean up likes for expired messages
            const expiredIds = messages
                .filter(msg => isMessageExpired(msg))
                .map(msg => msg.id);
            
            if (expiredIds.length > 0) {
                const storedLikes = localStorage.getItem(LIKES_KEY);
                if (storedLikes) {
                    const likes = JSON.parse(storedLikes);
                    expiredIds.forEach(id => {
                        delete likes[id];
                    });
                    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
                }
                
                const storedUserLikes = localStorage.getItem(LIKES_KEY + '_user');
                if (storedUserLikes) {
                    const userLikesObj = JSON.parse(storedUserLikes);
                    expiredIds.forEach(id => {
                        delete userLikesObj[id];
                    });
                    localStorage.setItem(LIKES_KEY + '_user', JSON.stringify(userLikesObj));
                }
            }
        }
    } catch (error) {
        console.error('Error removing expired messages:', error);
    }
}

/**
 * Save messages to LocalStorage
 * @param {Array} messages - Array of message objects
 */
function saveMessages(messages) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
        console.error('Error saving to LocalStorage:', error);
        alert('Unable to save message. LocalStorage may be full.');
    }
}

/**
 * Get likes for a message ID
 * @param {number} messageId - Message ID
 * @returns {number} - Number of likes
 */
function getLikes(messageId) {
    try {
        const stored = localStorage.getItem(LIKES_KEY);
        const likes = stored ? JSON.parse(stored) : {};
        return likes[messageId] || 0;
    } catch (error) {
        console.error('Error reading likes from LocalStorage:', error);
        return 0;
    }
}

/**
 * Check if user has liked a message
 * @param {number} messageId - Message ID
 * @returns {boolean} - Whether user has liked this message
 */
function hasLiked(messageId) {
    try {
        const stored = localStorage.getItem(LIKES_KEY + '_user');
        const userLikes = stored ? JSON.parse(stored) : {};
        return userLikes[messageId] || false;
    } catch (error) {
        return false;
    }
}

/**
 * Toggle like for a message
 * @param {number} messageId - Message ID
 */
function toggleLike(messageId) {
    try {
        // Update likes count
        const stored = localStorage.getItem(LIKES_KEY);
        const likes = stored ? JSON.parse(stored) : {};
        const currentLikes = likes[messageId] || 0;
        
        // Update user likes
        const userStored = localStorage.getItem(LIKES_KEY + '_user');
        const userLikes = userStored ? JSON.parse(userStored) : {};
        const isLiked = userLikes[messageId] || false;
        
        if (isLiked) {
            // Unlike
            likes[messageId] = Math.max(0, currentLikes - 1);
            userLikes[messageId] = false;
        } else {
            // Like
            likes[messageId] = currentLikes + 1;
            userLikes[messageId] = true;
        }
        
        localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
        localStorage.setItem(LIKES_KEY + '_user', JSON.stringify(userLikes));
        
        // Re-render messages to update like count
        renderMessages();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

/**
 * Load messages from LocalStorage and render them
 */
function loadMessages() {
    removeExpiredMessages();
    renderMessages();
}

/**
 * Render all messages to the DOM (with filtering)
 */
function renderMessages() {
    if (!messagesContainer) return;
    
    let messages = getMessages();
    
    // Apply filter
    if (currentFilter !== 'all') {
        messages = messages.filter(msg => msg.category === currentFilter);
    }
    
    // Clear container
    messagesContainer.innerHTML = '';
    
    // Show/hide empty state
    if (messages.length === 0) {
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
        
        // Render each message
        messages.forEach(message => {
            const messageCard = createMessageCard(message);
            messagesContainer.appendChild(messageCard);
        });
    }
}

/**
 * Get comments for a message ID
 * @param {number} messageId - Message ID
 * @returns {Array} - Array of comment objects
 */
function getComments(messageId) {
    try {
        const stored = localStorage.getItem(COMMENTS_KEY);
        const allComments = stored ? JSON.parse(stored) : {};
        return allComments[messageId] || [];
    } catch (error) {
        console.error('Error reading comments from LocalStorage:', error);
        return [];
    }
}

/**
 * Get comment count for a message (including replies)
 * @param {number} messageId - Message ID
 * @returns {number} - Number of comments including replies
 */
function getCommentCount(messageId) {
    const comments = getComments(messageId);
    let count = 0;
    
    function countComments(commentList) {
        commentList.forEach(comment => {
            count++;
            if (comment.replies && comment.replies.length > 0) {
                countComments(comment.replies);
            }
        });
    }
    
    countComments(comments);
    return count;
}

/**
 * Save comments to LocalStorage
 * @param {number} messageId - Message ID
 * @param {Array} comments - Array of comment objects
 */
function saveComments(messageId, comments) {
    try {
        const stored = localStorage.getItem(COMMENTS_KEY);
        const allComments = stored ? JSON.parse(stored) : {};
        allComments[messageId] = comments;
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(allComments));
    } catch (error) {
        console.error('Error saving comments to LocalStorage:', error);
    }
}

/**
 * Add a comment to a message
 * @param {number} messageId - Message ID
 * @param {string} text - Comment text
 * @param {string} author - Comment author name
 */
function addComment(messageId, text, author, parentCommentId = null) {
    if (!text.trim()) return;
    
    const comments = getComments(messageId);
    const newComment = {
        id: Date.now(),
        text: text.trim(),
        author: author || 'Anonymous',
        timestamp: Date.now(),
        parentId: parentCommentId || null,
        replies: []
    };
    
    if (parentCommentId) {
        // Find parent comment and add as reply
        const parentComment = findCommentById(comments, parentCommentId);
        if (parentComment) {
            if (!parentComment.replies) {
                parentComment.replies = [];
            }
            parentComment.replies.push(newComment);
        }
    } else {
        // Top-level comment
        comments.push(newComment);
    }
    
    saveComments(messageId, comments);
}

/**
 * Find a comment by ID (including in replies)
 * @param {Array} comments - Array of comments
 * @param {number} commentId - Comment ID to find
 * @returns {Object|null} - Found comment or null
 */
function findCommentById(comments, commentId) {
    for (const comment of comments) {
        if (comment.id === commentId) {
            return comment;
        }
        if (comment.replies && comment.replies.length > 0) {
            const found = findCommentById(comment.replies, commentId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Render comments for a message
 * @param {number} messageId - Message ID
 * @param {HTMLElement} container - Container element to render comments in
 */
function renderComments(messageId, container) {
    const comments = getComments(messageId);
    container.innerHTML = '';
    
    if (comments.length === 0) {
        const emptyComment = document.createElement('div');
        emptyComment.className = 'no-comments';
        emptyComment.textContent = 'No comments yet. Be the first to comment!';
        container.appendChild(emptyComment);
    } else {
        // Only render top-level comments (not replies)
        const topLevelComments = comments.filter(comment => !comment.parentId);
        topLevelComments.forEach(comment => {
            const commentCard = createCommentCard(messageId, comment);
            container.appendChild(commentCard);
        });
    }
}

/**
 * Create a comment card element
 * @param {number} messageId - Message ID
 * @param {Object} comment - Comment object
 * @returns {HTMLElement} - Comment card DOM element
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
    
    // Render replies if any
    if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies-container';
        
        comment.replies.forEach(reply => {
            const replyCard = createReplyCard(messageId, reply);
            repliesContainer.appendChild(replyCard);
        });
        
        commentCard.appendChild(repliesContainer);
    }
    
    return commentCard;
}

/**
 * Create a reply card element
 * @param {number} messageId - Message ID
 * @param {Object} reply - Reply comment object
 * @returns {HTMLElement} - Reply card DOM element
 */
function createReplyCard(messageId, reply) {
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
 * Toggle reply form for a comment
 * @param {number} messageId - Message ID
 * @param {number} commentId - Comment ID to reply to
 * @param {HTMLElement} commentCard - Comment card element
 */
function toggleReplyForm(messageId, commentId, commentCard) {
    // Check if reply form already exists
    let existingForm = commentCard.querySelector('.reply-form');
    
    if (existingForm) {
        // Toggle visibility
        existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
    } else {
        // Create new reply form
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
        
        replySubmitBtn.addEventListener('click', () => {
            const replyText = replyInput.value.trim();
            const replyAuthor = replyNameInput.value.trim() || 'Anonymous';
            
            if (replyText) {
                addComment(messageId, replyText, replyAuthor, commentId);
                replyInput.value = '';
                replyNameInput.value = '';
                
                // Find the comments container and re-render
                const commentsSection = commentCard.closest('.comments-section');
                const commentsContainer = commentsSection.querySelector('.comments-container');
                renderComments(messageId, commentsContainer);
                
                // Update comment count
                const commentBtn = commentsSection.closest('.message-card').querySelector('.comment-btn');
                if (commentBtn) {
                    const updatedCount = getCommentCount(messageId);
                    commentBtn.querySelector('.comment-count').textContent = updatedCount;
                }
            }
        });
        
        replyCancelBtn.addEventListener('click', () => {
            replyForm.style.display = 'none';
        });
        
        // Insert after comment actions
        const commentActions = commentCard.querySelector('.comment-actions');
        commentCard.insertBefore(replyForm, commentActions.nextSibling);
    }
}

/**
 * Toggle comments section visibility
 * @param {HTMLElement} card - Message card element
 * @param {number} messageId - Message ID
 */
function toggleComments(card, messageId) {
    const commentsSection = card.querySelector(`#comments-${messageId}`);
    if (!commentsSection) return;
    
    const isVisible = commentsSection.style.display !== 'none';
    commentsSection.style.display = isVisible ? 'none' : 'block';
    
    // Scroll to comments if opening
    if (!isVisible) {
        setTimeout(() => {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

/**
 * Create a message card element
 * @param {Object} message - Message object with id, text, author, category, and timestamp
 * @returns {HTMLElement} - Message card DOM element
 */
function createMessageCard(message) {
    const card = document.createElement('div');
    card.className = 'message-card';
    
    // Message header with author and category
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
    messageText.textContent = message.text; // Using textContent prevents XSS
    
    // Message footer with timestamp and like button
    const messageFooter = document.createElement('div');
    messageFooter.className = 'message-footer';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = formatTimestamp(message.timestamp);
    
    // Action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    const likeBtn = document.createElement('button');
    likeBtn.className = 'like-btn';
    const likes = getLikes(message.id);
    const isLiked = hasLiked(message.id);
    
    if (isLiked) {
        likeBtn.classList.add('liked');
    }
    
    likeBtn.innerHTML = `
        <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
        <span class="like-count">${likes}</span>
    `;
    
    likeBtn.addEventListener('click', () => {
        toggleLike(message.id);
    });
    
    const commentBtn = document.createElement('button');
    commentBtn.className = 'comment-btn';
    const commentCount = getCommentCount(message.id);
    
    commentBtn.innerHTML = `
        <span class="comment-icon">💬</span>
        <span class="comment-count">${commentCount}</span>
    `;
    
    commentBtn.addEventListener('click', () => {
        toggleComments(card, message.id);
    });
    
    actionButtons.appendChild(likeBtn);
    actionButtons.appendChild(commentBtn);
    
    messageFooter.appendChild(timestamp);
    messageFooter.appendChild(actionButtons);
    
    // Comments section (initially hidden)
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    commentsSection.id = `comments-${message.id}`;
    commentsSection.style.display = 'none';
    
    // Comments container
    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'comments-container';
    commentsContainer.id = `comments-list-${message.id}`;
    commentsSection.appendChild(commentsContainer);
    
    // Load and render existing comments
    renderComments(message.id, commentsContainer);
    
    // Comment input form
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
    
    commentSubmitBtn.addEventListener('click', () => {
        const commentText = commentInput.value.trim();
        const commentAuthor = commentNameInput.value.trim() || 'Anonymous';
        
        if (commentText) {
            addComment(message.id, commentText, commentAuthor);
            commentInput.value = '';
            commentNameInput.value = '';
            // Refresh comments display
            renderComments(message.id, commentsContainer);
            // Update comment count
            const updatedCount = getCommentCount(message.id);
            commentBtn.querySelector('.comment-count').textContent = updatedCount;
        }
    });
    
    commentsSection.appendChild(commentForm);
    
    // Append all elements to card in correct order
    card.appendChild(messageHeader);
    card.appendChild(messageText);
    card.appendChild(messageFooter);
    card.appendChild(commentsSection); // Comments section below the message
    
    return card;
}

/**
 * Clear all messages from LocalStorage
 */
function clearMessages() {
    if (confirm('Are you sure you want to clear all messages? This action cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LIKES_KEY);
        localStorage.removeItem(LIKES_KEY + '_user');
        localStorage.removeItem(COMMENTS_KEY);
        currentFilter = 'all';
        if (filterSelect) {
            filterSelect.value = 'all';
        }
        renderMessages();
    }
}
