import { setGreeting, loadUserProfile, showMessage, getRandomInteger, switchInterface } from "./app.js";
import { testConnection, addData, readData, updateData, addIfNotExists } from "./extra.js";
import { upsertDocument } from "./extra-002.js";
import { upsertItem, getItemById, queryItems, updateItem } from "./extra-003.js";
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
//   signOut 
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

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyBR2IsZYefv54lABlgF4QB9RsRKUpLaPuo",
//     authDomain: "examiner-25.firebaseapp.com",
//     projectId: "examiner-25",
//     storageBucket: "examiner-25.firebasestorage.app",
//     messagingSenderId: "414665642672",
//     appId: "1:414665642672:web:7ee296a2fffdd51208a175",
//     measurementId: "G-H0432JGGD9"
// };
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1iB1X-qqbfB9hwHnZ8SyLWn_i1SU29iI",
  authDomain: "vedatabase25.firebaseapp.com",
  projectId: "vedatabase25",
  storageBucket: "vedatabase25.firebasestorage.app",
  messagingSenderId: "881280967764",
  appId: "1:881280967764:web:3157268fffecb59620b9c1",
  measurementId: "G-K01FTCLQVN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
window.app = app;
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
// const analytics = getAnalytics(app);
// alert

// Global variables
window.currentUser = null;
window.currentStoryId = null;

// DOM Elements
const elements = {
    authModal: document.getElementById('auth-modal'),
    googleSignInBtn: document.getElementById('google-signin-btn'),
    greeting: document.getElementById('greeting'),
    profilePictures: document.querySelectorAll('#profilePicture'),
    fullNameInput: document.getElementById('full_name'),
    matricNoInput: document.getElementById('matric_no'),
    departmentInput: document.getElementById('department'),
    facultyInput: document.getElementById('faculty'),
    themeToggle: document.getElementById('theme-toggle'),
    logoutBtn: document.getElementById('logout-btn'),
    resultsTableBody: document.getElementById('resultsTableBody'),
    totalScore: document.getElementById('totalScore'),
}

async function setUser(userid, userData, collection='clients') {
  try {
    await setDoc(doc(db, collection, userid), userData, { merge: true });
    } catch (error) {
        console.log("Error setting Document: ", error);
    }
}

// get or create results document for the user / also initialize if not exists
// async function setResult(data={}, mode='confirm') {
//     // alert('Mode: ' + mode);
//     switch (mode) {
//       case 'write':
//         // alert('Writing results doc');  
//         const resultData = await getDoc(doc(db, 'results', auth.currentUser.uid));
//             if (resultData.exists()) {
//                 // alert('Results doc exists, not overwriting');
//                 // get existing data and update
//                 let existingData = resultData.data();
//                 // update timeFirstTestTaken if it's 0
//                 existingData.timeFirstTestTaken = existingData.timeFirstTestTaken === 0 ? serverTimestamp() : existingData.timeFirstTestTaken;
//                 // update timeLastTestTaken
//                 existingData.timeLastTestTaken = serverTimestamp();
//                 // update testResults-subjectScores
//                 existingData.testResults.subjectScores = {...existingData.testResults.subjectScores, ...data.testResults.subjectScores};
//                 // update totalTestsTaken
//                 existingData.totalTestsTaken = parseInt(Object.keys(existingData.testResults.subjectScores).length);
//                 // update testResults-totalScore
//                 existingData.testResults.totalScore = 0;
//                 Object.keys(existingData.testResults.subjectScores).forEach(subject => {
//                     existingData.testResults.totalScore += existingData.testResults.subjectScores[subject].correct;
//                 })

//                 // const alpha = 0.3;
//                 // // update metric
//                 // existingData.metric = (alpha * parseInt(existingData.testResults.totalScore)/(25*parseInt(existingData.totalTestsTaken))* 100) + ((1 - alpha) * (existingData.metric || 0));
//                 function computeUpdatedMetric(previousMetric, newCorrect, questionsPerTest = 25, testsCount = 1, alpha = 0.3) {
//                   // normalize to 0..1
//                   const denom = Math.max(1, questionsPerTest * testsCount); // avoid divide-by-zero
//                   const newScorePct = (Number(newCorrect) || 0) / denom; // 0..1
//                   // if no previous metric, initialize to newScorePct
//                   if (previousMetric == null || isNaN(previousMetric)) return Math.round(newScorePct * 100);
//                   // standard EMA update
//                   const updated = previousMetric + alpha * (newScorePct * 100 - previousMetric);
//                   return Math.round(updated);
//                 }
//                 // ...existing code...
//                 // Example usage inside setResult write branch (replace current metric update):
//                 const prevMetric = existingData.metric || null;
//                 const totalCorrect = parseInt(existingData.testResults.totalScore || 0, 10);
//                 const totalTests = Math.max(1, parseInt(existingData.totalTestsTaken || 1, 10));
//                 existingData.metric = computeUpdatedMetric(prevMetric, totalCorrect, 25, totalTests, 0.3);
//                 // write back to firestore
//                 await setDoc(doc(db, 'results', auth.currentUser.uid), existingData, { merge: true });
//                 // alert('Results doc overwritten');
//             };         
//             break;
//       case 'read':
//           // alert('Reading result doc...')
//           const getResultData = await onSnapshot(doc(db, 'results', auth.currentUser.uid), (data) => {
//             if (data.exists()) {
//               let newData = {};
  
//               Object.keys(data.data().testResults.subjectScores).forEach(subject => {
//                   newData[subject] = data.data().testResults.subjectScores[subject].correct;
//               });
  
//               newData['residual'] = 25 * data.data().totalTestsTaken - data.data().testResults.totalScore;
//               // alert(`new data has been produced: ${JSON.stringify(newData)}`)
//               console.log(newData);
              
//               return newData;
//             }
//           })
//           break;
//         case 'confirm':
//             // alert('Checking results doc');
//             try {
//                 const docSnap = await getDoc(doc(db, 'results', auth.currentUser.uid));
                
//                 if (!docSnap.exists()) {
//                     // alert('No results doc found');
                    
//                     await setDoc(doc(db, 'results', auth.currentUser.uid), {
//                         timeFirstTestTaken: 0,
//                         timeLastTestTaken: 0,
//                         totalTestsTaken: 0,
//                         testResults: {
//                             subjectScores: {},
//                             totalScore: 0
//                         }
//                     });
                    
//                     // alert('Results doc created');
//                 } else {
//                     // alert('it exists');
//                 }
//             } catch (error) {
//                 console.error('Error checking/creating results doc:', error);
//             }
//             break;
//         default:
//             break;
//     }
// }

let activityTimeout;

// function trackUserActivity() {
//   const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
  
//   events.forEach(event => {
//     window.addEventListener(event, updateLastActive, { passive: true });
//   });

//   // Track when user switches tabs/minimizes window
//     document.addEventListener('visibilitychange', () => {
//         if (document.hidden) {
//             updateUserStatus('away');
//         } else {
//             updateUserStatus('online');
//         }
//     });
// }

// function updateLastActive() {
//   // Clear existing timeout
//   clearTimeout(activityTimeout);
  
//   // Update immediately
//   updateUserStatus('online');
  
//   // Set timeout for offline status (e.g., 30 seconds of inactivity)
//   activityTimeout = setTimeout(() => {
//     updateUserStatus('offline');
// }, 30000);
// }

// async function updateUserStatus(status) {
//     currentUser = auth.currentUser;
//     if (!currentUser) return;
    
//     try {
//         await setDoc(doc(db, "users", currentUser.uid), {
//         status: status,
//         lastActive: serverTimestamp(),
//         ...(status === 'online' && { isOnline: true }),
//         ...(status === 'offline' && { isOnline: false })
//         }, { merge: true });
//     } catch (error) {
//         console.log("Error updating status:", error);
//     }
// }



// const user = auth.currentUser;
// Auth State Management

const state = {
  localStorageAvailable: null
};

function isLocalStorageAvailable(simpleCheck = true) {
  try {
    if (simpleCheck) {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    } else {
      const testKey = '__test__';
      localStorage.setItem(testKey, JSON.stringify({ test: 'data', nested: true, arr: [1, 2, 3], obj: { a: 1, b: 2 }, words: 'Hello, world! yeeeeeeeeeeeeeeeeeeeeeeeeeeeah', listo: 'Hello, world! yeeeeeeeeeeeeeeeeeeeeeeeeeeeah', store: [1,2,3,4,5,6,7,8,7,6,5,4,2,2,2,3,4,5,5,5,], pull: [1,2,3,4,5,6,7,8,7,6,5,4,2,2,2,3,4,5,5,5,], cool: true, car: [1, 2, 3], obto: { a: 1, b: 2 }, listocat: 'Hello, world! yeeeeeeeeeeeeeeeeeeeeeeeeeeeah', arc: 'Hello, world! yeeeeeeeeeeeeeeeeeeeeeeeeeeeah', store: [1,2,3,4,5,6,7,8,7,6,5,4,2,2,2,3,4,5,5,5,], till: [1,2,3,4,5,6,7,8,7,6,5,4,2,2,2,3,4,5,5,5,] }));
      const value = localStorage.getItem(testKey);
      localStorage.removeItem(testKey); 
      if (value !== testKey) {
        return false;
      }
    }
    return true;

  } catch (e) {
    return false;
  }
}


async function quickFirestoreTest(db) {
    if (!db) {
        console.error('❌ No Firestore instance provided');
        return false;
    }
    
    try {
        console.log('⚡ Quick Firestore v9 test...');
        
        // Create test document reference
        const testDocId = 'test_' + Date.now();
        const testRef = doc(db, '_quick_test', testDocId);
        
        // 1. Write test
        console.log('Writing...');
        await setDoc(testRef, {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Firestore test'
        });
        console.log('✅ Write successful');
        
        // 2. Read test
        console.log('Reading...');
        const docSnap = await getDoc(testRef);
        console.log('✅ Read successful:', docSnap.exists() ? 'Document exists' : 'Missing');
        
        // 3. Delete test
        console.log('Deleting...');
        await deleteDoc(testRef);
        console.log('✅ Delete successful');
        
        console.log('✅ 🔥Firestore is Ready for use');
        
        return true;
    } catch (error) {
        console.error('❌ Firestore v9 test failed:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Stack:', error.stack);
        
        // Common error diagnostics
        if (error.code === 'permission-denied') {
            console.error('🔒 Permission denied! Check Firestore security rules');
        } else if (error.code === 'unavailable') {
            console.error('🌐 Network/Connectivity issue');
        } else if (error.code === 'failed-precondition') {
            console.error('⚙️ Database not properly configured');
        }
        
        return false;
    }
}

state.isFirestoreAvailable = await quickFirestoreTest(db);

console.log(state.isFirestoreAvailable, 'is true');


// if false then use, back4app
state.localStorageAvailable = isLocalStorageAvailable(false);

console.log(state.localStorageAvailable);

try {
  localStorage.removeItem('localUserProfile')
} catch (error) {
  console.log(error);
}
const accessmentID = 'eme127test001';
const localUserProfileID = `localUserProfile${accessmentID}`;

onAuthStateChanged(auth, async (user) => {
  window.currentUser = user;
  if (user) {
    function doesItemExist(key) {
      return localStorage.getItem(key) !== null;
    }

    if (!doesItemExist('localUserID')) {
      localStorage.setItem('localUserID', 'null');
    }
    const savedProfile = await getDoc(doc(db, 'clients', user.uid));
    const userProfile = savedProfile.data() || {};

      try {
        
        upsertItem('users', 'user_id', user.uid, {...JSON.parse((localStorage.getItem(localUserProfileID) || '{}')), takenTests: JSON.parse((localStorage.getItem(localUserProfileID) || '{}')).takenTests || false}, state.localStorageAvailable);

        localStorage.setItem(localUserProfileID, JSON.stringify({...JSON.parse((localStorage.getItem(localUserProfileID) || '{}')), takenTests: userProfile.takenTests || false}));
        
      } catch (error) {
  
        // localStorage.setItem(localUserProfileID, JSON.stringify({...JSON.parse((localStorage.getItem(localUserProfileID))), takenTests: false}))
        console.log(error);
        
      }

      const override = () =>{
        localStorage.setItem(localUserProfileID, JSON.stringify({...JSON.parse((localStorage.getItem(localUserProfileID))), takenTests: userProfile.takenTests}));
        // alert('it was me');
        
        return userProfile.takenTests || false;
      };
  
      // console.log('takenTests[DB, LocalStorage]: ', userProfile.takenTests, JSON.parse(localStorage.getItem(localUserProfileID)).takenTests);
      console.log(localStorage.getItem('localUserID'));
      
const hasTakenTest = await (async () => {
    const localProfile = JSON.parse(localStorage.getItem(localUserProfileID) || '{}');
    const localUserID = localStorage.getItem('localUserID');
    
    if (state.isFirestoreAvailable) {
        // Check various conditions with proper fallbacks
        if (userProfile?.override) {
            const overrideResult = await override();
            return overrideResult?.takenTests ?? false;
        }
        
        return userProfile?.takenTests ?? 
               localProfile.takenTests ?? 
               (localUserID === 'null' ? userProfile?.takenTests : false) ?? 
               false;
    } else {
        try {
            const results = await queryItems('users', { user_id: user.uid });
            const userData = results[0] || {};
            
            return userData.takenTests ?? 
                   (localUserID === 'null' ? userData.takenTests : localProfile.takenTests) ?? 
                   (userData.override ? (await override())?.takenTests : false) ?? 
                   false;
        } catch (error) {
            console.error('Back4App failed:', error);
            return localProfile.takenTests ?? false;
        }
    }
})();

      
    
    // User signed in
    setupUserProfile(user);
    hideAuthModal();
    // try {
    //    setResult();
    // } catch (error) {
    //     console.log(error);
        
    // }

    function isDateToday(timestamp) {
      if (!timestamp) return false;
      
      const date = new Date(timestamp.seconds * 1000);
      const today = new Date();
      
      return date.toDateString() === today.toDateString();
  }



    setUser(user.uid, {
      username: user.displayName,
      useremail: user.email,
      userid: user.uid,
      userphoto: user.photoURL,
      name: userProfile.name || '',
      matricno: userProfile.matricno || '',
      department: userProfile.department || '',
      faculty: userProfile.faculty || '',
      scores: userProfile.scores || [], // score in percentage
      takenTests: userProfile.takenTests || false,
    //   history: [],
      signInAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      override: false,
    });

    const localUserProfile = JSON.parse(localStorage.getItem(localUserProfileID)) || {};

    addIfNotExists({
      username: user.displayName,
      email: user.email,
      user_id: user.uid,
      name: localUserProfile.name || '',
      matricno: localUserProfile.matricno || '',
      department: localUserProfile.department || '',
      faculty: localUserProfile.faculty || '',
      scores: localUserProfile.scores || [], // score in percentage
    })

    // Backup upsert
    upsertDocument( 'user_id', user.uid, {
      username: user.displayName,
      email: user.email,
      user_id: user.uid,
   })

    // Backup upsert
    upsertItem( 'users', 'user_id', user.uid, {
      username: user.displayName,
      email: user.email,
      user_id: user.uid,
   })

   // settle for the others

    if (hasTakenTest === true) {
      try {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${"EME 401"}</td>
            <td>${userProfile.scores[0] || localUserProfile.scores[0]}/${userProfile.scores[1] || localUserProfile.scores[1]}</td>
            <td>${userProfile.scores[2] || localUserProfile.scores[2]}%</td>
        `;
        elements.resultsTableBody.appendChild(row);
        elements.totalScore.textContent = `${userProfile.scores[0] || localUserProfile.scores[0]}/${userProfile.scores[1] || localUserProfile.scores[1]} (${userProfile.scores[2] || localUserProfile.scores[2]}%)`;
        switchInterface('resultsInterface');
      } catch (error) {
        console.log(error);
      }
    }
    const setGreetingIntervalID = setInterval(setGreeting, 7000)
    loadUserProfile();
    // const newData = setResult({}, 'read')
    // const getResultData = await onSnapshot(doc(db, 'results', auth.currentUser.uid), data => {
    //   if (data.exists()) {
    //           // alert(`${JSON.stringify(data.data())}`)
    //           let newData = {};
  
    //           Object.keys(data.data().testResults.subjectScores).forEach(subject => {
    //               newData[subject] = data.data().testResults.subjectScores[subject].correct;
    //           });
  
    //           newData['residual'] = 25 * data.data().totalTestsTaken - data.data().testResults.totalScore;
    //           circle.update(newData, data.data().metric)

    //           // progressBar.animateTo(data.data().metric, 1500);
    //           // progressBar.targetPercentage = data.data().metric;
    //           progressBar.targetPercentage = Math.floor(data.data().metric);
    //           progressBar.animateTo(Math.floor(data.data().metric), 1500);

    //           const isToday = isDateToday(data.data().timeLastTestTaken);
    //           // console.log(isToday); 
    //           document.getElementById('lastTestTaken').textContent = `Last test taken on: ${data.data().timeLastTestTaken && new Date(data.data().timeLastTestTaken.seconds * 1000).toLocaleString()} ${isToday ? '🟢' : '🟠'}`;
            
    //           document.getElementById('totalTestsTaken').textContent = `Total number of test taken: ${data.data().totalTestsTaken || 0}`;
    //   }
    // })
    // const circle = new EdgeCircle(elements.chartContainer, {"MTH 103 QS003":21,"MTH 103 QS004":21,"MTH 103 QS002":21,"MTH 103 QS001":10,"residual":27})
    // showMessage(quotes[getRandomInteger(quotes.length)], 'info', null, null, () => {
    //     document.getElementById('messageDialog').style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    //     document.getElementById('messageDialogContent').style.animation = 'wiggle 2.1s ease-in-out infinite'
    //     // console.log('yes it worked');
    //     setTimeout(() => {
    //         document.getElementById('messageDialog').style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    //         document.getElementById('messageDialogContent').style.animation = 'none';
    //     }, 15000);
    // })
    // trackUserActivity();
    // updateUserStatus('online');
    // CONSIDER!!!!!!!
    // if (!savedProfile.exists()) {
    //   showMessage('Welcome to StudyPiece! Please complete your profile information. click yes now to edit your details for better experience', 'prompt', () => {
    //         elements.profileDialog.classList.add('hidden');
    //         elements.editProfileSection.scrollIntoView({ 
    //             behavior: 'smooth',
    //             block: 'start',    // 'start', 'center', 'end', 'nearest'
    //             inline: 'end'  // 'start', 'center', 'end', 'nearest'
    //         });
    //         elements.editProfileSection.classList.add('active');
    //         elements.departmentInput.value = !elements.departmentInput.value ? state.userProfile.department : '';
    //         elements.levelInput.value = !elements.levelInput.value ? state.userProfile.level : '';
    //     });
    // }
} else {
    // User signed out
    // hideUserProfile();
    // showAuthModal();
    // updateUserStatus('offline');
  }
});

// Google Sign-In
elements.googleSignInBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign in error:", error);
  }
});

// // Sign Out
// signOutBtn.addEventListener('click', async () => {

// });

// // Profile Widget Interactions
// let expandTimeout;

// Functions
function setupUserProfile(user) {
    // elements.profileUsername.textContent = user.displayName || 'User';
    // elements.profileEmail.textContent = user.email || 'No email provided';
    // elements.profileDepartment.textContent = user.department || 'Not set';
    // elements.profileLevel.textContent = user.level || 'Not set';
    // console.log(auth);
    
    elements.profilePictures.forEach(profilePicture => {
        const userAvatar = document.createElement('img')
        userAvatar.src = user.photoURL || 'https://raw.githubusercontent.com/ADERICHTI/Images001/refs/heads/main/images.png';
        profilePicture.innerHTML = '';
        profilePicture.style.overflow = 'hidden';
        profilePicture.appendChild(userAvatar)
    });
  // elements.profileDialog.classList.remove('hidden')
}

// function hideUserProfile() {
//   userWidget.style.display = 'none';
// }

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

// export { auth, setUser, doc, db, getDoc, onSnapshot, serverTimestamp, setResult, getAuth, 
// export { auth, setUser, doc, db, getDoc, serverTimestamp, setResult, getAuth, 
export { auth, setUser, doc, db, getDoc, serverTimestamp, getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 

  onAuthStateChanged, initializeApp, localUserProfileID };
