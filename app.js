// ===== FIREBASE LOCKET APP - REAL-TIME VERSION =====
// Uses Firebase Auth + Firestore for real online connections

// ===== Application State =====
const APP_STATE = {
    currentUser: null,
    unsubscribers: [], // Store Firestore listeners for cleanup
    currentPhotoData: null,
    currentReactionPhotoId: null,
    stream: null
};

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

// ===== Unique ID Generation =====
function generateAccountId(username) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `@${username.toLowerCase()}-${randomNum}`;
}

function getRandomAvatar() {
    const avatars = ['👤', '😊', '🌟', '✨', '💫', '🎨', '📸', '🎭'];
    return avatars[Math.floor(Math.random() * avatars.length)];
}

// ===== Initialization =====
function init() {
    setupEventListeners();
    initCamera();

    // Listen for auth state changes
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            await loadUserData(user.uid);
            showApp();
        } else {
            // User is signed out
            elements.authModal.classList.add('active');
            elements.app.style.display = 'none';
        }
    });
}

// ===== Event Listeners Setup =====
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

async function handleRegister() {
    const username = elements.regUsername.value.trim();
    const password = elements.regPassword.value;
    const confirmPassword = elements.regConfirmPassword.value;
    const displayName = elements.regDisplayName.value.trim() || username;

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

    try {
        // Check if username already exists
        const usernameQuery = await db.collection('users')
            .where('username', '==', username.toLowerCase())
            .get();

        if (!usernameQuery.empty) {
            elements.regError.textContent = 'Tên người dùng đã tồn tại!';
            return;
        }

        // Generate unique account ID
        let accountId;
        let isUnique = false;

        while (!isUnique) {
            accountId = generateAccountId(username);
            const idQuery = await db.collection('users')
                .where('accountId', '==', accountId)
                .get();
            isUnique = idQuery.empty;
        }

        // Create Firebase Auth account
        const email = `${accountId.replace('@', '')}@locket.app`;
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Store user data in Firestore
        await db.collection('users').doc(user.uid).set({
            accountId: accountId,
            username: username.toLowerCase(),
            displayName: displayName,
            avatar: getRandomAvatar(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            email: email
        });

        elements.regError.innerHTML = `<div class="success-message">✅ Tài khoản đã được tạo! ID của bạn: <strong>${accountId}</strong></div>`;

        // Auto-login happens via onAuthStateChanged

    } catch (error) {
        console.error('Registration error:', error);
        elements.regError.textContent = `Lỗi: ${error.message}`;
    }
}

async function handleLogin() {
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

    try {
        let email;

        if (usernameOrId.startsWith('@')) {
            // Login with account ID
            email = `${usernameOrId.replace('@', '')}@locket.app`;
        } else {
            // Login with username - need to find the email
            const userQuery = await db.collection('users')
                .where('username', '==', usernameOrId.toLowerCase())
                .limit(1)
                .get();

            if (userQuery.empty) {
                elements.loginError.textContent = 'Tài khoản không tồn tại!';
                return;
            }

            email = userQuery.docs[0].data().email;
        }

        await auth.signInWithEmailAndPassword(email, password);
        // Login success - onAuthStateChanged will handle the rest

    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            elements.loginError.textContent = 'Tên người dùng hoặc mật khẩu không đúng!';
        } else {
            elements.loginError.textContent = `Lỗi: ${error.message}`;
        }
    }
}

async function handleLogout() {
    const confirmed = confirm('Bạn có chắc chắn muốn đăng xuất?');
    if (confirmed) {
        // Cleanup listeners
        APP_STATE.unsubscribers.forEach(unsub => unsub());
        APP_STATE.unsubscribers = [];

        await auth.signOut();
        // onAuthStateChanged will handle UI updates
    }
}

function copyAccountId() {
    const accountId = APP_STATE.currentUser.accountId;
    navigator.clipboard.writeText(accountId).then(() => {
        const originalText = elements.displayAccountId.textContent;
        elements.displayAccountId.textContent = 'Đã sao chép!';
        setTimeout(() => {
            elements.displayAccountId.textContent = originalText;
        }, 1500);
    }).catch(err => {
        alert('Không thể sao chép: ' + accountId);
    });
}

// ===== User Data Management =====
async function loadUserData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
            APP_STATE.currentUser = {
                uid: uid,
                ...userDoc.data()
            };
        } else {
            console.error('User document not found');
            await auth.signOut();
            return;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function showApp() {
    elements.authModal.classList.remove('active');
    elements.app.style.display = 'block';
    elements.displayAccountId.textContent = APP_STATE.currentUser.accountId;

    // Setup real-time listeners
    setupFriendsListener();
    setupPhotosListener();

    updateFriendCount();
}

// ===== Friends Management =====
function setupFriendsListener() {
    const friendsRef = db.collection('users').doc(APP_STATE.currentUser.uid)
        .collection('friends');

    const unsubscribe = friendsRef.onSnapshot((snapshot) => {
        renderFriends(snapshot);
        updateFriendCount();
    });

    APP_STATE.unsubscribers.push(unsubscribe);
}

function renderFriends(snapshot) {
    if (!snapshot || snapshot.empty) {
        elements.friendsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Bạn chưa có bạn bè nào</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Tìm bạn bằng ID tài khoản!</p>
            </div>
        `;
        return;
    }

    const friends = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    elements.friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item">
            <div class="friend-avatar">${friend.avatar}</div>
            <div class="friend-info">
                <h4>${friend.displayName}</h4>
                <p>${friend.accountId}</p>
            </div>
            <button class="friend-action remove" onclick="removeFriend('${friend.friendUid}')">Xóa</button>
        </div>
    `).join('');
}

function updateFriendCount() {
    db.collection('users').doc(APP_STATE.currentUser.uid)
        .collection('friends')
        .get()
        .then(snapshot => {
            elements.friendCount.textContent = snapshot.size;
        });
}

async function handleFriendSearch() {
    const searchQuery = elements.friendSearchInput.value.trim();

    if (!searchQuery) {
        elements.searchResults.innerHTML = '';
        return;
    }

    if (!searchQuery.startsWith('@')) {
        elements.searchResults.innerHTML = `
            <div class="search-no-results">
                💡 Vui lòng nhập ID tài khoản (bắt đầu bằng @)
            </div>
        `;
        return;
    }

    try {
        const userQuery = await db.collection('users')
            .where('accountId', '==', searchQuery)
            .limit(1)
            .get();

        if (userQuery.empty) {
            elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    ❌ Không tìm thấy tài khoản với ID: ${searchQuery}
                </div>
            `;
            return;
        }

        const userData = userQuery.docs[0].data();
        const userUid = userQuery.docs[0].id;

        if (userUid === APP_STATE.currentUser.uid) {
            elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    ℹ️ Đây là tài khoản của bạn
                </div>
            `;
            return;
        }

        // Check if already friends
        const friendDoc = await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friends').doc(userUid).get();

        if (friendDoc.exists) {
            elements.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="friend-avatar">${userData.avatar}</div>
                    <div class="friend-info">
                        <h4>${userData.displayName}</h4>
                        <p>${userData.accountId}</p>
                    </div>
                    <button class="friend-action" disabled style="opacity: 0.5;">Đã kết bạn</button>
                </div>
            `;
        } else {
            elements.searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="friend-avatar">${userData.avatar}</div>
                    <div class="friend-info">
                        <h4>${userData.displayName}</h4>
                        <p>${userData.accountId}</p>
                    </div>
                    <button class="friend-action" onclick="addFriendByUid('${userUid}', '${userData.accountId}', '${userData.displayName}', '${userData.avatar}')">Thêm bạn</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Friend search error:', error);
        elements.searchResults.innerHTML = `
            <div class="search-no-results">
                ❌ Lỗi tìm kiếm: ${error.message}
            </div>
        `;
    }
}

async function addFriendByUid(friendUid, accountId, displayName, avatar) {
    try {
        // Send friend request instead of adding directly
        await db.collection('users').doc(friendUid)
            .collection('friendRequests').doc(APP_STATE.currentUser.uid).set({
                fromUid: APP_STATE.currentUser.uid,
                fromAccountId: APP_STATE.currentUser.accountId,
                fromDisplayName: APP_STATE.currentUser.displayName,
                fromAvatar: APP_STATE.currentUser.avatar,
                status: 'pending',
                sentAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        elements.friendSearchInput.value = '';
        elements.searchResults.innerHTML = `
            <div class="search-no-results" style="color: #43e97b;">
                ✅ Đã gửi lời mời kết bạn tới ${displayName}!
            </div>
        `;

        setTimeout(() => {
            elements.searchResults.innerHTML = '';
        }, 2000);

    } catch (error) {
        console.error('Send friend request error:', error);
        alert('Lỗi khi gửi lời mời: ' + error.message);
    }
}

async function acceptFriendRequest(fromUid, fromAccountId, fromDisplayName, fromAvatar) {
    try {
        // Add each other as friends
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friends').doc(fromUid).set({
                friendUid: fromUid,
                accountId: fromAccountId,
                displayName: fromDisplayName,
                avatar: fromAvatar,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        await db.collection('users').doc(fromUid)
            .collection('friends').doc(APP_STATE.currentUser.uid).set({
                friendUid: APP_STATE.currentUser.uid,
                accountId: APP_STATE.currentUser.accountId,
                displayName: APP_STATE.currentUser.displayName,
                avatar: APP_STATE.currentUser.avatar,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Delete the friend request
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friendRequests').doc(fromUid).delete();

    } catch (error) {
        console.error('Accept friend request error:', error);
        alert('Lỗi khi chấp nhận lời mời: ' + error.message);
    }
}

async function rejectFriendRequest(fromUid) {
    try {
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friendRequests').doc(fromUid).delete();
    } catch (error) {
        console.error('Reject friend request error:', error);
        alert('Lỗi khi từ chối lời mời: ' + error.message);
    }
}

async function removeFriend(friendUid) {
    try {
        // Remove from current user's friends
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friends').doc(friendUid).delete();

        // Remove current user from friend's friends list
        await db.collection('users').doc(friendUid)
            .collection('friends').doc(APP_STATE.currentUser.uid).delete();

    } catch (error) {
        console.error('Remove friend error:', error);
        alert('Lỗi khi xóa bạn: ' + error.message);
    }
}

function renderSuggestedFriends() {
    // Show friend requests instead
    const requestsRef = db.collection('users').doc(APP_STATE.currentUser.uid)
        .collection('friendRequests');

    requestsRef.where('status', '==', 'pending').onSnapshot((snapshot) => {
        if (snapshot.empty) {
            elements.suggestedList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📬</div>
                    <p>Không có lời mời kết bạn</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Tìm kiếm bạn bè bằng ID để gửi lời mời!</p>
                </div>
            `;
            return;
        }

        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        elements.suggestedList.innerHTML = requests.map(request => `
            <div class="friend-item">
                <div class="friend-avatar">${request.fromAvatar}</div>
                <div class="friend-info">
                    <h4>${request.fromDisplayName}</h4>
                    <p>${request.fromAccountId}</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="friend-action" onclick="acceptFriendRequest('${request.fromUid}', '${request.fromAccountId}', '${request.fromDisplayName}', '${request.fromAvatar}')" style="background: #43e97b;">Chấp nhận</button>
                    <button class="friend-action remove" onclick="rejectFriendRequest('${request.fromUid}')">Từ chối</button>
                </div>
            </div>
        `).join('');
    });
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    APP_STATE.currentPhotoData = imageData;
    elements.capturedImg.src = imageData;
    elements.capturedPhoto.style.display = 'block';
    elements.captionSection.style.display = 'block';
    elements.captureBtn.style.display = 'none';
}

function cancelPhoto() {
    APP_STATE.currentPhotoData = null;
    elements.capturedPhoto.style.display = 'none';
    elements.captionSection.style.display = 'none';
    elements.captionInput.value = '';
    elements.captureBtn.style.display = 'block';
}

async function postPhoto() {
    if (!APP_STATE.currentPhotoData) return;

    try {
        await db.collection('photos').add({
            userId: APP_STATE.currentUser.uid,
            userName: APP_STATE.currentUser.displayName,
            userAvatar: APP_STATE.currentUser.avatar,
            accountId: APP_STATE.currentUser.accountId,
            image: APP_STATE.currentPhotoData,
            caption: elements.captionInput.value.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString() // For sorting before server timestamp arrives
        });

        cancelPhoto();

        setTimeout(() => {
            document.querySelector('.feed-section').scrollIntoView({ behavior: 'smooth' });
        }, 300);

    } catch (error) {
        console.error('Post photo error:', error);
        alert('Lỗi khi đăng ảnh: ' + error.message);
    }
}

// ===== Photos Feed =====
function setupPhotosListener() {
    // Simple approach: Listen to ALL photos and filter client-side
    // This avoids Firestore 'in' query limitations
    const photosRef = db.collection('photos')
        .orderBy('createdAt', 'desc')
        .limit(100);

    const unsubscribe = photosRef.onSnapshot(async (snapshot) => {
        // Get friend UIDs
        const friendsSnapshot = await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friends')
            .get();

        const friendUids = friendsSnapshot.docs.map(doc => doc.data().friendUid);
        friendUids.push(APP_STATE.currentUser.uid); // Include own photos

        // Filter photos from friends only
        const friendPhotos = snapshot.docs.filter(doc =>
            friendUids.includes(doc.data().userId)
        );

        renderFeed(friendPhotos);
    });

    APP_STATE.unsubscribers.push(unsubscribe);
}

function renderFeed(snapshot) {
    if (!snapshot || snapshot.empty) {
        elements.photoFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📸</div>
                <p>Chưa có ảnh nào</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Chụp ảnh đầu tiên của bạn hoặc thêm bạn bè!</p>
            </div>
        `;
        return;
    }

    const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    elements.photoFeed.innerHTML = photos.map(photo => {
        // Get reactions
        const reactionsHTML = '';  // Will implement reactions next

        return `
            <div class="photo-card">
                <div class="photo-card-header">
                    <div class="user-avatar">${photo.userAvatar}</div>
                    <div class="user-info">
                        <h3>${photo.userName}</h3>
                        <p>${formatTimestamp(photo.timestamp || photo.createdAt)}</p>
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
                    <div id="reactionsContainer-${photo.id}"></div>
                </div>
            </div>
        `;
    }).join('');

    // Setup reactions listeners for each photo
    photos.forEach(photo => {
        setupReactionsListener(photo.id);
    });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Vừa xong';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

// ===== Reactions =====
function setupReactionsListener(photoId) {
    const reactionsRef = db.collection('photos').doc(photoId)
        .collection('reactions');

    reactionsRef.onSnapshot((snapshot) => {
        if (snapshot.empty) return;

        const reactions = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!reactions[data.emoji]) {
                reactions[data.emoji] = [];
            }
            reactions[data.emoji].push(data.userName);
        });

        const container = document.getElementById(`reactionsContainer-${photoId}`);
        if (container) {
            container.innerHTML = `
                <div class="reactions-display">
                    ${Object.entries(reactions).map(([emoji, users]) =>
                `<div class="reaction-item">${emoji} ${users.length}</div>`
            ).join('')}
                </div>
            `;
        }
    });
}

function openReactionModal(photoId) {
    APP_STATE.currentReactionPhotoId = photoId;
    openModal(elements.reactionsModal);
}

async function addReaction(emoji) {
    if (!APP_STATE.currentReactionPhotoId) return;

    try {
        const photoRef = db.collection('photos').doc(APP_STATE.currentReactionPhotoId);
        const reactionsRef = photoRef.collection('reactions');

        // Check if user already reacted with this emoji
        const existingReaction = await reactionsRef
            .where('userId', '==', APP_STATE.currentUser.uid)
            .where('emoji', '==', emoji)
            .get();

        if (existingReaction.empty) {
            // Add new reaction
            await reactionsRef.add({
                userId: APP_STATE.currentUser.uid,
                userName: APP_STATE.currentUser.displayName,
                emoji: emoji,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        closeModal(elements.reactionsModal);

    } catch (error) {
        console.error('Add reaction error:', error);
    }
}

// ===== Modal Functions =====
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = tabName === 'myFriends'
        ? document.getElementById('myFriendsTab')
        : document.getElementById('suggestedTab');
    targetContent.classList.add('active');

    if (tabName === 'suggested') {
        renderSuggestedFriends();
    }
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);
