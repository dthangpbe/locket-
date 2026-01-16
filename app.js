// ===== Application State =====
const APP_STATE = {
    currentUser: null,
    allAccounts: {}, // All registered accounts
    friends: [],
    photos: [],
    suggestedFriends: [
        { id: '@user1-52847', accountId: '@mavanh-52847', username: 'mavanh', name: 'Mai Anh', avatar: '👩', status: 'Online' },
        { id: '@user2-39201', accountId: '@tuankiet-39201', username: 'tuankiet', name: 'Tuấn Kiệt', avatar: '👨', status: 'Online' },
        { id: '@user3-76543', accountId: '@linhchi-76543', username: 'linhchi', name: 'Linh Chi', avatar: '👧', status: 'Offline' },
        { id: '@user4-12098', accountId: '@minhduc-12098', username: 'minhduc', name: 'Minh Đức', avatar: '🧑', status: 'Online' },
        { id: '@user5-88432', accountId: '@huonggiang-88432', username: 'huonggiang', name: 'Hương Giang', avatar: '👩‍🦰', status: 'Online' },
        { id: '@user6-65109', accountId: '@quocbao-65109', username: 'quocbao', name: 'Quốc Bảo', avatar: '👦', status: 'Offline' }
    ],
    currentPhotoData: null,
    currentReactionPhotoId: null,
    stream: null
};

// ===== Password Encryption (Basic - Demo Only) =====
function encryptPassword(password) {
    // Basic Base64 encoding for demo - NOT secure for production
    return btoa(password);
}

function decryptPassword(encrypted) {
    return atob(encrypted);
}

// ===== Unique ID Generation =====
function generateAccountId(username) {
    // Generate 5-digit random number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const accountId = `@${username.toLowerCase()}-${randomNum}`;

    // Check if ID already exists (collision detection)
    if (APP_STATE.allAccounts[accountId]) {
        // Recursively try again if collision occurs
        return generateAccountId(username);
    }

    return accountId;
}

// ===== LocalStorage Helper Functions =====
function saveToStorage() {
    localStorage.setItem('locketAppState', JSON.stringify({
        currentUser: APP_STATE.currentUser,
        friends: APP_STATE.friends,
        photos: APP_STATE.photos
    }));

    // Save all accounts separately
    localStorage.setItem('locketAllAccounts', JSON.stringify(APP_STATE.allAccounts));
}

function loadFromStorage() {
    // Load accounts first
    const savedAccounts = localStorage.getItem('locketAllAccounts');
    if (savedAccounts) {
        APP_STATE.allAccounts = JSON.parse(savedAccounts);
    }

    // Load user state
    const saved = localStorage.getItem('locketAppState');
    if (saved) {
        const data = JSON.parse(saved);
        APP_STATE.currentUser = data.currentUser;
        APP_STATE.friends = data.friends || [];
        APP_STATE.photos = data.photos || [];
    }
}

// ===== DOM Elements =====
const elements = {
    authModal: document.getElementById('authModal'),
    registerForm: document.getElementById('registerForm'),
    loginForm: document.getElementById('loginForm'),
    regUsername: document.getElementById('regUsername'),
    regPassword: document.getElementById('regPassword'),
    regConfirmPassword: document.getElementById('regConfirmPassword'),
    regDisplayName: document.getElementById('regDisplayName'),
    regError: document.getElementById('regError'),
    registerBtn: document.getElementById('registerBtn'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    loginBtn: document.getElementById('loginBtn'),
    app: document.getElementById('app'),
    displayAccountId: document.getElementById('displayAccountId'),
    copyIdBtn: document.getElementById('copyIdBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    friendsBtn: document.getElementById('friendsBtn'),
    friendsModal: document.getElementById('friendsModal'),
    closeFriendsModal: document.getElementById('closeFriendsModal'),
    friendSearchInput: document.getElementById('friendSearchInput'),
    searchResults: document.getElementById('searchResults'),
    cameraPreview: document.getElementById('cameraPreview'),
    captureBtn: document.getElementById('captureBtn'),
    photoCanvas: document.getElementById('photoCanvas'),
    capturedPhoto: document.getElementById('capturedPhoto'),
    capturedImg: document.getElementById('capturedImg'),
    captionSection: document.getElementById('captionSection'),
    captionInput: document.getElementById('captionInput'),
    cancelBtn: document.getElementById('cancelBtn'),
    postBtn: document.getElementById('postBtn'),
    photoFeed: document.getElementById('photoFeed'),
    friendsList: document.getElementById('friendsList'),
    suggestedList: document.getElementById('suggestedList'),
    reactionsModal: document.getElementById('reactionsModal'),
    friendCount: document.querySelector('.friend-count')
};

// ===== Initialization =====
function init() {
    loadFromStorage();

    if (APP_STATE.currentUser && APP_STATE.currentUser.accountId) {
        showApp();
    } else {
        elements.authModal.classList.add('active');
    }

    setupEventListeners();
    initCamera();
}

function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchAuthTab(e.target.dataset.tab));
    });

    // Registration
    elements.registerBtn.addEventListener('click', handleRegister);
    elements.regConfirmPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    // Login
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Account ID copy
    elements.copyIdBtn.addEventListener('click', copyAccountId);
    elements.displayAccountId.addEventListener('click', copyAccountId);

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Friends
    elements.friendsBtn.addEventListener('click', () => openModal(elements.friendsModal));
    elements.closeFriendsModal.addEventListener('click', () => closeModal(elements.friendsModal));

    // Friend search
    elements.friendSearchInput.addEventListener('input', handleFriendSearch);

    // Camera
    elements.captureBtn.addEventListener('click', capturePhoto);
    elements.cancelBtn.addEventListener('click', cancelPhoto);
    elements.postBtn.addEventListener('click', postPhoto);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Reactions
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', (e) => addReaction(e.target.dataset.reaction));
    });

    // Close modals on background click
    elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal && APP_STATE.currentUser) {
            closeModal(elements.authModal);
        }
    });
    elements.friendsModal.addEventListener('click', (e) => {
        if (e.target === elements.friendsModal) closeModal(elements.friendsModal);
    });
    elements.reactionsModal.addEventListener('click', (e) => {
        if (e.target === elements.reactionsModal) closeModal(elements.reactionsModal);
    });
}

// ===== Authentication Functions =====
function switchAuthTab(tabName) {
    // Clear errors
    elements.regError.textContent = '';
    elements.loginError.textContent = '';

    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    elements.registerForm.classList.remove('active');
    elements.loginForm.classList.remove('active');

    if (tabName === 'register') {
        elements.registerForm.classList.add('active');
    } else {
        elements.loginForm.classList.add('active');
    }
}

function handleRegister() {
    const username = elements.regUsername.value.trim();
    const password = elements.regPassword.value;
    const confirmPassword = elements.regConfirmPassword.value;
    const displayName = elements.regDisplayName.value.trim() || username;

    // Clear previous errors
    elements.regError.textContent = '';

    // Validation
    if (!username) {
        elements.regError.textContent = 'Vui lòng nhập tên người dùng!';
        return;
    }

    if (username.length < 4 || username.length > 20) {
        elements.regError.textContent = 'Tên người dùng phải có 4-20 ký tự!';
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        elements.regError.textContent = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới!';
        return;
    }

    if (!password) {
        elements.regError.textContent = 'Vui lòng nhập mật khẩu!';
        return;
    }

    if (password.length < 6) {
        elements.regError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
        return;
    }

    if (password !== confirmPassword) {
        elements.regError.textContent = 'Mật khẩu xác nhận không khớp!';
        return;
    }

    // Check if username already exists
    const existingAccount = Object.values(APP_STATE.allAccounts).find(
        acc => acc.username.toLowerCase() === username.toLowerCase()
    );

    if (existingAccount) {
        elements.regError.textContent = 'Tên người dùng đã tồn tại!';
        return;
    }

    // Generate unique account ID
    const accountId = generateAccountId(username);

    // Create account
    const newAccount = {
        accountId: accountId,
        username: username,
        displayName: displayName,
        password: encryptPassword(password),
        avatar: getRandomAvatar(),
        createdAt: new Date().toISOString()
    };

    // Save account
    APP_STATE.allAccounts[accountId] = newAccount;

    // Set as current user
    APP_STATE.currentUser = {
        accountId: newAccount.accountId,
        username: newAccount.username,
        name: newAccount.displayName,
        avatar: newAccount.avatar
    };

    saveToStorage();

    // Show success message briefly
    elements.regError.innerHTML = `<div class="success-message">✅ Tài khoản đã được tạo! ID của bạn: <strong>${accountId}</strong></div>`;

    setTimeout(() => {
        showApp();
    }, 2000);
}

function handleLogin() {
    const usernameOrId = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;

    elements.loginError.textContent = '';

    if (!usernameOrId) {
        elements.loginError.textContent = 'Vui lòng nhập ID tài khoản hoặc tên người dùng!';
        return;
    }

    if (!password) {
        elements.loginError.textContent = 'Vui lòng nhập mật khẩu!';
        return;
    }

    // Find account by accountId or username
    let account = null;

    if (usernameOrId.startsWith('@')) {
        // Search by account ID
        account = APP_STATE.allAccounts[usernameOrId];
    } else {
        // Search by username
        account = Object.values(APP_STATE.allAccounts).find(
            acc => acc.username.toLowerCase() === usernameOrId.toLowerCase()
        );
    }

    if (!account) {
        elements.loginError.textContent = 'Tài khoản không tồn tại!';
        return;
    }

    // Verify password
    try {
        if (decryptPassword(account.password) !== password) {
            elements.loginError.textContent = 'Mật khẩu không đúng!';
            return;
        }
    } catch (e) {
        elements.loginError.textContent = 'Lỗi xác thực!';
        return;
    }

    // Set as current user
    APP_STATE.currentUser = {
        accountId: account.accountId,
        username: account.username,
        name: account.displayName,
        avatar: account.avatar
    };

    saveToStorage();
    showApp();
}

function handleLogout() {
    const confirmed = confirm('Bạn có chắc chắn muốn đăng xuất?');
    if (confirmed) {
        APP_STATE.currentUser = null;
        APP_STATE.friends = [];
        APP_STATE.photos = [];
        localStorage.removeItem('locketAppState');

        // Show auth modal
        elements.authModal.classList.add('active');
        elements.app.style.display = 'none';

        // Reset forms
        elements.regUsername.value = '';
        elements.regPassword.value = '';
        elements.regConfirmPassword.value = '';
        elements.regDisplayName.value = '';
        elements.loginUsername.value = '';
        elements.loginPassword.value = '';
        elements.regError.textContent = '';
        elements.loginError.textContent = '';
        switchAuthTab('register');
    }
}

function copyAccountId() {
    const accountId = APP_STATE.currentUser.accountId;
    navigator.clipboard.writeText(accountId).then(() => {
        // Visual feedback
        const originalText = elements.displayAccountId.textContent;
        elements.displayAccountId.textContent = 'Đã sao chép!';
        setTimeout(() => {
            elements.displayAccountId.textContent = originalText;
        }, 1500);
    }).catch(err => {
        alert('Không thể sao chép: ' + accountId);
    });
}

function showApp() {
    elements.authModal.classList.remove('active');
    elements.app.style.display = 'block';
    elements.displayAccountId.textContent = APP_STATE.currentUser.accountId;
    updateFriendCount();
    renderFriends();
    renderSuggestedFriends();
    renderFeed();

    // Generate some demo photos if empty
    if (APP_STATE.photos.length === 0) {
        generateDemoPhotos();
    }
}

function getRandomAvatar() {
    const avatars = ['👤', '😊', '🌟', '✨', '💫', '🎨', '📸', '🎭'];
    return avatars[Math.floor(Math.random() * avatars.length)];
}

// ===== Friend Search =====
function handleFriendSearch() {
    const searchQuery = elements.friendSearchInput.value.trim();

    if (!searchQuery) {
        elements.searchResults.innerHTML = '';
        return;
    }

    // Search by account ID
    if (searchQuery.startsWith('@')) {
        const account = APP_STATE.allAccounts[searchQuery];

        if (!account) {
            elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    ❌ Không tìm thấy tài khoản với ID: ${searchQuery}
                </div>
            `;
            return;
        }

        // Check if it's the current user
        if (account.accountId === APP_STATE.currentUser.accountId) {
            elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    ℹ️ Đây là tài khoản của bạn
                </div>
            `;
            return;
        }

        // Check if already friends
        const alreadyFriend = APP_STATE.friends.find(f => f.accountId === account.accountId);

        if (alreadyFriend) {
            elements.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="friend-avatar">${account.avatar}</div>
                    <div class="friend-info">
                        <h4>${account.displayName}</h4>
                        <p>${account.accountId}</p>
                    </div>
                    <button class="friend-action" disabled style="opacity: 0.5;">Đã kết bạn</button>
                </div>
            `;
        } else {
            elements.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="friend-avatar">${account.avatar}</div>
                    <div class="friend-info">
                        <h4>${account.displayName}</h4>
                        <p>${account.accountId}</p>
                    </div>
                    <button class="friend-action" onclick="addFriendByAccountId('${account.accountId}')">Thêm bạn</button>
                </div>
            `;
        }
    } else {
        elements.searchResults.innerHTML = `
            <div class="search-no-results">
                💡 Vui lòng nhập ID tài khoản (bắt đầu bằng @)
            </div>
        `;
    }
}

function addFriendByAccountId(accountId) {
    const account = APP_STATE.allAccounts[accountId];
    if (!account) return;

    const friend = {
        id: account.accountId,
        accountId: account.accountId,
        username: account.username,
        name: account.displayName,
        avatar: account.avatar,
        status: 'Online'
    };

    APP_STATE.friends.push(friend);
    saveToStorage();
    updateFriendCount();
    renderFriends();
    renderSuggestedFriends();

    // Clear search
    elements.friendSearchInput.value = '';
    elements.searchResults.innerHTML = `
        <div class="search-no-results" style="color: #43e97b;">
            ✅ Đã thêm ${friend.name} vào danh sách bạn bè!
        </div>
    `;

    setTimeout(() => {
        elements.searchResults.innerHTML = '';
    }, 2000);
}

// ===== Camera Functions =====
async function initCamera() {
    try {
        const constraints = {
            video: {
                width: { ideal: 1080 },
                height: { ideal: 1080 },
                facingMode: 'user'
            },
            audio: false
        };

        APP_STATE.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = APP_STATE.stream;
    } catch (error) {
        console.error('Camera error:', error);
        elements.cameraPreview.style.display = 'none';
        elements.cameraPreview.parentElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                <p style="color: #b4b4c8;">Không thể truy cập camera</p>
                <p style="color: #b4b4c8; font-size: 0.9rem; margin-top: 0.5rem;">Vui lòng cấp quyền camera hoặc sử dụng HTTPS/localhost</p>
            </div>
        `;
    }
}

function capturePhoto() {
    const video = elements.cameraPreview;
    const canvas = elements.photoCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    // Store and display
    APP_STATE.currentPhotoData = imageData;
    elements.capturedImg.src = imageData;
    elements.capturedPhoto.style.display = 'block';
    elements.captionSection.style.display = 'block';

    // Hide capture button temporarily
    elements.captureBtn.style.display = 'none';
}

function cancelPhoto() {
    APP_STATE.currentPhotoData = null;
    elements.capturedPhoto.style.display = 'none';
    elements.captionSection.style.display = 'none';
    elements.captionInput.value = '';
    elements.captureBtn.style.display = 'block';
}

function postPhoto() {
    if (!APP_STATE.currentPhotoData) return;

    const newPhoto = {
        id: Date.now().toString(),
        userId: APP_STATE.currentUser.accountId,
        userName: APP_STATE.currentUser.name,
        userAvatar: APP_STATE.currentUser.avatar,
        image: APP_STATE.currentPhotoData,
        caption: elements.captionInput.value.trim(),
        timestamp: new Date().toISOString(),
        reactions: {}
    };

    APP_STATE.photos.unshift(newPhoto);
    saveToStorage();
    renderFeed();
    cancelPhoto();

    // Scroll to feed
    setTimeout(() => {
        document.querySelector('.feed-section').scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

// ===== Friends Functions =====
function updateFriendCount() {
    elements.friendCount.textContent = APP_STATE.friends.length;
}

function renderFriends() {
    if (APP_STATE.friends.length === 0) {
        elements.friendsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Bạn chưa có bạn bè nào</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Tìm bạn bằng ID tài khoản!</p>
            </div>
        `;
        return;
    }

    elements.friendsList.innerHTML = APP_STATE.friends.map(friend => `
        <div class="friend-item">
            <div class="friend-avatar">${friend.avatar}</div>
            <div class="friend-info">
                <h4>${friend.name}</h4>
                <p>${friend.accountId || friend.id}</p>
            </div>
            <button class="friend-action remove" onclick="removeFriend('${friend.accountId || friend.id}')">Xóa</button>
        </div>
    `).join('');
}

function renderSuggestedFriends() {
    const availableSuggestions = APP_STATE.suggestedFriends.filter(
        suggested => !APP_STATE.friends.find(friend => friend.accountId === suggested.accountId)
    );

    if (availableSuggestions.length === 0) {
        elements.suggestedList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <p>Không có gợi ý thêm</p>
            </div>
        `;
        return;
    }

    elements.suggestedList.innerHTML = availableSuggestions.map(friend => `
        <div class="friend-item">
            <div class="friend-avatar">${friend.avatar}</div>
            <div class="friend-info">
                <h4>${friend.name}</h4>
                <p>${friend.accountId}</p>
            </div>
            <button class="friend-action" onclick="addFriend('${friend.accountId}')">Thêm bạn</button>
        </div>
    `).join('');
}

function addFriend(accountId) {
    const friend = APP_STATE.suggestedFriends.find(f => f.accountId === accountId);
    if (friend && !APP_STATE.friends.find(f => f.accountId === accountId)) {
        APP_STATE.friends.push(friend);
        saveToStorage();
        updateFriendCount();
        renderFriends();
        renderSuggestedFriends();

        // Generate a photo from this friend
        generateFriendPhoto(friend);
    }
}

function removeFriend(friendAccountId) {
    APP_STATE.friends = APP_STATE.friends.filter(f => (f.accountId || f.id) !== friendAccountId);
    saveToStorage();
    updateFriendCount();
    renderFriends();
    renderSuggestedFriends();
}

// ===== Feed Functions =====
function renderFeed() {
    if (APP_STATE.photos.length === 0) {
        elements.photoFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📸</div>
                <p>Chưa có ảnh nào</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Chụp ảnh đầu tiên của bạn!</p>
            </div>
        `;
        return;
    }

    elements.photoFeed.innerHTML = APP_STATE.photos.map(photo => {
        const reactionsHTML = Object.keys(photo.reactions).length > 0
            ? `<div class="reactions-display">
                ${Object.entries(photo.reactions).map(([emoji, users]) =>
                `<div class="reaction-item">${emoji} ${users.length}</div>`
            ).join('')}
               </div>`
            : '';

        return `
            <div class="photo-card">
                <div class="photo-card-header">
                    <div class="user-avatar">${photo.userAvatar}</div>
                    <div class="user-info">
                        <h3>${photo.userName}</h3>
                        <p>${formatTimestamp(photo.timestamp)}</p>
                    </div>
                </div>
                <div class="photo-card-image">
                    <img src="${photo.image}" alt="Photo">
                </div>
                <div class="photo-card-content">
                    ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
                    <div class="photo-actions">
                        <button class="react-btn" onclick="openReactionModal('${photo.id}')">
                            😊 Thả cảm xúc
                        </button>
                    </div>
                    ${reactionsHTML}
                </div>
            </div>
        `;
    }).join('');
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;

    return date.toLocaleDateString('vi-VN');
}

// ===== Reactions Functions =====
function openReactionModal(photoId) {
    APP_STATE.currentReactionPhotoId = photoId;
    openModal(elements.reactionsModal);
}

function addReaction(emoji) {
    if (!APP_STATE.currentReactionPhotoId) return;

    const photo = APP_STATE.photos.find(p => p.id === APP_STATE.currentReactionPhotoId);
    if (!photo) return;

    if (!photo.reactions[emoji]) {
        photo.reactions[emoji] = [];
    }

    // Check if user already reacted with this emoji
    const userName = APP_STATE.currentUser.name;
    const userIndex = photo.reactions[emoji].indexOf(userName);
    if (userIndex === -1) {
        photo.reactions[emoji].push(userName);
    }

    saveToStorage();
    renderFeed();
    closeModal(elements.reactionsModal);
}

// ===== Modal Functions =====
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = tabName === 'myFriends'
        ? document.getElementById('myFriendsTab')
        : document.getElementById('suggestedTab');
    targetContent.classList.add('active');
}

// ===== Demo Data Generation =====
function generateDemoPhotos() {
    const demoPhotos = [
        {
            userId: '@mavanh-52847',
            userName: 'Mai Anh',
            userAvatar: '👩',
            caption: 'Buổi sáng tươi đẹp ☀️',
            color: '#FF6B9D'
        },
        {
            userId: '@tuankiet-39201',
            userName: 'Tuấn Kiệt',
            userAvatar: '👨',
            caption: 'Coffee time ☕',
            color: '#4ECDC4'
        },
        {
            userId: '@huonggiang-88432',
            userName: 'Hương Giang',
            userAvatar: '👩‍🦰',
            caption: 'Cuối tuần vui vẻ! 🎉',
            color: '#95E1D3'
        }
    ];

    demoPhotos.forEach((demo, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 800, 800);
        gradient.addColorStop(0, demo.color);
        gradient.addColorStop(1, adjustColor(demo.color, -40));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 800);

        // Add some decorative elements
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(600, 200, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(200, 600, 100, 0, Math.PI * 2);
        ctx.fill();

        // Add emoji
        ctx.font = 'bold 200px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(demo.userAvatar, 400, 400);

        const photo = {
            id: `demo-${index}-${Date.now()}`,
            userId: demo.userId,
            userName: demo.userName,
            userAvatar: demo.userAvatar,
            image: canvas.toDataURL('image/jpeg', 0.9),
            caption: demo.caption,
            timestamp: new Date(Date.now() - (index * 3600000)).toISOString(),
            reactions: {}
        };

        APP_STATE.photos.push(photo);
    });

    saveToStorage();
    renderFeed();
}

function generateFriendPhoto(friend) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Random color
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const gradient = ctx.createLinearGradient(0, 0, 800, 800);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, -40));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 800);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(600, 200, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 200px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(friend.avatar, 400, 400);

    const captions = ['Hey! 👋', 'Chào bạn! ✨', 'Nice day 🌟', 'Yeahh! 🎉'];

    const photo = {
        id: `${friend.accountId}-${Date.now()}`,
        userId: friend.accountId,
        userName: friend.name,
        userAvatar: friend.avatar,
        image: canvas.toDataURL('image/jpeg', 0.9),
        caption: captions[Math.floor(Math.random() * captions.length)],
        timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        reactions: {}
    };

    APP_STATE.photos.unshift(photo);
    saveToStorage();
    renderFeed();
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);
