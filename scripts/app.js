import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth, setUser, db, doc, getDoc, onSnapshot, serverTimestamp, setResult } from "./auth.js";

// Application State
const state = {
    selectedSubjects: [],
    testDuration: 15, // in minutes
    currentSubject: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    timerInterval: null,
    timeRemaining: 0,
    userProfile: {
        username: "User",
        email: "user@example.com",
        department: "",
        level: ""
    }
};

// DOM Elements
const elements = {
    homeInterface: document.getElementById('homeInterface'),
    testInterface: document.getElementById('testInterface'),
    resultsInterface: document.getElementById('resultsInterface'),
    subjectGrid: document.getElementById('subjectGrid'),
    subjectSearch: document.getElementById('subjectSearch'),
    testDurationInput: document.getElementById('testDuration'),
    startTestBtn: document.getElementById('startTestBtn'),
    testTabs: document.getElementById('testTabs'),
    testTimer: document.getElementById('testTimer'),
    questionNumber: document.getElementById('questionNumber'),
    questionText: document.getElementById('questionText'),
    optionsContainer: document.getElementById('optionsContainer'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    questionIndicators: document.getElementById('questionIndicators'),
    submitTestBtn: document.getElementById('submitTestBtn'),
    resultsTableBody: document.getElementById('resultsTableBody'),
    totalScore: document.getElementById('totalScore'),
    restartBtn: document.getElementById('restartBtn'),
    checkAnswersBtn: document.getElementById('checkAnswersBtn'),
    greeting: document.getElementById('greeting'),
    profilePicture: document.getElementById('profilePicture'),
    fullNameInput: document.getElementById('full_name'),
    matricNoInput: document.getElementById('matric_no'),
    departmentInput: document.getElementById('department'),
    facultyInput: document.getElementById('faculty'),
    themeToggle: document.getElementById('theme-toggle'),
    messageDialog: document.getElementById('messageDialog'),
    messageDialogContent: document.getElementById('messageDialogContent'),
    messageText: document.getElementById('messageText'),
    messageDialogActions: document.getElementById('messageDialogActions'),
    messageYesBtn: document.getElementById('messageYesBtn'),
    messageNoBtn: document.getElementById('messageNoBtn'),
    closeMessage: document.querySelector('.close-message'),
    footer: document.querySelector('footer'),
    home: document.getElementById('home'),
};

// Function to render LaTeX in elements
function renderLaTeX() {
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// Initialize the application
function init() {

    
    setupEventListeners();
    elements.home.onclick = () => {
        Refresh.viaHref();
    }
    // Initial LaTeX render
    setTimeout(renderLaTeX, 100);
}

function getRandomInteger(max) {
    return Math.floor(Math.random() * max);
}

// Set greeting based on time of day
function setGreeting() {
    state.userProfile.username = auth.currentUser ? auth.currentUser.displayName || 'User' : 'User';
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";

    if (hour >= 12 && hour < 17) {
        timeGreeting = "Good Afternoon";
    } else if (hour >= 17) {
        timeGreeting = "Good Evening";
    }

    const randomIndex = getRandomInteger(3);

    elements.greeting.textContent = `${timeGreeting}, ${state.userProfile.username}!`;
    // console.log();

}

// Setup event listeners
function setupEventListeners() {
    // Key Event listeners
    // document.addEventListener('keydown', (e) => {
    //     // console.log(e.key);

    //     // Skip if user is typing
    //     if (e.target.matches('input, textarea, select')) {
    //         return;
    //     }

    //     try {
    //         // Answer selection (always available)
    //         if (/^[1-4]$/.test(e.key)) {
    //             selectAnswer(parseInt(e.key) - 1);
    //         }

    //         // Test interface shortcuts
    //         if (!elements.testInterface.classList.contains('hidden')) {
    //             handleTestShortcuts(e);
    //         }

    //         // Check answers interface shortcuts
    //         if (!elements.checkAnswersInterface.classList.contains('hidden')) {
    //             handleCheckAnswersShortcuts(e);
    //         }

    //     } catch (error) {
    //         // console.log(error);
    //     }
    // });
    
    // Event delegation for specific behaviors
    elements.themeToggle.addEventListener('click', toggleTheme)
    document.addEventListener('click', (e) => {
        // Toggle edit profile section only when its header is clicked
        // if (e.target.closest('#editProfileSection .collapsible-header')) {
        //     elements.editProfileSection.classList.toggle('active');
        //     elements.departmentInput.value = !elements.departmentInput.value ? state.userProfile.department : '';
        //     elements.levelInput.value = !elements.levelInput.value ? state.userProfile.level : '';
        // }

        // Close dialogs when clicking outside (clicking the overlay)
        // if (e.target === elements.profileDialog) {
        //     elements.profileDialog.classList.add('hidden');
        // }
        // if (e.target === elements.helpDialog) {
        //     elements.helpDialog.classList.add('hidden');
        // }
        if (e.target === elements.messageDialog) {
            elements.messageDialog.classList.add('hidden');
            document.getElementById('messageDialog').style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            document.getElementById('messageDialogContent').style.animation = 'none';
        }
    });

    // Input events
    // elements.testDurationInput.addEventListener('change', (e) => {
    //     const duration = parseInt(e.target.value);
    //     state.testDuration = duration >= 1 ? duration : 1;
    //     e.target.value = state.testDuration;
    // });

    // elements.subjectSearch.addEventListener('input', populateSubjectGrid);

    // Button events
    elements.startTestBtn.addEventListener('click', () => {
        // console.log("yes");

        // if (state.selectedSubjects.length < 1) {
        //     showMessage('Please select at least one subject to start the test.', 'alert');
        //     return;
        // }
        startTest()
    });
    // alert
    elements.prevBtn.addEventListener('click', goToPreviousQuestion);
    elements.nextBtn.addEventListener('click', goToNextQuestion);
    elements.submitTestBtn.addEventListener('click', submitTest);
    // elements.restartBtn.addEventListener('click', restartTest);
    // elements.checkAnswersBtn.addEventListener('click', checkAnswers);

    // elements.saveProfileBtn.addEventListener('click', saveProfile);

    // elements.closeProfileDialog.addEventListener('click', () => elements.profileDialog.classList.add('hidden'));
    // elements.closeProfileBtn.addEventListener('click', () => elements.profileDialog.classList.add('hidden'));

    // When edit profile button is clicked open the profile dialog and expand the edit section
    // if (elements.editProfileBtn) {
    //     elements.editProfileBtn.addEventListener('click', () => {
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

    // elements.logoutBtn.addEventListener('click', logout);

    // document.querySelector("#checkAnswersInterface #prevBtn2").addEventListener('click', () => {
    //     // console.log('prev')
    //     // alert('prev', state.currentQuestionIndex)
    //     if (state.currentQuestionIndex > 0) {
    //         const qindex = state.currentQuestionIndex - 1;
    //         state.currentQuestionIndex = qindex;
    //         showCurrentQuestion2();

    //         // Update question indicators
    //         Array.from(document.querySelector("#checkAnswersInterface #questionIndicators2").children).forEach((indicator, idx) => {
    //             indicator.classList.toggle('current', idx === qindex);
    //         });
    //     }
    // });

    // document.querySelector("#checkAnswersInterface #nextBtn2").addEventListener('click', () => {
    //     // console.log('next');
    //     // alert(`next ${state.currentQuestionIndex}`)
    //     if (state.currentQuestionIndex < questionsData[state.currentSubject].questions.length - 1) {
    //         const qindex = state.currentQuestionIndex + 1;
    //         state.currentQuestionIndex = qindex;
    //         showCurrentQuestion2();

    //         // Update question indicators
    //         Array.from(document.querySelector("#checkAnswersInterface #questionIndicators2").children).forEach((indicator, idx) => {
    //             indicator.classList.toggle('current', idx === qindex);
    //         });
    //     }
    // });

    // document.querySelector("#checkAnswersInterface #restartBtn2").addEventListener('click', () => restartTest());
    // Clicking the profile picture should open the profile dialog (delegated to handle dynamic/missing element at bind time)
    // document.addEventListener('click', (e) => {
    //     if (e.target.closest('#profile-btn')) {
    //         showProfileDialog();
    //     }
    // });

    // elements.logoutBtn.addEventListener('click', () => { logout() });

    // Fixed help button event listener
    // elements.helpButton.addEventListener('click', () => {
    //     elements.helpDialog.classList.remove('hidden');
    // });
    // elements.closeHelp.addEventListener('click', () => elements.helpDialog.classList.add('hidden'));

    elements.closeMessage.addEventListener('click', () => {
        elements.messageDialog.classList.add('hidden');
        document.getElementById('messageDialog').style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        document.getElementById('messageDialogContent').style.animation = 'none';
    });
}

// function handleTestShortcuts(e) {
//     switch (e.key) {
//         case 'ArrowLeft':
//         case 'p':
//             goToPreviousQuestion();
//             break;
//         case 'ArrowRight':
//         case 'n':
//             goToNextQuestion();
//             break;
//         case 's':
//             elements.submitTestBtn.click();
//             break;
//         // case 'Enter':
//         //     if (elements.messageYesBtn) {
//         //         elements.messageYesBtn.click();                
//         //         elements.messageDialog.classList.add('hidden')
//         //     }
//         //     break;
//     }
// }


// Load user profile

async function loadUserProfile() {
    // In a real app, this would come from a backend or localStorage
    // const savedProfile = localStorage.getItem('userProfile');
    // const savedProfile = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const savedProfile = await onSnapshot(doc(db, 'users', auth.currentUser.uid), (data) => {
        // console.log(data.exists());

        if (data.exists()) {
            // console.log(data.data());
            state.userProfile = data.data();
            // console.log(state.userProfile);
            // populateSubjectGrid()
        } else {
            const savedProfile = localStorage.getItem('userProfile');
            state.userProfile = JSON.parse(savedProfile);

        }

        // Update UI with profile data
        // const setGreetingTimeoutID = setTimeout(setGreeting(), 5000)
        // elements.departmentInput.value = !elements.departmentInput.value ? state.userProfile.department : '';
        // elements.levelInput.value = !elements.levelInput.value ? state.userProfile.level : '';

        // Update profile dialog
        // elements.profileUsername.textContent = state.userProfile.username;
        // elements.profileEmail.textContent = state.userProfile.useremail;
        // elements.profileDepartment.value = state.userProfile.department;
        // elements.profileLevel.value = state.userProfile.level;

        
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
    // circle.update(circle.data)
    // Re-render LaTeX after theme change to ensure proper styling
    setTimeout(renderLaTeX, 100);
}

const Refresh = {
    // Basic reload
    simple: () => {
        window.location.reload();
    },
    
    // Force reload (bypass cache)
    hard: () => {
        window.location.reload(true);
    },
    
    // Using location href
    viaHref: () => {
        window.location.href = window.location.href;
    },
    
    // Using location assign
    viaAssign: () => {
        window.location.assign(window.location.href);
    },
    
    // Using location replace (no back button history)
    viaReplace: () => {
        window.location.replace(window.location.href);
    }
};

// Start the test
function startTest() {
    // Set test duration in seconds

    if (elements.fullNameInput.value.trim() === '' || elements.matricNoInput.value.trim() === '' || elements.departmentInput.value.trim() === '' || elements.facultyInput.value.trim() === '') {
        showMessage('Please Input your full profile details before starting the test.', 'alert');
        return;
    }

    setUser(auth.currentUser.uid, {
      name: elements.fullNameInput.value.trim() || '',
      matricno: elements.matricNoInput.value.trim() || '',
      department: elements.departmentInput.value.trim() || '',
      faculty: elements.facultyInput.value.trim() || '',
    });

    state.timeRemaining = state.testDuration * 60;
    updateTimerDisplay();
    
    
    // Set first subject
    state.currentSubject = "EME 127 Test";
    // Initialize user answers
    [state.currentSubject].forEach(subject => {
        try {
            state.userAnswers[subject] = Array(questionsData[subject].questions.length).fill(null);
        } catch (error) {
            showMessage('Questions for this course will be available soon. Thank you😊👍')
        } return;
    });
    state.currentQuestionIndex = 0;

    // Setup test tabs
    setupTestTabs();

    // Setup question indicators
    setupQuestionIndicators();

    // Show first question
    showCurrentQuestion();

    // Start timer
    state.timerInterval = setInterval(updateTimer, 1000);

    // Switch to test interface
    switchInterface('testInterface');
}

// Setup test tabs
function setupTestTabs() {
    elements.testTabs.innerHTML = '';

    state.selectedSubjects.forEach(subject => {
        const tab = document.createElement('div');
        tab.className = `test-tab ${subject === state.currentSubject ? 'active' : ''}`;
        tab.textContent = subject;
        tab.addEventListener('click', () => switchSubject(subject));
        elements.testTabs.appendChild(tab);
    });
}

// Switch between subjects
function switchSubject(subject) {
    state.currentSubject = subject;
    state.currentQuestionIndex = 0;

    // Update active tab
    Array.from(elements.testTabs.children).forEach(tab => {
        tab.classList.toggle('active', tab.textContent === subject);
    });

    // Update question indicators
    setupQuestionIndicators();

    // Show first question of new subject
    showCurrentQuestion();
}

// Setup question indicators
function setupQuestionIndicators() {
    elements.questionIndicators.innerHTML = '';
    const questions = questionsData[state.currentSubject].questions;
    console.log(questions);
    

    questions.forEach((_, index) => {
        console.log(questions[index]);
        
        const indicator = document.createElement('div');
        indicator.className = `question-indicator ${index === state.currentQuestionIndex ? 'current' : ''} ${state.userAnswers[state.currentSubject][index] !== null ? 'answered' : ''}`;
        indicator.textContent = index + 1;
        indicator.addEventListener('click', () => goToQuestion(index));
        elements.questionIndicators.appendChild(indicator);
    });
}

// Show current question
function showCurrentQuestion() {
    const questions = questionsData[state.currentSubject].questions;
    const currentQuestion = questions[state.currentQuestionIndex];

    // Update question number display
    elements.questionNumber.textContent = `Question ${state.currentQuestionIndex + 1}/${questions.length}`;

    // Update question text with LaTeX support - use innerHTML instead of textContent
    elements.questionText.innerHTML = currentQuestion.question;

    // Update options with LaTeX support
    elements.optionsContainer.innerHTML = '';
    currentQuestion.options.forEach((option, optionIndex) => {
        const optionElement = document.createElement('div');
        optionElement.className = `option ${state.userAnswers[state.currentSubject][state.currentQuestionIndex] === optionIndex ? 'selected' : ''}`;
        optionElement.innerHTML = option; // Use innerHTML instead of textContent for LaTeX
        optionElement.addEventListener('click', () => selectAnswer(optionIndex));
        elements.optionsContainer.appendChild(optionElement);
    });

    // Update navigation buttons
    elements.prevBtn.disabled = state.currentQuestionIndex === 0;
    elements.nextBtn.disabled = state.currentQuestionIndex === questions.length - 1;

    // Render LaTeX after a small delay to ensure DOM is updated
    setTimeout(renderLaTeX, 0);
}

// Select an answer
function selectAnswer(optionIndex) {
    // Save the answer
    state.userAnswers[state.currentSubject][state.currentQuestionIndex] = optionIndex;

    // Update the selected option style
    Array.from(elements.optionsContainer.children).forEach((option, idx) => {
        option.classList.toggle('selected', idx === optionIndex);
    });

    // Update the question indicator
    elements.questionIndicators.children[state.currentQuestionIndex].classList.add('answered');
}

// Go to a specific question
function goToQuestion(index) {
    state.currentQuestionIndex = index;
    showCurrentQuestion();

    // Update question indicators
    Array.from(elements.questionIndicators.children).forEach((indicator, idx) => {
        indicator.classList.toggle('current', idx === index);
    });
}

// Go to previous question
function goToPreviousQuestion() {
    if (state.currentQuestionIndex > 0) {
        goToQuestion(state.currentQuestionIndex - 1);
    }
}

// Go to next question
function goToNextQuestion() {
    const questions = questionsData[state.currentSubject].questions;
    if (state.currentQuestionIndex < questions.length - 1) {
        goToQuestion(state.currentQuestionIndex + 1);
    }
}

// Update timer
function updateTimer() {
    state.timeRemaining--;
    updateTimerDisplay();

    if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        submitTest(false);
    }
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;

    elements.testTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    // Change color when time is running out
    if (state.timeRemaining <= 300) { // 5 minutes
        elements.testTimer.classList.add('danger');
        elements.testTimer.classList.remove('warning');
    } else if (state.timeRemaining <= 600) { // 10 minutes
        elements.testTimer.classList.add('warning');
        elements.testTimer.classList.remove('danger');
    } else {
        elements.testTimer.classList.remove('warning', 'danger');
    }
}

// Submit the test
function submitTest(usePrompt=true) {
    if (usePrompt) {showMessage('Are you sure you want to submit the test? You will not be able to change your answers after submission.', 'prompt', () => {
        clearInterval(state.timerInterval);
        calculateResults();
        switchInterface('resultsInterface');
    })} else {
        clearInterval(state.timerInterval);
        calculateResults();
        switchInterface('resultsInterface');
    }
}

// Calculate results
function calculateResults() {
    let totalCorrect = 0;
    let totalQuestions = 0;
    let subjectScores = {};

    elements.resultsTableBody.innerHTML = '';


    // Calculate scores for each subject
    [state.currentSubject].forEach(subject => {
        const questions = questionsData[subject].questions;
        let correct = 0;

        questions.forEach((question, index) => {
            const userAnswerIndex = state.userAnswers[subject][index];
            if (userAnswerIndex !== null) {
                const userAnswer = question.options[userAnswerIndex].split('.')[0].trim();
                if (question.answers.includes(userAnswer)) {
                    correct++;
                }
            }
        });

        totalCorrect += correct;
        totalQuestions += questions.length;

        const percentage = Math.round((correct / questions.length) * 100);

        // Add to results table
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${"EME 127"}</td>
            <td>${correct}/${questions.length}</td>
            <td>${percentage}%</td>
        `;
        elements.resultsTableBody.appendChild(row);
        // Store subject scores
        subjectScores[subject] = {
            correct: correct,
            total: questions.length,
            percentage: percentage
        };
    });

    // Calculate total score
    const totalPercentage = Math.round((totalCorrect / totalQuestions) * 100);
    // Update total score display
    elements.totalScore.textContent = `${totalCorrect}/${totalQuestions} (${totalPercentage}%)`;
    // Upload results to Firestore
    try {
        setUser(auth.currentUser.uid, {
            scores: [totalCorrect, totalQuestions, totalPercentage],
            takenTests: true,
        });
    } catch (error) {
        // console.log(error);
        
    }
}

// Check answers
// function checkAnswers() {
//     // console.log(state);

//     // TODO: Implement detailed answer breakdown feature
//     // alert('This feature would show a detailed breakdown of your answers compared to the correct ones.');


//     // Set first subject
//     state.currentSubject = state.selectedSubjects[0];
//     state.currentQuestionIndex = 0;

//     // Setup test tabs
//     setupTestTabs();

//     document.querySelector("#checkAnswersInterface #testTabs").innerHTML = '';

//     const tab = document.createElement('div');
//     tab.className = `test-tab`;
//     tab.textContent = 'Check Result';
//     tab.style.color = '#426bf4';
//     tab.addEventListener('click', () => { switchInterface('resultsInterface') });
//     document.querySelector("#checkAnswersInterface #testTabs").appendChild(tab);

//     state.selectedSubjects.forEach(subject => {
//         const tab = document.createElement('div');
//         tab.className = `test-tab ${subject === state.currentSubject ? 'active' : ''}`;
//         tab.textContent = subject;
//         tab.addEventListener('click', () => {
//             state.currentSubject = subject;
//             state.currentQuestionIndex = 0;

//             // Update active tab
//             Array.from(document.querySelector("#checkAnswersInterface #testTabs").children).forEach(tab => {
//                 tab.classList.toggle('active', tab.textContent === subject);
//             });

//             // Update question indicators
//             setupQuestionIndicators2();

//             // Show first question of new subject
//             showCurrentQuestion2();
//         });
//         document.querySelector("#checkAnswersInterface #testTabs").appendChild(tab);
//     });


//     // Setup question indicators
//     setupQuestionIndicators2();

//     // Show first question
//     showCurrentQuestion2();


//     // Switch to check answers interface
//     switchInterface('checkAnswersInterface');
// }

// function setupQuestionIndicators2() {
//     document.querySelector("#checkAnswersInterface #questionIndicators2").innerHTML = '';
//     const questions = questionsData[state.currentSubject].questions;

//     questions.forEach((_, index) => {
//         const indicator = document.createElement('div');
//         indicator.className = `question-indicator ${index === state.currentQuestionIndex ? 'current' : ''} ${state.userAnswers[state.currentSubject][index] !== null ? 'answered' : ''}`;
//         indicator.textContent = index + 1;
//         indicator.addEventListener('click', () => {
//             state.currentQuestionIndex = index;
//             showCurrentQuestion2();

//             // Update question indicators
//             Array.from(document.querySelector("#checkAnswersInterface #questionIndicators2").children).forEach((indicator, idx) => {
//                 indicator.classList.toggle('current', idx === index);
//             });
//         });
//         document.querySelector("#checkAnswersInterface #questionIndicators2").appendChild(indicator);
//     });
// }

// function showCurrentQuestion2() {

//     const questions2 = questionsData[state.currentSubject].questions;
//     const currentQuestion = questions2[state.currentQuestionIndex];
    

//     // Update question number display
//     document.querySelector("#checkAnswersInterface #questionNumber2").textContent = `Question ${state.currentQuestionIndex + 1}/${questions2.length}`;

//     // Update question text with LaTeX support - use innerHTML instead of textContent
//     document.querySelector("#checkAnswersInterface #questionText2").innerHTML = currentQuestion.question;

//     const questions = questionsData[state.currentSubject].questions;
//     let answerList = [];

//     // questions.forEach((question, index) => {
//     //     answerList.push(list[question.answers[0]])
//     // });

//     let list = { "I": 0, "II": 1, "III": 2, "IV": 3 }
//     // Update options with LaTeX support
//     document.querySelector("#checkAnswersInterface #optionsContainer2").innerHTML = '';
//     currentQuestion.options.forEach((option, optionIndex) => {
//         const optionElement = document.createElement('div');
//         optionElement.className = `option ${list[questions[state.currentQuestionIndex].answers[0]] === optionIndex ? 'selected' : state.userAnswers[state.currentSubject][state.currentQuestionIndex] === optionIndex ? 'selected-r' : ''}`;

//         document.querySelector("#checkAnswersInterface #indicator").textContent = list[questions[state.currentQuestionIndex].answers[0]] === optionIndex && state.userAnswers[state.currentSubject][state.currentQuestionIndex] === optionIndex ? '😁✅' : state.userAnswers[state.currentSubject][state.currentQuestionIndex] === optionIndex ? '😝❌' : state.userAnswers[state.currentSubject][state.currentQuestionIndex] === null ? '🤧🔲' : document.querySelector("#checkAnswersInterface #indicator").textContent

//         optionElement.className = `option ${list[questions[state.currentQuestionIndex].answers[0]] === optionIndex && state.userAnswers[state.currentSubject][state.currentQuestionIndex] === optionIndex ? 'selected-g' : optionElement.className}`
//         optionElement.innerHTML = option; // Use innerHTML instead of textContent for LaTeX
//         // optionElement.addEventListener('click', () => selectAnswer(optionIndex));
//         document.querySelector("#checkAnswersInterface #optionsContainer2").appendChild(optionElement);
//     });

//     // --- NEW: show "Check Explanation" glass button when detailedAnswers present ---
//     (function manageExplanationButton() {
//         const qc = document.querySelector("#checkAnswersInterface .question-container");
//         if (!qc) return;
//         // remove existing control if any
//         let existing = qc.querySelector('.explain-control');
//         // const hasDetailed = (() => {
//         //     const d = currentQuestion.detailedAnswers || null;
//         //     if (!d) return false;
//         //     return true;
//         // })();

//         if (existing) {
//             existing.remove();
//             // return;
//         }
//         const d = currentQuestion.detailedAnswers || null;
//         // alert(`d${d}\n${currentQuestion.detailedAnswers[0]}`)
//         if (d && d[0]) {
//             // alert('Explanation available! Click the 💡 Check Explanation button to view it.')
//             const ctrl = document.createElement('div');
//             ctrl.className = 'explain-control';
//             ctrl.style.marginTop = '12px';
//             ctrl.innerHTML = `<button class="explain-btn glass">💡 Check Explanation</button>`;
//             qc.appendChild(ctrl);

//             const btn = ctrl.querySelector('.explain-btn');
//             btn.addEventListener('click', () => {
//                 // build display text (normalize)
                
//                 // alert(currentQuestion.detailedAnswers[0])
//                 const text = d[0]
//                 // alert(`${d[0]} ${text}`)
//                 // reuse the showMessage dialog - type 'info' will show and auto-manage buttons
//                 showMessage(text || 'No detailed explanation available.', 'info', null, null, null, 45);
//             });
//         }
//     })();

//     // Update navigation buttons
//     document.querySelector("#checkAnswersInterface #prevBtn2").disabled = state.currentQuestionIndex === 0;
//     document.querySelector("#checkAnswersInterface #nextBtn2").disabled = state.currentQuestionIndex === questions2.length - 1;

//     // Render LaTeX after a small delay to ensure DOM is updated
//     setTimeout(renderLaTeX, 0);

// }

// Restart the test
// function restartTest() {
//     state.selectedSubjects = [];
//     state.currentSubject = null;
//     state.currentQuestionIndex = 0;
//     state.userAnswers = {};
//     state.timerInterval = null;
//     state.timeRemaining = 0;

//     // Reset UI
//     elements.testDurationInput.value = '30';
//     // elements.startTestBtn.disabled = true;

//     // Reset subject search and repopulate subject grid to clear selection
//     elements.subjectSearch.value = '';
//     populateSubjectGrid();

//     // Switch back to home interface
//     switchInterface('homeInterface');
// }

// Switch between interfaces
function switchInterface(interfaceId) {
    // Hide all interfaces
    elements.homeInterface.classList.add('hidden');
    elements.testInterface.classList.add('hidden');
    elements.resultsInterface.classList.add('hidden');
    // elements.checkAnswersInterface.classList.add('hidden');

    // Show the selected interface
    document.getElementById(interfaceId).classList.remove('hidden');

    // Re-render LaTeX when switching interfaces
    setTimeout(renderLaTeX, 100);
}

let messageAutoCloseTimer = null;

function showMessage(message, type = 'info', functionYes = () => { }, functionNo = () => { }, command= () => { }, autoClose /* undefined = use default, null = disabled, number = seconds */) {
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
    const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

    let content = typeof message === 'string' ? message : String(message);
    const safeHtml = escapeHtml(content).replace(/\r\n|\r|\n/g, '<br>');
    // set HTML
    messageText.innerHTML = safeHtml;
    // add small helper class used elsewhere
    elements.messageText.className = `message-dialog-content c ${type}`;

    // Render LaTeX inside the dialog if KaTeX auto-render is available
    if (typeof renderMathInElement !== 'undefined') {
        try {
            renderMathInElement(messageText, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        } catch (e) {
            // ignore render errors
        }
    }

    // Determine auto-close behavior
    const isPrompt = type === 'prompt';
    const autoCloseEnabled = autoClose !== null && !isPrompt; // null disables, prompts never auto-close
    let timeoutSeconds;
    if (!autoCloseEnabled) {
        timeoutSeconds = null;
    } else if (typeof autoClose === 'number' && !isNaN(autoClose)) {
        timeoutSeconds = Math.max(0, autoClose); // use provided number (seconds)
    } else {
        timeoutSeconds = 15; // default when no value specified
    }

    switch (type) {
        case 'info':
            elements.messageDialogActions.classList.add('hidden');
            if (timeoutSeconds !== null) setupAutoClose(timeoutSeconds);
            break;
        case 'error':
        case 'success':
        case 'alert':
            // Hide action buttons for simple messages
            elements.messageDialogActions.classList.add('hidden');
            if (timeoutSeconds !== null) setupAutoClose(timeoutSeconds);
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
function setupAutoClose(seconds = 15) {
    // Clear any existing auto-close timer
    if (messageAutoCloseTimer) {
        clearTimeout(messageAutoCloseTimer);
        messageAutoCloseTimer = null;
    }

    // If seconds is null/undefined/0 (0 allowed if caller wants immediate), still schedule accordingly
    const ms = (typeof seconds === 'number' && !isNaN(seconds)) ? Math.max(0, seconds * 1000) : 28 * 1000;

    messageAutoCloseTimer = setTimeout(() => {
        if (!elements.messageDialog.classList.contains('hidden')) {
            elements.messageDialog.classList.add('hidden');
            cleanup();
        }
        messageAutoCloseTimer = null;
    }, ms);
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

export { setGreeting, loadUserProfile, showMessage, getRandomInteger, switchInterface,  };