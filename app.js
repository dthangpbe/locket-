// ===== FIREBASE LOCKET APP - REAL-TIME VERSION =====
// Uses Firebase Auth + Firestore for real online connections

// ===== Application State =====
const APP_STATE = {
    currentUser: null,
    unsubscribers: [], // Store Firestore listeners for cleanup
    currentPhotoData: null,
    currentReactionPhotoId: null,
    stream: null,
    selectedFriendFilter: 'all' // Filter feed by friend
};

// Camera state
let currentStream = null;
let currentFacingMode = 'user';

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
    friendCount: document.querySelector('.friend-count'),
    // Profile elements
    profileBtn: document.getElementById('profileBtn'),
    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    profileView: document.getElementById('profileView'),
    profileEdit: document.getElementById('profileEdit'),
    profileAvatarDisplay: document.getElementById('profileAvatarDisplay'),
    profileAvatarImg: document.getElementById('profileAvatarImg'),
    profileAvatarEmoji: document.getElementById('profileAvatarEmoji'),
    profileDisplayName: document.getElementById('profileDisplayName'),
    profileAccountId: document.getElementById('profileAccountId'),
    profileFriendCount: document.getElementById('profileFriendCount'),
    profileBioText: document.getElementById('profileBioText'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    avatarPreview: document.getElementById('avatarPreview'),
    avatarPreviewImg: document.getElementById('avatarPreviewImg'),
    avatarPreviewEmoji: document.getElementById('avatarPreviewEmoji'),
    avatarInput: document.getElementById('avatarInput'),
    uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
    removeAvatarBtn: document.getElementById('removeAvatarBtn'),
    editDisplayName: document.getElementById('editDisplayName'),
    editBio: document.getElementById('editBio'),
    bioCharCount: document.getElementById('bioCharCount'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),
    // Notification elements
    notificationsBtn: document.getElementById('notificationsBtn'),
    notifBadge: document.getElementById('notifBadge'),
    notificationsModal: document.getElementById('notificationsModal'),
    closeNotificationsModal: document.getElementById('closeNotificationsModal'),
    notificationsList: document.getElementById('notificationsList'),
    // Header avatar
    headerAvatar: document.getElementById('headerAvatar'),
    // Camera and theme controls
    flipCameraBtn: document.getElementById('flipCameraBtn'),
    themeToggle: document.getElementById('themeToggle'),
    albumsModal: document.getElementById('albumsModal'),
    createAlbumModal: document.getElementById('createAlbumModal'),
    albumDetailModal: document.getElementById('albumDetailModal')
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

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Friends
    elements.friendsBtn.addEventListener('click', () => openModal(elements.friendsModal));
    elements.closeFriendsModal.addEventListener('click', () => closeModal(elements.friendsModal));

    // Friend search
    elements.friendSearchInput.addEventListener('input', handleFriendSearch);

    // Camera
    elements.captureBtn.addEventListener('click', capturePhoto);
    elements.flipCameraBtn.addEventListener('click', flipCamera);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.cancelBtn.addEventListener('click', cancelPhoto);
    elements.postBtn.addEventListener('click', postPhoto);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Albums
    document.getElementById('albumsBtn').addEventListener('click', () => {
        renderAlbums();
        openModal(elements.albumsModal);
    });

    document.getElementById('createAlbumBtn').addEventListener('click', () => {
        document.getElementById('albumName').value = '';
        document.getElementById('albumDescription').value = '';
        openModal(elements.createAlbumModal);
    });

    document.getElementById('saveAlbumBtn').addEventListener('click', async () => {
        const name = document.getElementById('albumName').value.trim();
        if (!name) {
            alert('Vui lòng nhập tên album!');
            return;
        }
        const description = document.getElementById('albumDescription').value.trim();
        await createAlbum(name, description);
        closeModal(elements.createAlbumModal);
        renderAlbums();
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

    // Profile
    elements.profileBtn.addEventListener('click', openProfileModal);
    elements.closeProfileModal.addEventListener('click', () => closeModal(elements.profileModal));
    elements.editProfileBtn.addEventListener('click', switchToEditMode);
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
    elements.uploadAvatarBtn.addEventListener('click', () => elements.avatarInput.click());
    elements.avatarInput.addEventListener('change', handleAvatarUpload);
    elements.removeAvatarBtn.addEventListener('click', removeAvatar);
    elements.editBio.addEventListener('input', updateBioCharCount);
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    elements.profileModal.addEventListener('click', (e) => {
        if (e.target === elements.profileModal) closeModal(elements.profileModal);
    });

    // Notifications
    elements.notificationsBtn.addEventListener('click', () => openModal(elements.notificationsModal));
    elements.closeNotificationsModal.addEventListener('click', () => closeModal(elements.notificationsModal));
    elements.notificationsModal.addEventListener('click', (e) => {
        if (e.target === elements.notificationsModal) closeModal(elements.notificationsModal);
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
            bio: '', // Empty bio for new users
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

    // Setup real-time listeners
    setupFriendsListener();
    setupPhotosListener();
    setupNotificationsListener();
    updateFriendCount();
    updateHeaderAvatar();
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

async function renderFriends(snapshot) {
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

    // Fetch latest user data for each friend
    const friendDataPromises = friends.map(async (friend) => {
        try {
            const userDoc = await db.collection('users').doc(friend.friendUid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                return {
                    ...friend,
                    displayName: userData.displayName || friend.displayName,
                    avatar: userData.avatar || friend.avatar,
                    avatarImage: userData.avatarImage
                };
            }
        } catch (error) {
            console.warn('Could not fetch friend data:', error);
        }
        return friend;
    });

    const updatedFriends = await Promise.all(friendDataPromises);

    elements.friendsList.innerHTML = updatedFriends.map(friend => {
        const avatarHTML = friend.avatarImage
            ? `<img src="${friend.avatarImage}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : friend.avatar;

        return `
            <div class="friend-item">
                <div class="friend-avatar" onclick="viewUserProfile('${friend.friendUid}')" style="cursor: pointer;">
                    ${avatarHTML}
                </div>
                <div class="friend-info">
                    <h4>${friend.displayName}</h4>
                    <p>${friend.accountId}</p>
                </div>
                <button class="friend-action remove" onclick="removeFriend('${friend.friendUid}')">Xóa</button>
            </div>
        `;
    }).join('');
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

// Helpers: exact -> nếu lỗi thì fallback ideal + thông báo
function showCameraMessage(msg, type = 'info') {
    // Nếu bạn có element để hiển thị message thì dùng (không có thì alert)
    if (elements && elements.cameraMsg) {
        elements.cameraMsg.textContent = msg;
        elements.cameraMsg.style.display = 'block';
        elements.cameraMsg.dataset.type = type; // bạn tự style theo type nếu muốn
        return;
    }
    console[type === 'error' ? 'error' : 'log']('[Camera]', msg);
    // Nếu không muốn popup thì comment dòng dưới:
    // alert(msg);
}

// ✅ Mirror bằng class + CSS !important (ổn định nhất)
function applyPreviewMirror(mode) {
    const v = elements.cameraPreview;
    if (!v) return;

    if (mode === 'user') v.classList.add('mirror');
    else v.classList.remove('mirror');
}

async function getStreamWithExactThenIdeal(mode) {
    const baseVideo = {
        width: { ideal: 1080 },
        height: { ideal: 1080 }
    };

    // 1) Try EXACT
    try {
        const exactConstraints = {
            video: { ...baseVideo, facingMode: { exact: mode } },
            audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(exactConstraints);
        return { stream, usedFallback: false };
    } catch (err) {
        const name = err?.name || '';
        const isConstraintFail =
            name === 'OverconstrainedError' ||
            name === 'ConstraintNotSatisfiedError' ||
            name === 'NotFoundError';

        // Nếu là lỗi quyền/https... thì không retry
        if (!isConstraintFail) throw err;

        // 2) Fallback IDEAL
        const idealConstraints = {
            video: { ...baseVideo, facingMode: { ideal: mode } },
            audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(idealConstraints);
        return { stream, usedFallback: true, exactError: err };
    }
}

async function initCamera() {
    try {
        // ✅ FIX: đảm bảo biến trạng thái được set ngay từ đầu
        currentFacingMode = 'user';

        const { stream, usedFallback } = await getStreamWithExactThenIdeal(currentFacingMode);

        currentStream = stream;

        // ✅ set mirror trước để tránh nháy
        applyPreviewMirror(currentFacingMode);

        // ✅ apply lại đúng thời điểm stream mới load vào video
        elements.cameraPreview.onloadedmetadata = async () => {
            applyPreviewMirror(currentFacingMode);
            try { await elements.cameraPreview.play(); } catch { }
        };

        elements.cameraPreview.srcObject = currentStream;
        APP_STATE.stream = currentStream;

        if (usedFallback) {
            showCameraMessage(
                'Không thể ép camera (exact). Đã chuyển sang chế độ dự phòng (ideal) — có thể không đúng camera bạn chọn.',
                'info'
            );
        }
    } catch (error) {
        console.error('Camera error:', error);
        elements.cameraPreview.style.display = 'none';
        elements.cameraPreview.parentElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                <p style="color: #b4b4c8;">Không thể truy cập camera</p>
                <p style="color: #b4b4c8; font-size: 0.9rem; margin-top: 0.5rem;">Vui lòng cấp quyền camera</p>
            </div>
        `;

        if (error?.name === 'NotAllowedError') {
            showCameraMessage('Bạn đã từ chối quyền camera. Hãy cấp quyền để sử dụng.', 'error');
        } else {
            showCameraMessage('Không thể mở camera. Vui lòng thử lại hoặc đổi trình duyệt.', 'error');
        }
    }
}

// Flip between front and rear camera
async function flipCamera() {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // ✅ toggle dựa trên currentFacingMode
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        const { stream, usedFallback } = await getStreamWithExactThenIdeal(currentFacingMode);

        currentStream = stream;

        // ✅ set mirror trước để tránh nháy
        applyPreviewMirror(currentFacingMode);

        // ✅ apply lại đúng thời điểm stream mới load vào video
        elements.cameraPreview.onloadedmetadata = async () => {
            applyPreviewMirror(currentFacingMode);
            try { await elements.cameraPreview.play(); } catch { }
        };

        elements.cameraPreview.srcObject = currentStream;
        APP_STATE.stream = currentStream;

        if (usedFallback) {
            const wantText = currentFacingMode === 'environment' ? 'camera sau' : 'camera trước';
            showCameraMessage(
                `Không thể ép ${wantText} (exact). Đã chuyển sang chế độ dự phòng (ideal) — có thể máy đã chọn camera khác.`,
                'info'
            );
        }
    } catch (error) {
        console.error('Flip camera error:', error);

        if (error?.name === 'NotAllowedError') {
            showCameraMessage('Bạn chưa cấp quyền camera nên không thể chuyển.', 'error');
        } else {
            showCameraMessage('Không thể chuyển camera. Vui lòng thử lại.', 'error');
        }
    }
}

function capturePhoto() {
    const video = elements.cameraPreview;
    const canvas = elements.photoCanvas;
    const ctx = canvas.getContext('2d');

    // Resize to max 800x800 to keep Base64 size under 500KB
    const maxSize = 800;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxSize || height > maxSize) {
        if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
        } else {
            width = (width / height) * maxSize;
            height = maxSize;
        }
    }

    canvas.width = width;
    canvas.height = height;

    // ✅ reset transform để không bị "dính" flip giữa các lần chụp
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();

    // ✅ UN-mirror khi chụp từ camera trước (preview đang mirror)
    if (currentFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Lower quality to reduce size (0.7 instead of 0.9)
    const imageData = canvas.toDataURL('image/jpeg', 0.7);

    APP_STATE.currentPhotoData = imageData;
    elements.capturedImg.src = imageData;
    elements.capturedPhoto.style.display = 'block';
    elements.captionSection.style.display = 'block';
    elements.captureBtn.style.display = 'none';

    // Load albums into dropdown
    loadAlbumsToSelect();
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
        const photoRef = await db.collection('photos').add({
            userId: APP_STATE.currentUser.uid,
            userName: APP_STATE.currentUser.displayName,
            userAvatar: APP_STATE.currentUser.avatar,
            accountId: APP_STATE.currentUser.accountId,
            image: APP_STATE.currentPhotoData,
            caption: elements.captionInput.value.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        });

        // Add to selected album if user chose one
        const selectedAlbumId = document.getElementById('albumSelect').value;
        if (selectedAlbumId) {
            await addPhotoToAlbum(photoRef.id, selectedAlbumId);
        }

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
        // Get friend UIDs and AccountIDs
        const friendsSnapshot = await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('friends')
            .get();

        const friendUids = friendsSnapshot.docs.map(doc => doc.data().friendUid);
        const friendAccountIds = friendsSnapshot.docs.map(doc => doc.data().accountId);
        friendUids.push(APP_STATE.currentUser.uid); // Include own photos
        friendAccountIds.push(APP_STATE.currentUser.accountId);

        // Filter photos from friends - support BOTH userId and accountId for backward compatibility
        const friendPhotos = snapshot.docs.filter(doc => {
            const data = doc.data();
            return friendUids.includes(data.userId) || friendAccountIds.includes(data.accountId);
        });

        renderFeed(friendPhotos);
    });

    APP_STATE.unsubscribers.push(unsubscribe);
}

async function renderFeed(photoDocs) {
    if (!photoDocs || photoDocs.length === 0) {
        elements.photoFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📸</div>
                <p>Chưa có ảnh nào</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Chụp ảnh đầu tiên của bạn hoặc thêm bạn bè!</p>
            </div>
        `;
        return;
    }

    const photos = photoDocs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch latest user data for each unique userId
    const userDataCache = {};
    await Promise.all(photos.map(async (photo) => {
        if (photo.userId && !userDataCache[photo.userId]) {
            try {
                const userDoc = await db.collection('users').doc(photo.userId).get();
                if (userDoc.exists) {
                    userDataCache[photo.userId] = userDoc.data();
                }
            } catch (error) {
                console.warn('Could not fetch user:', error);
            }
        }
    }));

    elements.photoFeed.innerHTML = photos.map(photo => {
        // Get latest user data
        const userData = userDataCache[photo.userId];
        const userName = userData?.displayName || photo.userName || 'Unknown';
        const userAvatar = userData?.avatar || photo.userAvatar || '👤';
        const userAvatarImage = userData?.avatarImage;

        // Render avatar (image or emoji)
        const avatarHTML = userAvatarImage
            ? `<img src="${userAvatarImage}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : `<span>${userAvatar}</span>`;

        return `
            <div class="photo-card">
                <div class="photo-card-header">
                    <div class="user-avatar" onclick="viewUserProfile('${photo.userId}')" style="cursor: pointer;">
                        ${avatarHTML}
                    </div>
                    <div class="user-info">
                        <h3 onclick="viewUserProfile('${photo.userId}')" style="cursor: pointer;">${userName}</h3>
                        <p>${formatTimestamp(photo.timestamp || photo.createdAt)}</p>
                    </div>
                </div>
                <div class="photo-card-image">
                    ${photo.userId === APP_STATE.currentUser.uid ? `<button class="delete-photo-btn" onclick="deletePhoto('${photo.id}')">🗑️ Xóa</button>` : ''}
                    <img src="${photo.image}" alt="Photo">
                </div>
                <div class="photo-card-content">
                    ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
                    <div class="photo-reactions">
                        <button class="reaction-btn" onclick="openReactionModal('${photo.id}')">
                            😊
                        </button>
                    </div>
                    <div id="reactionsContainer-${photo.id}"></div>
                    
                    <!-- Comments Section -->
                    <div class="comments-section">
                        <div class="comment-input">
                            <input type="text" id="commentInput-${photo.id}" placeholder="Viết bình luận..." maxlength="200">
                            <button onclick="postComment('${photo.id}')" style="border-radius: 1.2rem !important; border: none !important;">Gửi</button>
                        </div>
                        <div id="commentsContainer-${photo.id}" class="comments-list"></div>
                        <div id="commentCount-${photo.id}" class="comment-count"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    photos.forEach(photo => {
        setupReactionsListener(photo.id);
        setupCommentsListener(photo.id);
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

        // Check if user already has a reaction (any emoji)
        const existingReaction = await reactionsRef
            .where('userId', '==', APP_STATE.currentUser.uid)
            .get();

        // Remove existing reaction if found
        if (!existingReaction.empty) {
            await existingReaction.docs[0].ref.delete();
        }

        // Add new reaction
        await reactionsRef.add({
            userId: APP_STATE.currentUser.uid,
            userName: APP_STATE.currentUser.displayName,
            emoji: emoji,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

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

// ===== Profile Functions =====
let pendingAvatarData = null;

async function openProfileModal() {
    // Load current user data
    const userDoc = await db.collection('users').doc(APP_STATE.currentUser.uid).get();
    const userData = userDoc.data();

    // Update profile view
    elements.profileDisplayName.textContent = userData.displayName || userData.username;
    elements.profileAccountId.textContent = userData.accountId;

    // Display avatar
    if (userData.avatarImage) {
        elements.profileAvatarImg.src = userData.avatarImage;
        elements.profileAvatarImg.style.display = 'block';
        elements.profileAvatarEmoji.style.display = 'none';
    } else {
        elements.profileAvatarEmoji.textContent = userData.avatar || '👤';
        elements.profileAvatarImg.style.display = 'none';
        elements.profileAvatarEmoji.style.display = 'block';
    }

    // Display bio
    elements.profileBioText.textContent = userData.bio || 'Chưa có tiểu sử';

    // Get friend count
    const friendsSnapshot = await db.collection('users').doc(APP_STATE.currentUser.uid)
        .collection('friends').get();
    elements.profileFriendCount.textContent = friendsSnapshot.size;

    // Show modal
    openModal(elements.profileModal);
}

async function viewUserProfile(userId) {
    if (!userId) return;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            alert('Không tìm thấy người dùng!');
            return;
        }

        const userData = userDoc.data();

        elements.profileDisplayName.textContent = userData.displayName || userData.username;
        elements.profileAccountId.textContent = userData.accountId;

        if (userData.avatarImage) {
            elements.profileAvatarImg.src = userData.avatarImage;
            elements.profileAvatarImg.style.display = 'block';
            elements.profileAvatarEmoji.style.display = 'none';
        } else {
            elements.profileAvatarEmoji.textContent = userData.avatar || '👤';
            elements.profileAvatarImg.style.display = 'none';
            elements.profileAvatarEmoji.style.display = 'block';
        }

        elements.profileBioText.textContent = userData.bio || 'Chưa có tiểu sử';

        const friendsSnapshot = await db.collection('users').doc(userId)
            .collection('friends').get();
        elements.profileFriendCount.textContent = friendsSnapshot.size;

        // Hide edit button if viewing someone else's profile
        if (userId === APP_STATE.currentUser.uid) {
            elements.editProfileBtn.style.display = 'block';
        } else {
            elements.editProfileBtn.style.display = 'none';
        }

        openModal(elements.profileModal);

    } catch (error) {
        console.error('View profile error:', error);
        alert('Lỗi khi xem profile: ' + error.message);
    }
}

function switchToEditMode() {
    elements.profileView.style.display = 'none';
    elements.profileEdit.style.display = 'block';

    // Load current values
    elements.editDisplayName.value = APP_STATE.currentUser.displayName || '';
    elements.editBio.value = APP_STATE.currentUser.bio || '';
    updateBioCharCount();

    // Set avatar preview
    if (APP_STATE.currentUser.avatarImage) {
        elements.avatarPreviewImg.src = APP_STATE.currentUser.avatarImage;
        elements.avatarPreviewImg.style.display = 'block';
        elements.avatarPreviewEmoji.style.display = 'none';
        elements.removeAvatarBtn.style.display = 'inline-block';
    } else {
        elements.avatarPreviewEmoji.textContent = APP_STATE.currentUser.avatar || '👤';
        elements.avatarPreviewImg.style.display = 'none';
        elements.avatarPreviewEmoji.style.display = 'block';
        elements.removeAvatarBtn.style.display = 'none';
    }
}

function cancelEdit() {
    elements.profileEdit.style.display = 'none';
    elements.profileView.style.display = 'block';
    pendingAvatarData = null;
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh!');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Compress and resize to 200x200
            const canvas = document.createElement('canvas');
            const maxSize = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedData = canvas.toDataURL('image/jpeg', 0.8);
            pendingAvatarData = compressedData;

            elements.avatarPreviewImg.src = compressedData;
            elements.avatarPreviewImg.style.display = 'block';
            elements.avatarPreviewEmoji.style.display = 'none';
            elements.removeAvatarBtn.style.display = 'inline-block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeAvatar() {
    pendingAvatarData = 'removed';
    elements.avatarPreviewImg.style.display = 'none';
    elements.avatarPreviewEmoji.style.display = 'block';
    elements.avatarPreviewEmoji.textContent = getRandomAvatar();
    elements.removeAvatarBtn.style.display = 'none';
}

function updateBioCharCount() {
    const length = elements.editBio.value.length;
    elements.bioCharCount.textContent = `${length}/150`;
}

async function saveProfile() {
    const newDisplayName = elements.editDisplayName.value.trim();
    const newBio = elements.editBio.value.trim();

    if (!newDisplayName) {
        alert('Vui lòng nhập tên hiển thị!');
        return;
    }

    if (newDisplayName.length > 30) {
        alert('Tên hiển thị quá dài (tối đa 30 ký tự)!');
        return;
    }

    if (newBio.length > 150) {
        alert('Tiểu sử quá dài (tối đa 150 ký tự)!');
        return;
    }

    try {
        const updateData = {
            displayName: newDisplayName,
            bio: newBio
        };

        if (pendingAvatarData === 'removed') {
            updateData.avatarImage = firebase.firestore.FieldValue.delete();
            updateData.avatar = getRandomAvatar();
        } else if (pendingAvatarData) {
            updateData.avatarImage = pendingAvatarData;
        }

        await db.collection('users').doc(APP_STATE.currentUser.uid).update(updateData);

        APP_STATE.currentUser.displayName = newDisplayName;
        APP_STATE.currentUser.bio = newBio;
        if (pendingAvatarData === 'removed') {
            delete APP_STATE.currentUser.avatarImage;
            APP_STATE.currentUser.avatar = updateData.avatar;
        } else if (pendingAvatarData) {
            APP_STATE.currentUser.avatarImage = pendingAvatarData;
        }

        pendingAvatarData = null;
        await openProfileModal();
        cancelEdit();

    } catch (error) {
        console.error('Save profile error:', error);
        alert('Lỗi khi lưu profile: ' + error.message);
    }
}

// ===== Comments Functions =====
async function postComment(photoId) {
    const input = document.getElementById(`commentInput-${photoId}`);
    const commentText = input.value.trim();

    if (!commentText) {
        alert('Vui lòng nhập bình luận!');
        return;
    }

    if (commentText.length > 200) {
        alert('Bình luận quá dài (tối đa 200 ký tự)!');
        return;
    }

    try {
        await db.collection('photos').doc(photoId)
            .collection('comments').add({
                userId: APP_STATE.currentUser.uid,
                userName: APP_STATE.currentUser.displayName || APP_STATE.currentUser.username,
                userAvatar: APP_STATE.currentUser.avatar,
                userAvatarImage: APP_STATE.currentUser.avatarImage,
                comment: commentText,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        input.value = '';

        // Send notification to photo owner
        const photoDoc = await db.collection('photos').doc(photoId).get();
        if (photoDoc.exists) {
            await createNotification(photoDoc.data().userId, 'comment', {
                photoId: photoId,
                message: 'đã bình luận ảnh của bạn'
            });
        }
    } catch (error) {
        console.error('Post comment error:', error);
        alert('Lỗi khi đăng bình luận: ' + error.message);
    }
}

function setupCommentsListener(photoId) {
    const commentsRef = db.collection('photos').doc(photoId)
        .collection('comments')
        .orderBy('createdAt', 'asc');

    const unsubscribe = commentsRef.onSnapshot((snapshot) => {
        renderComments(photoId, snapshot);
    });

    APP_STATE.unsubscribers.push(unsubscribe);
}

function renderComments(photoId, snapshot) {
    const container = document.getElementById(`commentsContainer-${photoId}`);
    const countElement = document.getElementById(`commentCount-${photoId}`);

    if (!container || !countElement) return;

    if (!snapshot || snapshot.empty) {
        container.innerHTML = '';
        countElement.textContent = '';
        return;
    }

    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const parentComments = comments.filter(c => !c.replyTo);

    countElement.textContent = `${comments.length} bình luận`;

    container.innerHTML = parentComments.map(comment => {
        const replies = comments.filter(c => c.replyTo === comment.id);
        const avatarHTML = comment.userAvatarImage
            ? `<img src="${comment.userAvatarImage}" alt="Avatar">`
            : (comment.userAvatar || '👤');

        return `
            <div class="comment-item">
                <div class="comment-avatar" onclick="viewUserProfile('${comment.userId}')">${avatarHTML}</div>
                <div class="comment-content">
                    <div class="comment-author">${comment.userName}</div>
                    <div class="comment-text">${comment.comment}</div>
                    <div class="comment-time">${formatTimestamp(comment.createdAt)}</div>
                    <div class="comment-actions">
                        <button class="reply-btn" onclick="showReplyInput('${photoId}', '${comment.id}', '${comment.userName}')">Trả lời</button>
                        ${comment.userId === APP_STATE.currentUser.uid ? `<button class="comment-delete" onclick="deleteComment('${photoId}', '${comment.id}')">Xóa</button>` : ''}
                    </div>
                </div>
            </div>
            <div id="replyInput-${comment.id}" class="reply-input comment-input">
                <input type="text" maxlength="200" placeholder="Trả lời @${comment.userName}...">
                <button onclick="postReply('${photoId}', '${comment.id}', '${comment.userId}', '${comment.userName}')" style="border-radius: 1.2rem !important; border: none !important;">Gửi</button>
                <button onclick="document.getElementById('replyInput-${comment.id}').classList.remove('active')" class="secondary-btn">Hủy</button>
            </div>
            ${replies.length > 0 ? `
                <div class="comment-replies">
                    ${replies.map(reply => {
            const replyAvatarHTML = reply.userAvatarImage
                ? `<img src="${reply.userAvatarImage}" alt="Avatar">`
                : (reply.userAvatar || '👤');
            return `
                            <div class="comment-item reply-item">
                                <div class="comment-avatar" onclick="viewUserProfile('${reply.userId}')">${replyAvatarHTML}</div>
                                <div class="comment-content">
                                    <div class="comment-author">
                                        ${reply.userName}
                                        <span class="replying-to">→ @${reply.replyToUser}</span>
                                    </div>
                                    <div class="comment-text">${reply.comment}</div>
                                    <div class="comment-time">${formatTimestamp(reply.createdAt)}</div>
                                    ${reply.userId === APP_STATE.currentUser.uid ? `<button class="comment-delete" onclick="deleteComment('${photoId}', '${reply.id}')">Xóa</button>` : ''}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            ` : ''}
        `;
    }).join('');
}

// ===== Delete Photo Function =====
async function deletePhoto(photoId) {
    if (!confirm('Bạn có chắc muốn xóa ảnh này? Hành động này không thể hoàn tác.')) {
        return;
    }

    try {
        await db.collection('photos').doc(photoId).delete();
        // Feed will auto-update via listener
    } catch (error) {
        console.error('Delete photo error:', error);
        alert('Lỗi khi xóa ảnh: ' + error.message);
    }
}

// ===== Notifications System =====
async function createNotification(toUserId, type, data) {
    if (toUserId === APP_STATE.currentUser.uid) return;

    const notification = {
        type: type,
        fromUserId: APP_STATE.currentUser.uid,
        fromUserName: APP_STATE.currentUser.displayName || APP_STATE.currentUser.username,
        fromUserAvatar: APP_STATE.currentUser.avatar,
        fromUserAvatarImage: APP_STATE.currentUser.avatarImage,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...data
    };

    try {
        await db.collection('users').doc(toUserId).collection('notifications').add(notification);
    } catch (error) {
        console.error('Create notification error:', error);
    }
}

function setupNotificationsListener() {
    const notifsRef = db.collection('users').doc(APP_STATE.currentUser.uid)
        .collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(50);

    const unsubscribe = notifsRef.onSnapshot((snapshot) => {
        const unreadCount = snapshot.docs.filter(d => !d.data().read).length;

        if (unreadCount > 0) {
            elements.notifBadge.textContent = unreadCount;
            elements.notifBadge.style.display = 'block';
        } else {
            elements.notifBadge.style.display = 'none';
        }

        renderNotifications(snapshot);
    });

    APP_STATE.unsubscribers.push(unsubscribe);
}

function renderNotifications(snapshot) {
    if (!snapshot || snapshot.empty) {
        elements.notificationsList.innerHTML = '<div class="empty-state"><p>Chưa có thông báo</p></div>';
        return;
    }

    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    elements.notificationsList.innerHTML = notifications.map(notif => {
        const avatarHTML = notif.fromUserAvatarImage
            ? `<img src="${notif.fromUserAvatarImage}" alt="Avatar">`
            : (notif.fromUserAvatar || '👤');

        return `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                 onclick="handleNotificationClick('${notif.id}', '${notif.photoId || ''}', '${notif.fromUserId}')">
                <div class="notification-avatar">${avatarHTML}</div>
                <div class="notification-content">
                    <p><strong>${notif.fromUserName}</strong> ${notif.message}</p>
                    <span class="notification-time">${formatTimestamp(notif.createdAt)}</span>
                </div>
                ${!notif.read ? '<div class="notification-indicator"></div>' : ''}
                <button class="notification-delete" onclick="event.stopPropagation(); deleteNotification('${notif.id}')">×</button>
            </div>
        `;
    }).join('');
}

async function handleNotificationClick(notifId, photoId, fromUserId) {
    try {
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('notifications').doc(notifId).update({ read: true });

        closeModal(elements.notificationsModal);

        if (photoId && photoId !== 'undefined') {
            document.getElementById(`photoCard-${photoId}`)?.scrollIntoView({ behavior: 'smooth' });
        } else if (fromUserId) {
            await viewUserProfile(fromUserId);
        }
    } catch (error) {
        console.error('Handle notification error:', error);
    }
}

async function deleteNotification(notifId) {
    try {
        await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('notifications').doc(notifId).delete();
    } catch (error) {
        console.error('Delete notification error:', error);
    }
}

async function clearReadNotifications() {
    try {
        const snapshot = await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('notifications').where('read', '==', true).get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (error) {
        console.error('Clear notifications error:', error);
    }
}

// ===== Comment Replies =====
function showReplyInput(photoId, commentId, userName) {
    const replyInput = document.getElementById(`replyInput-${commentId}`);
    if (replyInput) {
        replyInput.classList.add('active');
        const input = replyInput.querySelector('input');
        input.placeholder = `Trả lời @${userName}...`;
        input.focus();
    }
}

async function postReply(photoId, parentCommentId, parentUserId, parentUserName) {
    const input = document.getElementById(`replyInput-${parentCommentId}`).querySelector('input');
    const replyText = input.value.trim();

    if (!replyText) {
        alert('Vui lòng nhập nội dung trả lời!');
        return;
    }

    try {
        await db.collection('photos').doc(photoId).collection('comments').add({
            userId: APP_STATE.currentUser.uid,
            userName: APP_STATE.currentUser.displayName || APP_STATE.currentUser.username,
            userAvatar: APP_STATE.currentUser.avatar,
            userAvatarImage: APP_STATE.currentUser.avatarImage,
            comment: replyText,
            replyTo: parentCommentId,
            replyToUser: parentUserName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
        document.getElementById(`replyInput-${parentCommentId}`).classList.remove('active');

        await createNotification(parentUserId, 'reply', {
            photoId: photoId,
            commentId: parentCommentId,
            message: 'đã trả lời bình luận của bạn'
        });
    } catch (error) {
        console.error('Post reply error:', error);
        alert('Lỗi khi đăng trả lời: ' + error.message);
    }
}

// ===== UI Helper Functions =====
function updateHeaderAvatar() {
    if (!APP_STATE.currentUser) return;

    const avatarHTML = APP_STATE.currentUser.avatarImage
        ? `<img src="${APP_STATE.currentUser.avatarImage}" alt="Avatar">`
        : APP_STATE.currentUser.avatar || '👤';

    elements.headerAvatar.innerHTML = avatarHTML;
}

async function deleteComment(photoId, commentId) {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) {
        return;
    }

    try {
        await db.collection('photos').doc(photoId)
            .collection('comments').doc(commentId).delete();
    } catch (error) {
        console.error('Delete comment error:', error);
        alert('Lỗi khi xóa bình luận: ' + error.message);
    }
}

// ===== Camera & Theme Functions =====
async function flipCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode },
            audio: false
        });
        elements.cameraPreview.srcObject = stream;
        currentStream = stream;
    } catch (error) {
        console.error('Camera flip error:', error);
        alert('Không thể chuyển camera.');
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    elements.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (elements.themeToggle) {
        elements.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init();
});

// ===== ALBUMS FUNCTIONS =====

// Create new album
async function createAlbum(name, description) {
    try {
        const albumRef = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums').add({
                name,
                description: description || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                photoCount: 0,
                coverPhotoUrl: null
            });
        console.log('Album created:', albumRef.id);
        return albumRef.id;
    } catch (error) {
        console.error('Error creating album:', error);
        alert('Không thể tạo album. Vui lòng thử lại!');
    }
}

// Render albums list
async function renderAlbums() {
    try {
        const albumsSnapshot = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .orderBy('createdAt', 'desc')
            .get();

        const albumsList = document.getElementById('albumsList');

        if (albumsSnapshot.empty) {
            albumsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Chưa có album nào. Tạo album đầu tiên!</p>';
            return;
        }

        const albumsHTML = albumsSnapshot.docs.map(doc => {
            const album = doc.data();
            const coverImg = album.coverPhotoUrl
                ? `<img src="${album.coverPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`
                : '📁';

            return `
                <div class="album-card" onclick="openAlbum('${doc.id}', '${album.name.replace(/'/g, "\\'")}', ${album.photoCount})">
                    <div class="album-cover">${coverImg}</div>
                    <h3 class="album-name">${album.name}</h3>
                    <p class="album-photo-count">${album.photoCount} ảnh</p>
                    ${album.description ? `<p class="album-desc">${album.description}</p>` : ''}
                </div>
            `;
        }).join('');

        albumsList.innerHTML = albumsHTML;
    } catch (error) {
        console.error('Error rendering albums:', error);
    }
}

// Open album detail
async function openAlbum(albumId, albumName, photoCount) {
    try {
        // Set album info
        document.getElementById('albumDetailTitle').textContent = albumName;

        // Get album details for description
        const albumDoc = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId)
            .get();

        const albumData = albumDoc.data();
        document.getElementById('albumDetailDesc').textContent =
            albumData.description || `${photoCount} ảnh`;

        // Fetch photos in this album
        const albumPhotosSnapshot = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId)
            .collection('photos')
            .orderBy('addedAt', 'desc')
            .get();

        const albumPhotosGrid = document.getElementById('albumPhotosGrid');

        if (albumPhotosSnapshot.empty) {
            albumPhotosGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Album trống. Thêm ảnh vào album khi đăng ảnh mới!</p>';
        } else {
            // Fetch actual photo data
            const photoIds = albumPhotosSnapshot.docs.map(doc => doc.data().photoRef.id);
            const photosPromises = photoIds.map(photoId =>
                db.collection('photos').doc(photoId).get()
            );

            const photosDocs = await Promise.all(photosPromises);

            const photosHTML = photosDocs
                .filter(doc => doc.exists)
                .map(doc => {
                    const photo = doc.data();
                    return `
                        <div class="album-photo-item">
                            <img src="${photo.image}" alt="Photo">
                            <button class="remove-from-album-btn" 
                                onclick="removePhotoFromAlbum('${albumId}', '${doc.id}', event)">
                                🗑️
                            </button>
                        </div>
                    `;
                }).join('');

            albumPhotosGrid.innerHTML = photosHTML;
        }

        openModal(elements.albumDetailModal);
    } catch (error) {
        console.error('Error opening album:', error);
    }
}

// Remove photo from album
async function removePhotoFromAlbum(albumId, photoId, event) {
    event.stopPropagation();

    if (!confirm('Xóa ảnh khỏi album này?')) return;

    try {
        await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId)
            .collection('photos')
            .doc(photoId).delete();

        // Update photo count
        await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId).update({
                photoCount: firebase.firestore.FieldValue.increment(-1)
            });

        // Refresh album view
        const albumDoc = await db.collection('users').doc(APP_STATE.currentUser.uid)
            .collection('albums').doc(albumId).get();
        const albumData = albumDoc.data();

        openAlbum(albumId, albumData.name, albumData.photoCount);
        renderAlbums(); // Update albums list
    } catch (error) {
        console.error('Error removing photo from album:', error);
        alert('Không thể xóa ảnh. Vui lòng thử lại!');
    }
}

// Add photo to album (called during photo upload)
async function addPhotoToAlbum(photoId, albumId) {
    try {
        await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId)
            .collection('photos')
            .doc(photoId).set({
                photoRef: db.collection('photos').doc(photoId),
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Update photo count and cover photo if first photo
        const albumRef = db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .doc(albumId);

        const albumDoc = await albumRef.get();
        const updates = {
            photoCount: firebase.firestore.FieldValue.increment(1)
        };

        // Set cover photo if this is first photo
        if (!albumDoc.data().coverPhotoUrl) {
            const photoDoc = await db.collection('photos').doc(photoId).get();
            updates.coverPhotoUrl = photoDoc.data().image;
        }

        await albumRef.update(updates);
    } catch (error) {
        console.error('Error adding photo to album:', error);
    }
}

// Load user's albums into select dropdown
async function loadAlbumsToSelect() {
    try {
        const albumsSnapshot = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('albums')
            .orderBy('createdAt', 'desc')
            .get();

        const albumSelect = document.getElementById('albumSelect');

        // Clear existing options except first one
        albumSelect.innerHTML = '<option value="">Không thêm vào album</option>';

        // Add albums as options
        albumsSnapshot.docs.forEach(doc => {
            const album = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = album.name;
            albumSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

// Logo click to scroll to top
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.app-title');
    if (logo) {
        logo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Friend filter setup
    const friendFilter = document.getElementById('friendFilter');
    if (friendFilter) {
        friendFilter.addEventListener('change', handleFriendFilterChange);
    }
});

// Populate friend filter dropdown with user's friends
async function populateFriendFilter() {
    if (!APP_STATE.currentUser) return;

    const friendFilter = document.getElementById('friendFilter');
    if (!friendFilter) return;

    try {
        // Get user's friends
        const friendsSnapshot = await db.collection('users')
            .doc(APP_STATE.currentUser.uid)
            .collection('friends')
            .where('status', '==', 'accepted')
            .get();

        // Clear existing options except "All Friends"
        friendFilter.innerHTML = '<option value="all">Tất cả bạn bè</option>';

        // Add friend options
        for (const friendDoc of friendsSnapshot.docs) {
            const friendData = friendDoc.data();
            const friendId = friendDoc.id;

            // Get friend's user data
            const friendUserDoc = await db.collection('users').doc(friendId).get();
            if (friendUserDoc.exists) {
                const friendUser = friendUserDoc.data();
                const option = document.createElement('option');
                option.value = friendId;
                option.textContent = `${friendUser.username} (${friendUser.accountId})`;
                friendFilter.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error populating friend filter:', error);
    }
}

// Handle friend filter change
function handleFriendFilterChange(e) {
    APP_STATE.selectedFriendFilter = e.target.value;
    filterPhotoFeed();
}

// Filter photo feed based on selected friend
function filterPhotoFeed() {
    const photoFeed = document.getElementById('photoFeed');
    if (!photoFeed) return;

    const selectedFilter = APP_STATE.selectedFriendFilter;
    const photoCards = photoFeed.querySelectorAll('.photo-card');

    photoCards.forEach(card => {
        if (selectedFilter === 'all') {
            // Show all photos
            card.style.display = '';
        } else {
            // Show only selected friend's photos
            const photoUserId = card.dataset.userId;
            if (photoUserId === selectedFilter) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        }
    });
}
