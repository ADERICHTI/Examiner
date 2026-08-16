import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// import visualization helpers
import { EdgeCircle } from "./metrics.js";

const firebaseConfig = {
    apiKey: "AIzaSyA1PaZu6BZb0mTSbBLe97XPj8U06uUPkOw",
    authDomain: "quick-cbt.firebaseapp.com",
    databaseURL: "https://quick-cbt-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quick-cbt",
    storageBucket: "quick-cbt.firebasestorage.app",
    messagingSenderId: "584031052691",
    appId: "1:584031052691:web:7ae42c7ed36694c6af7e66",
    measurementId: "G-10YZQM8SVS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
window.app = app;
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const elements = {
    authModal: document.getElementById('auth-modal'),
    googleSignInBtn: document.getElementById('google-signin-btn'),
    greeting: document.getElementById('greeting'),
    profilePictures: document.querySelectorAll('#profilePicture'),
    themeToggle: document.getElementById('theme-toggle'),
    logoutBtn: document.getElementById('logout-btn'),
    statusFilter: document.getElementById('statusFilter'),
    usersBtn: document.getElementById('users-btn'),
    resultsBtn: document.getElementById('results-btn'),
    resultsTab: document.querySelector('.results-tab'),
     messageDialog: document.getElementById('messageDialog'),
    messageDialogContent: document.getElementById('messageDialogContent'),
    messageText: document.getElementById('messageText'),
    messageDialogActions: document.getElementById('messageDialogActions'),
    messageYesBtn: document.getElementById('messageYesBtn'),
    messageNoBtn: document.getElementById('messageNoBtn'),
    closeMessage: document.querySelector('.close-message'),
}

let usersCache = [];
let currentFilter = elements.statusFilter ? elements.statusFilter.value : 'all';

// small map to hold active EdgeCircle instances for results cards
const resultsCharts = new Map();

// render a list of users into the .user-tab container, applying filter
function renderUsers(filter = currentFilter) {
  const container = document.querySelector('.glass-card .user-tab');
  if (!container) return;

  container.innerHTML = '';

  const filtered = usersCache.filter(u => {
    if (!filter || filter === 'all') return true;
    const status = (u.status || '').toLowerCase();
    const onlineFlag = !!u.isOnline;
    if (filter === 'online') return onlineFlag || status === 'online';
    if (filter === 'offline') return (!onlineFlag && status !== 'online') || status === 'offline';
    if (filter === 'away') return status === 'away';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="padding:12px;color:#666">No users match the filter.</p>';
    return;
  }

  filtered.forEach(u => {
    const card = buildUserCard(u);
    container.appendChild(card);
  });
}

// update the stats numbers in the g-card.user-management block
function updateUserStats() {
  const gCard = document.querySelector('.g-card.user-management');
  if (!gCard) return;
  const ps = gCard.querySelectorAll('p');
  const total = usersCache.length;
  const onlineCount = usersCache.reduce((acc, u) => {
    if (u.isOnline === true) return acc + 1;
    const s = (u.status || '').toLowerCase();
    if (s === 'online') return acc + 1;
    return acc;
  }, 0);

  // first <p> = total users, second <p> = online count
  if (ps[0]) ps[0].textContent = `${total} Users`;
  if (ps[1]) ps[1].textContent = `${onlineCount} Online`;
}

// wire filter control (if present)
if (elements.statusFilter) {
  elements.statusFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderUsers(currentFilter);
  });
}


// new: show results tab UI and hide user tab
function showResultsTab() {
  const userTab = document.querySelector('.glass-card .user-tab');
  const resultsTab = elements.resultsTab;
  if (!resultsTab || !userTab) return;

  // toggle visibility
  const isVisible = resultsTab.style.display !== 'none';
  if (isVisible) {
    resultsTab.style.display = 'none';
    userTab.style.display = '';
    elements.resultsBtn.classList.remove('active');
  } else {
    resultsTab.style.display = '';
    userTab.style.display = 'none';
    elements.resultsBtn.classList.add('active');
    // ensure results are rendered
    renderResults();
  }
}

// render results: subscribes to 'results' collection and builds per-user cards
let resultsUnsub = null;
function renderResults() {
  const container = elements.resultsTab;
  if (!container) return;

  // if we already have a listener, keep it (onSnapshot will push updates).
  // create listener once
  if (resultsUnsub) return;

  const resultsCol = collection(db, 'results');
  resultsUnsub = onSnapshot(resultsCol, (snapshot) => {
    container.innerHTML = '';
    // cleanup old charts
    resultsCharts.forEach((chart) => {
      if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    resultsCharts.clear();

    if (snapshot.empty) {
      container.innerHTML = '<p style="padding:12px;color:#666">No results available.</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const uid = docSnap.id;
      const rdata = docSnap.data();
      // map subjectScores to simple data object expected by EdgeCircle
      const subjectScores = (rdata.testResults && rdata.testResults.subjectScores) ? rdata.testResults.subjectScores : {};
      const totalTests = rdata.totalTestsTaken || 0;
      const totalScore = (rdata.testResults && rdata.testResults.totalScore) ? rdata.testResults.totalScore : 0;

      // build data object for chart
      const chartData = {};
      Object.keys(subjectScores).forEach(sub => {
        chartData[sub] = subjectScores[sub].correct ?? subjectScores[sub];
      });
      // residual = remaining questions not accounted (assumes 25 questions/test like existing logic)
      const residual = Math.max(0, (25 * totalTests) - totalScore);
      if (residual > 0) chartData['residual'] = residual;

      // find user info from usersCache
      const userInfo = usersCache.find(u => u.userid === uid || u.id === uid) || {};

      // build card
      const card = document.createElement('div');
      card.className = 'admin-result-card';
      card.style.padding = '12px';
      card.style.borderRadius = '8px';
      card.style.background = 'var(--glass-bg)';
      card.style.border = 'var(--glass-border)';
      card.style.marginBottom = '12px';
      card.style.display = 'flex';
      card.style.gap = '12px';
      card.style.alignItems = 'center';

      const img = document.createElement('img');
      img.src = userInfo.userphoto || userInfo.userphotoUrl || userInfo.photoURL || 'https://raw.githubusercontent.com/ADERICHTI/Images001/refs/heads/main/images.png';
      img.alt = userInfo.username || userInfo.useremail || 'user';
      img.style.width = '56px';
      img.style.height = '56px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      img.onerror = () => { img.style.display = 'none'; };

      const meta = document.createElement('div');
      meta.style.flex = '1';
      meta.innerHTML = `
        <div style="font-weight:600">${userInfo.username || rdata.username || 'Unknown User'}</div>
        <div style="font-size:13px;color:var(--medium)">${userInfo.useremail || rdata.useremail || ''} • ${uid}</div>
        <div style="font-size:12px;color:${(userInfo.isOnline || userInfo.status === 'online') ? '#1db954' : '#888'};margin-top:6px;">
          ${(userInfo.isOnline || userInfo.status === 'online') ? 'Online' : (userInfo.status || 'offline')}
        </div>
      `;

      // chart container (small)
      const chartWrap = document.createElement('div');
      chartWrap.style.width = '120px';
      chartWrap.style.minWidth = '120px';
      chartWrap.style.height = '120px';
      chartWrap.style.display = 'flex';
      chartWrap.style.alignItems = 'center';
      chartWrap.style.justifyContent = 'center';

      // build expected DOM for EdgeCircle
      chartWrap.innerHTML = `
        <div class="chart-container" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="edge-circle" style="width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
            <div class="circle-progress"></div>
            <div class="circle-info" style="position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span class="circle-value" style="font-size:12px"></span>
              <span class="circle-label" style="font-size:10px">Total</span>
            </div>
          </div>
          <div class="legend" style="display:none;"></div>
        </div>
      `;

      card.appendChild(img);
      card.appendChild(meta);
      card.appendChild(chartWrap);

      container.appendChild(card);

      // instantiate EdgeCircle for this card
      try {
        const chart = new EdgeCircle(chartWrap, chartData, Math.floor(rdata.metric || 0));
        resultsCharts.set(uid, chart);
      } catch (err) {
        console.error('Error creating EdgeCircle for', uid, err);
      }

    }); // end forEach doc
  }, (err) => {
    console.error('results snapshot error', err);
    container.innerHTML = `<p style="padding:12px;color:#900">Error loading results</p>`;
  });
}

// wire results button
if (elements.resultsBtn) {
  elements.resultsBtn.addEventListener('click', showResultsTab);
}

// wire results button
if (elements.usersBtn) {
  elements.usersBtn.addEventListener('click', showResultsTab);
}

const state = {
    userProfile: {
        username: "User",
        email: "user@example.com",
        department: "",
        level: ""
    }
};

function getRandomInteger(max) {
    return Math.floor(Math.random() * max);
}

function redirectTo(url) {
    window.location.href = url;
}

onAuthStateChanged(auth, async (user) => {
  window.currentUser = user;
  if (user) {
    // User signed in
    if (user.uid !== "ipDeTclK6FUQIgnK70ieSRaGki93") {
        redirectTo('/');
    } else {
        // admin user
        setupUserProfile(user);
        hideAuthModal();
    }
} else {
    // User signed out
    // hideUserProfile();
    showAuthModal();
    updateUserStatus('offline');
  }
});

elements.googleSignInBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign in error:", error);
  }
});

// Set greeting based on time of day
function setGreeting(name) {
    state.userProfile.username = auth.currentUser ? auth.currentUser.displayName || 'User' : 'User';
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";

    if (hour >= 12 && hour < 17) {
        timeGreeting = "Good Afternoon";
    } else if (hour >= 17) {
        timeGreeting = "Good Evening";
    }

    const randomIndex = getRandomInteger(3);

    elements.greeting.textContent = `${timeGreeting}, ${state.userProfile.username}!${timeGreeting === "Good Evening" ? ['🌙', '😊', '😌'][randomIndex] : timeGreeting === "Good Afternoon" ? ['😎', '😏', '🙂'][randomIndex] : timeGreeting === "Good Morning" ? ['😁', '😀', '😃'][randomIndex] : ''}`;
    // console.log();

}

function setupUserProfile(user) {
    // elements.greeting.textContent = user.displayName || 'User';
    setGreeting(user.displayName)
    // console.log(auth);
    
    elements.profilePictures.forEach(profilePicture => {
        const userAvatar = document.createElement('img')
        userAvatar.src = user.photoURL || 'https://raw.githubusercontent.com/ADERICHTI/Images001/refs/heads/main/images.png';
        profilePicture.innerHTML = '';
        profilePicture.style.overflow = 'hidden';
        profilePicture.appendChild(userAvatar)
    });
}


function showAuthModal() {
  setTimeout(() => {
    if (!auth.currentUser) {
      elements.authModal.classList.remove('hidden');
    }
  }, 2000);
}

function hideAuthModal() {
  elements.authModal.classList.add('hidden');
  }


function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  // Firestore serverTimestamp objects have .seconds
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return String(ts);
}

function buildUserCard(user) {
  const div = document.createElement('div');
  div.className = 'admin-user-card';
  div.innerHTML = `
    <div class="admin-user-header" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px;border-bottom:1px solid #eee;flex-wrap: wrap;">
      <img src="${user.userphoto || ''}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#ddd" onerror="this.style.display='none'">
      <div style="flex:1">
        <div style="font-weight:600">${user.username || 'Unknown'}</div>
        <div style="font-size:12px;color:#666">${user.useremail || ''} • ${user.userid || ''}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:${user.isOnline ? '#1db954' : '#888'}">
        ${user.isOnline ? 'Online' : (user.status || 'offline')}
      </div>
    </div>
    <div class="admin u b admin-user-body" style="padding:10px;display:none;background: #fafafa28;border-left:1px solid #eeeeee28;border-right:1px solid #eeeeee28;border-bottom:1px solid #eeeeee28;">
      <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:13px;word-wrap: break-word;" class="admin-user-pre">
department: "${user.department || ''}"
isOnline: ${user.isOnline === undefined ? 'N/A' : user.isOnline}
lastActive: ${formatTimestamp(user.lastActive)}
level: "${user.level || ''}"
signInAt: ${formatTimestamp(user.signInAt)}
status: "${user.status || ''}"
useremail: "${user.useremail || ''}"
userid: "${user.userid || ''}"
username: "${user.username || ''}"
userphoto: ${user.userphoto || ''}
      </pre>
    </div>
  `;
  const header = div.querySelector('.admin-user-header');
  const body = div.querySelector('.admin-user-body');
  header.addEventListener('click', () => {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  });
  return div;
}

export function initAdminUsers() {
  const usersCol = collection(db, 'users');
  const container = document.querySelector('.glass-card .user-tab') || document.body;

  onSnapshot(usersCol, (snapshot) => {
    usersCache = snapshot.docs.map(d => ({ id: d.id, ...d.data(), userid: d.id }));
    // Update stats and render with current filter
    updateUserStats();
    renderUsers(currentFilter);

    // fallback when empty
    if (snapshot.empty) {
      container.innerHTML = '<p style="padding:12px;color:#666">No users found.</p>';
      updateUserStats(); // ensure stats show zero
    }
  }, (err) => {
    console.error('users snapshot error', err);
    container.innerHTML = `<p style="padding:12px;color:#900">Error loading users</p>`;
  });
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeIcon = elements.themeToggle.querySelector('i');


    if (document.body.classList.contains('dark-mode')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
    circle.update(circle.data)
    // Re-render LaTeX after theme change to ensure proper styling
    setTimeout(renderLaTeX, 100);
}

async function logout() {
    // console.log('out');
    showMessage('Are you sure you want to logout?', 'prompt', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign out error:", error);
        }
    });
}

function showMessage(message, type = 'info', functionYes = () => { }, functionNo = () => { }, command= () => { }) {
    // Show the dialog
    elements.messageDialog.classList.remove('hidden');
    const messageText = elements.messageText;
    
    try {

        command();
        
    } catch (error) {

        console.log(error);
        
    }
    
    // Clear previous event listeners to prevent accumulation
    elements.messageYesBtn.replaceWith(elements.messageYesBtn.cloneNode(true));
    elements.messageNoBtn.replaceWith(elements.messageNoBtn.cloneNode(true));

    // Update references after cloning
    elements.messageYesBtn = document.getElementById('messageYesBtn');
    elements.messageNoBtn = document.getElementById('messageNoBtn');

    // Reset classes and set base class
    messageText.className = 'message-dialog-content';
    messageText.classList.add(type); // Add the type as class

    // Set message content - use innerHTML if you need formatting
    messageText.textContent = message;
    elements.messageText.className = `message-dialog-content c ${type}`


    switch (type) {
        case 'error':
        case 'success':
        case 'info':
        case 'alert':
            // Hide action buttons for simple messages
            elements.messageDialogActions.classList.add('hidden');

            // Auto-close after delay or on background click
            setTimeout(() => {
                setupAutoClose();
            }, 100);
            break;

        case 'prompt':
            // Show action buttons for prompts
            elements.messageDialogActions.classList.remove('hidden');

            // Setup Yes button
            elements.messageYesBtn.onclick = () => {
                elements.messageDialog.classList.add('hidden');
                functionYes();
                cleanup();
            };

            // Setup No button  
            elements.messageNoBtn.onclick = () => {
                elements.messageDialog.classList.add('hidden');
                functionNo();
                cleanup();
            };
            break;
    }

    // Setup click outside to close (for non-prompt dialogs)
    if (type !== 'prompt') {
        setupClickOutsideClose();
    }

    // Setup Escape key to close
    setupEscapeClose();
}

// Helper functions
function setupAutoClose() {
    // Auto-close non-prompt messages after 3 seconds
    setTimeout(() => {
        if (!elements.messageDialog.classList.contains('hidden')) {
            elements.messageDialog.classList.add('hidden');
            cleanup();
        }
    }, 15000);
}

function setupClickOutsideClose() {
    const outsideClickHandler = (e) => {
        if (e.target === elements.messageDialog) {
            elements.messageDialog.classList.add('hidden');
            cleanup();
            elements.messageDialog.removeEventListener('click', outsideClickHandler);
        }
    };
    elements.messageDialog.addEventListener('click', outsideClickHandler);
}

function setupEscapeClose() {
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && !elements.messageDialog.classList.contains('hidden')) {
            elements.messageDialog.classList.add('hidden');
            cleanup();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function cleanup() {
    // Cleanup function for any necessary resets
    elements.messageDialogActions.classList.add('hidden');
}


// auto-init when module loaded (optional)
document.addEventListener('DOMContentLoaded', () => {
  // delay slightly to allow firebase init in auth.js
  setTimeout(initAdminUsers, 600);
  elements.themeToggle.addEventListener('click', toggleTheme)
  elements.logoutBtn.addEventListener('click', () => { logout() });
});