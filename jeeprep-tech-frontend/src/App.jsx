// TODO: Consider migrating this file to TypeScript for better type safety and maintainability.
// TODO: Split large components/pages into separate files in the future.

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup, // For Google Sign-in
    updateProfile // To update display name after email signup
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
// REMOVE THIS IF YOU DON'T HAVE FIREBASE ANALYTICS SET UP OR DON'T NEED IT YET
// import { getAnalytics } from "firebase/analytics"; // <--- REMOVE IF NOT USED
import { ChevronRight, User, LogOut, Settings, BarChart2, BookOpen, Users, Shield, PlusCircle, Edit3, CheckCircle, XCircle, Award, TrendingUp, Target, Bell, MessageSquare, FileText, Video, Sparkles, Lightbulb, Filter, Clock, Zap, Flag, Activity, LineChart, Mail, Key, UserPlus, Briefcase, AlertTriangle } from 'lucide-react';
import Button from './components/Button';
import Card from './components/Card';
import Modal from './components/Modal';
import LoadingSpinner from './components/LoadingSpinner';
import InputField from './components/InputField';
import SelectField from './components/SelectField';

// --- Firebase Initialization ---

// Global App ID from Vite environment variable or fallback
const appId = import.meta.env.VITE_APP_ID || 'jeeprep-tech-dev';
console.log("Using App ID:", appId);

// Firebase Configuration
let firebaseConfig; // Declare ONCE with let so it can be assigned

const placeholderFirebaseConfig = { // This is your fallback
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID_FIREBASE" // Firebase's app ID for the project
    // measurementId: "YOUR_MEASUREMENT_ID" // Optional: if you use Analytics
};

// Prioritize Vite environment variables
if (import.meta.env.VITE_FIREBASE_API_KEY) {
    firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID_FIREBASE
        // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional
    };
    console.log("Using Firebase config from .env variables.");
} else {
    console.warn("Firebase VITE_ environment variables not found. Using placeholder Firebase configuration. Ensure .env.local is correct or environment variables are set in deployment.");
    firebaseConfig = placeholderFirebaseConfig;
}

// Initialize Firebase Services
let app = null; // Initialize to null
let auth = null;
let db = null;
let firebaseInitializationError = null;
// let analytics = null; // Optional: if you use Analytics and imported getAnalytics

try {
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        const message = "CRITICAL: Firebase configuration is incomplete or using placeholder values. App will likely not connect to Firebase correctly. Please update .env.local or Firebase config in App.jsx.";
        console.error(message);
        firebaseInitializationError = message;
        // To prevent initializeApp from running with bad config, we can throw or return early
        // For now, we'll let it proceed to the AppContainer check which will show the error screen
    }

    // Only initialize if no critical error was set above from bad config
    if (!firebaseInitializationError) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        // analytics = getAnalytics(app); // Optional: if you use Analytics and imported getAnalytics
        console.log("Firebase initialized successfully.");
    }

} catch (error) {
    console.error("CRITICAL: Error during Firebase service initialization:", error);
    firebaseInitializationError = error.message || "Unknown error during Firebase initialization.";
    // app, auth, db are already null or will remain null
}

// --- Context for Auth and User Data ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(true); 

    useEffect(() => {
        if (!auth) { // If auth object itself is null due to init failure
            console.error("Firebase Auth is not available. Authentication will not work.");
            setAuthLoading(false); // Stop loading, App will show init error or AuthPage
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const userRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserData(userSnap.data());
                } else {
                    const displayName = user.displayName || `User ${user.uid.substring(0, 5)}`;
                    const newUserProfile = {
                        uid: user.uid, email: user.email, 
                        name: displayName, xp: 0, coins: 100,
                        streak_days: 0, role: "user", createdAt: serverTimestamp(), lastLogin: serverTimestamp()
                    };
                    try {
                        await setDoc(userRef, newUserProfile);
                        setUserData(newUserProfile);
                    } catch (e) { console.error("Error creating new user profile in onAuthStateChanged:", e); }
                }
            } else {
                setUserData(null);
            }
            setAuthLoading(false); 
        });
        return () => unsubscribe();
    }, []); 

    const signUpWithEmailPassword = async (email, password, name) => {
        if (!auth) throw new Error("Firebase Auth not initialized.");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: name });
            const userRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            const newUserProfile = {
                uid: user.uid, email: user.email, name: name,
                xp: 0, coins: 100, streak_days: 0, role: "user",
                createdAt: serverTimestamp(), lastLogin: serverTimestamp()
            };
            await setDoc(userRef, newUserProfile);
            return userCredential;
        } catch (error) { throw error; }
    };

    const signInWithEmailPassword = async (email, password) => {
        if (!auth) throw new Error("Firebase Auth not initialized.");
        try { return await signInWithEmailAndPassword(auth, email, password); } 
        catch (error) { throw error; }
    };

    const signInWithGoogle = async () => {
        if (!auth) throw new Error("Firebase Auth not initialized.");
        const provider = new GoogleAuthProvider();
        try { return await signInWithPopup(auth, provider); } 
        catch (error) { throw error; }
    };

    const signOut = async () => {
        if (!auth) { console.error("Sign out failed: Firebase Auth not initialized."); return; }
        try {
            setAuthLoading(true); // Indicate transition
            await firebaseSignOut(auth);
            // onAuthStateChanged will set currentUser to null and authLoading to false
        } catch (error) { 
            console.error("Error signing out:", error); 
            setAuthLoading(false); // Ensure loading stops on error
        }
    };
    
    const updateUserProfileData = async (data) => { 
        if (currentUser && db) {
            const userRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.uid);
            try {
                await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
                setUserData(prev => ({ ...prev, ...data })); 
                return true;
            } catch (error) {
                console.error("Error updating user profile:", error);
                const userSnap = await getDoc(userRef); 
                if(userSnap.exists()) setUserData(userSnap.data());
                return false;
            }
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{ 
            currentUser, userData, loadingAuth: authLoading, // Ensure key is 'loadingAuth' for consumers
            signOut, 
            updateUserProfile: updateUserProfileData, 
            signUpWithEmailPassword, signInWithEmailAndPassword, signInWithGoogle
        }}>
            {children}
        </AuthContext.Provider>
    );
};
const useAuth = () => useContext(AuthContext);

// --- Page Components ---
// TODO: Move each page (DashboardPage, PracticePage, etc.) to its own file for better maintainability.
// TODO: Consider TypeScript migration for type safety.
// --- Reusable Components ---
// (Now imported from components/)
// --- Page Components ---

const AuthPage = ({ onLoginSuccess }) => { 
    const { currentUser, loadingAuth, signUpWithEmailPassword, signInWithEmailAndPassword, signInWithGoogle } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); 
    const [error, setError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => { 
        if (currentUser && !loadingAuth) { 
            onLoginSuccess(); 
        }
    }, [currentUser, loadingAuth, onLoginSuccess]);
    
    if (loadingAuth) { 
        return <LoadingSpinner text="Verifying Authentication..." />;
    }

    const handleEmailPasswordSubmit = async (e) => {
        e.preventDefault(); setError(''); setFormLoading(true);
        try {
            if (isSignUp) {
                if (!name.trim()) { setError("Name is required for sign up."); setFormLoading(false); return; }
                await signUpWithEmailPassword(email, password, name);
            } else {
                await signInWithEmailPassword(email, password);
            }
        } catch (err) { setError(err.message || "An error occurred. Please try again."); }
        setFormLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setError(''); setFormLoading(true);
        try { await signInWithGoogle(); } 
        catch (err) { setError(err.message || "Google Sign-In failed. Please try again."); }
        setFormLoading(false);
    };

    return ( <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4"> <Card className="w-full max-w-md"> <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6"> {isSignUp ? "Create Account" : "Welcome Back!"} </h1> <p className="text-center text-gray-600 dark:text-gray-300 mb-6"> {isSignUp ? "Join JEEPrep.tech today." : "Sign in to continue your prep."} </p> {error && <p className="mb-4 text-center text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded-md">{error}</p>} <form onSubmit={handleEmailPasswordSubmit} className="space-y-4"> {isSignUp && ( <InputField label="Full Name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" required /> )} <InputField label="Email Address" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /> <InputField label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /> <Button type="submit" variant="primary" className="w-full" disabled={formLoading}> {formLoading ? <LoadingSpinner text={isSignUp ? "Signing Up..." : "Signing In..."} /> : (isSignUp ? "Sign Up" : "Sign In")} </Button> </form> <div className="mt-6 text-center"> <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-sm text-blue-600 hover:underline dark:text-blue-400"> {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"} </button> </div> <div className="my-6 flex items-center"> <hr className="flex-grow border-gray-300 dark:border-gray-600"/> <span className="mx-4 text-gray-500 dark:text-gray-400 text-sm">OR</span> <hr className="flex-grow border-gray-300 dark:border-gray-600"/> </div> <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full" disabled={formLoading}> <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/> <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/> <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/> <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/> <path d="M1 1h22v22H1z" fill="none"/> </svg> Sign In with Google </Button> </Card> </div> );
};

const DashboardPage = () => { 
    const { userData, currentUser } = useAuth();
    const [studyFocus, setStudyFocus] = useState('');
    const [loadingStudyFocus, setLoadingStudyFocus] = useState(false);
    const [recentAttempts, setRecentAttempts] = useState([]);
    const [loadingRecentAttempts, setLoadingRecentAttempts] = useState(false);

    useEffect(() => {
        if (currentUser && db) {
            setLoadingRecentAttempts(true);
            const attemptsRef = collection(db, `artifacts/${appId}/public/data/attempts`);
            const q = query(attemptsRef, where("userId", "==", currentUser.uid), orderBy("attemptedAt", "desc"), limit(5));
            
            const unsubscribe = onSnapshot(q, async (snapshot) => {
                const attemptsData = [];
                for (const attemptDoc of snapshot.docs) {
                    const attempt = { id: attemptDoc.id, ...attemptDoc.data() };
                    if (attempt.questionId) {
                        try {
                            const qDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/questions`, attempt.questionId));
                            if (qDoc.exists()) {
                                attempt.questionText = qDoc.data().question_text.substring(0, 50) + "..."; 
                                attempt.questionSubject = qDoc.data().subject;
                            } else { attempt.questionText = "Question details not found."; }
                        } catch (e) { console.warn("Error fetching question detail for attempt:", e); attempt.questionText = "Error loading question." }
                    }
                    attemptsData.push(attempt);
                }
                setRecentAttempts(attemptsData);
                setLoadingRecentAttempts(false);
            }, (error) => { console.error("Error fetching recent attempts:", error); setLoadingRecentAttempts(false); });
            return () => unsubscribe();
        }
    }, [currentUser]);

    if (!userData || !currentUser) return <LoadingSpinner text="Loading dashboard data..." />;

    const generateStudyFocus = async () => { 
        setLoadingStudyFocus(true); setStudyFocus('');
        const prompt = `Based on a JEE aspirant's profile (XP: ${userData.xp}, Coins: ${userData.coins}, Streak: ${userData.streak_days} days), suggest a brief study focus for today. Keep it concise and motivational.`;
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory }; const apiKey = ""; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(`API request failed: ${errorData?.error?.message || 'Unknown error'}`);}
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts?.[0]) { setStudyFocus(result.candidates[0].content.parts[0].text); } 
            else { setStudyFocus("Could not generate study focus."); }
        } catch (error) { setStudyFocus(`Failed to generate study focus: ${error.message}`); }
        setLoadingStudyFocus(false);
    };
    
    const StatCard = ({ title, value, icon, colorClass = "blue" }) => ( <Card className={`bg-${colorClass}-500 text-white dark:bg-${colorClass}-700`}> <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center">{icon} {title}</h2> <p className="text-3xl sm:text-4xl font-bold">{value}</p> </Card> );

    return ( <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6"> <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Welcome back, {userData.name}!</h1> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"> <StatCard title="XP Points" value={userData.xp || 0} icon={<TrendingUp size={24} className="mr-2" />} colorClass="blue" /> <StatCard title="Coins" value={userData.coins || 0} icon={<Award size={24} className="mr-2" />} colorClass="green" /> <StatCard title="Streak" value={`${userData.streak_days || 0} Days`} icon={<Target size={24} className="mr-2" />} colorClass="yellow" /> </div> <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"> <Card> <div className="flex justify-between items-center mb-3"> <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 flex items-center"><Sparkles size={20} className="mr-2 text-purple-500"/>Today's Study Focus</h2> <Button onClick={generateStudyFocus} variant="ai" disabled={loadingStudyFocus} className="text-xs sm:text-sm py-1.5 px-3"> <Sparkles size={16} className="mr-1 sm:mr-2"/> {loadingStudyFocus ? "Generating..." : "Suggest"} </Button> </div> {loadingStudyFocus && <LoadingSpinner text="Generating..." />} {studyFocus && !loadingStudyFocus && ( <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded-md text-purple-700 dark:text-purple-200 whitespace-pre-wrap text-sm"> {studyFocus} </div> )} {!studyFocus && !loadingStudyFocus && ( <p className="text-gray-500 dark:text-gray-400 text-sm">Click "Suggest" for personalized study tips!</p> )} </Card> <Card> <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center"><Target size={20} className="mr-2 text-red-500"/>Personalized Targets</h2> <p className="text-gray-500 dark:text-gray-400 text-sm">Your daily/weekly targets will appear here. (Feature coming soon!)</p> <div className="mt-3 space-y-2"> <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">Target: Complete 10 Physics MCQs today. (Example)</div> <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">Reminder: Review Calculus formulas tonight. (Example)</div> </div> </Card> </div> <Card> <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center"><Activity size={20} className="mr-2 text-teal-500"/>Recent Activity</h2> {loadingRecentAttempts && <LoadingSpinner text="Loading recent activity..." />} {!loadingRecentAttempts && recentAttempts.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No recent practice sessions found. Start practicing to see your activity here!</p>} {!loadingRecentAttempts && recentAttempts.length > 0 && ( <ul className="space-y-2"> {recentAttempts.map(attempt => ( <li key={attempt.id} className={`p-2.5 rounded-md flex justify-between items-center text-sm ${attempt.isCorrect ? 'bg-green-50 dark:bg-green-900/50' : 'bg-red-50 dark:bg-red-900/50'}`}> <div> <span className="font-medium text-gray-700 dark:text-gray-200">{attempt.questionSubject ? `${attempt.questionSubject}: ` : ''}{attempt.questionText}</span> <span className="block text-xs text-gray-500 dark:text-gray-400"> {new Date(attempt.attemptedAt?.toDate()).toLocaleString()} - Time: {attempt.timeTaken}s </span> </div> {attempt.isCorrect ? <CheckCircle size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-500" />} </li> ))} </ul> )} </Card> </div> );
};

const PracticePage = () => { 
    const { currentUser, userData, updateUserProfile } = useAuth(); // Removed isAuthReady as loadingAuth covers it in App
    const [allQuestions, setAllQuestions] = useState([]); 
    const [filteredQuestions, setFilteredQuestions] = useState([]); 
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [attempted, setAttempted] = useState(false);
    const [removedOptionIndex, setRemovedOptionIndex] = useState(null); 
    const [isFlagged, setIsFlagged] = useState(false); 
    const [subjectFilter, setSubjectFilter] = useState('');
    const [chapterFilter, setChapterFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [timer, setTimer] = useState(0); 
    const [timerIntervalId, setTimerIntervalId] = useState(null);
    const [processingAttempt, setProcessingAttempt] = useState(false); 
    const [aiHint, setAiHint] = useState('');
    const [loadingAiHint, setLoadingAiHint] = useState(false);
    const [aiDeeperExplanation, setAiDeeperExplanation] = useState('');
    const [loadingAiDeeperExplanation, setLoadingAiDeeperExplanation] = useState(false);
    const POWER_UP_COST = 20; 

    useEffect(() => {
        if (!db) return; // Removed isAuthReady check as App handles initial loading
        const fetchInitialQuestions = async () => {
            setLoadingQuestions(true);
            try {
                const qCollection = collection(db, `artifacts/${appId}/public/data/questions`);
                const querySnapshot = await getDocs(qCollection);
                const fetchedQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllQuestions(fetchedQuestions);
                setFilteredQuestions(fetchedQuestions.sort(() => 0.5 - Math.random()).slice(0,10));
            } catch (error) { console.error("Error fetching questions:", error); setFeedback({ message: 'Failed to load questions.', type: 'error' }); }
            setLoadingQuestions(false);
        };
        fetchInitialQuestions();
    }, []); // Removed isAuthReady dependency

    const applyFilters = useCallback(() => {
        let questionsToFilter = [...allQuestions];
        if (subjectFilter) questionsToFilter = questionsToFilter.filter(q => q.subject === subjectFilter);
        if (chapterFilter) questionsToFilter = questionsToFilter.filter(q => q.chapter && q.chapter.toLowerCase().includes(chapterFilter.toLowerCase()));
        if (yearFilter) questionsToFilter = questionsToFilter.filter(q => q.year && q.year.toString() === yearFilter);
        setFilteredQuestions(questionsToFilter.sort(() => 0.5 - Math.random()).slice(0, 10));
        setCurrentQuestionIndex(0); 
        resetQuestionState();
    }, [allQuestions, subjectFilter, chapterFilter, yearFilter]);

    useEffect(() => { applyFilters(); }, [applyFilters]);

    useEffect(() => {
        if (attempted || !filteredQuestions[currentQuestionIndex]) { clearInterval(timerIntervalId); return; }
        setTimer(0); 
        const intervalId = setInterval(() => setTimer(prevTime => prevTime + 1), 1000);
        setTimerIntervalId(intervalId);
        return () => clearInterval(intervalId); 
    }, [currentQuestionIndex, attempted, filteredQuestions]);

    const currentQuestion = filteredQuestions[currentQuestionIndex];

    const resetQuestionState = () => {
        setSelectedAnswer(null); setShowExplanation(false); setFeedback({ message: '', type: '' });
        setAttempted(false); setAiHint(''); setAiDeeperExplanation(''); setTimer(0);
        setRemovedOptionIndex(null); setIsFlagged(false);
        if(timerIntervalId) clearInterval(timerIntervalId);
    };
    
    const callGeminiAPI = async (prompt) => { 
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory }; const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`API Error: ${errorData?.error?.message || response.statusText}`);}
        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) { return result.candidates[0].content.parts[0].text; } 
        else { throw new Error("Unexpected AI response structure."); }
    };
    const handleGetAiHint = async () => { 
        if (!currentQuestion) return; setLoadingAiHint(true); setAiHint('');
        try { const prompt = `Hint for JEE question: "${currentQuestion.question_text}"`; setAiHint(await callGeminiAPI(prompt)); } 
        catch (error) { setAiHint(`Hint failed: ${error.message}`); } setLoadingAiHint(false);
    };
    const handleGetAiDeeperExplanation = async () => { 
        if (!currentQuestion) return; setLoadingAiDeeperExplanation(true); setAiDeeperExplanation('');
        try { const prompt = `Deeper explanation for: "${currentQuestion.question_text}". Original: "${currentQuestion.explanation || 'N/A'}". Answer: "${currentQuestion.correct_ans}".`; setAiDeeperExplanation(await callGeminiAPI(prompt));} 
        catch (error) { setAiDeeperExplanation(`Explanation failed: ${error.message}`); } setLoadingAiDeeperExplanation(false);
    };

    const handleAnswerSubmit = async () => {
        if (!currentQuestion || !userData || !currentUser || processingAttempt) return;
        setProcessingAttempt(true); clearInterval(timerIntervalId); setAttempted(true);
        const isCorrect = selectedAnswer === currentQuestion.correct_ans;
        try {
            let difficultyMultiplier = 1;
            if (currentQuestion.difficulty === "Medium") difficultyMultiplier = 1.5;
            if (currentQuestion.difficulty === "Hard") difficultyMultiplier = 2;
            let calculatedXpChange = isCorrect ? (10 * difficultyMultiplier) : (-5 * difficultyMultiplier);
            let calculatedCoinChange = isCorrect ? Math.round(calculatedXpChange / 10) : 0;
            const newXp = (userData.xp || 0) + calculatedXpChange;
            const newCoins = (userData.coins || 0) + calculatedCoinChange;
            const newStreak = userData.streak_days || 0; 
            await updateUserProfile({ xp: newXp, coins: newCoins, streak_days: newStreak });
            if (isCorrect) { setFeedback({ message: `Correct! +${calculatedXpChange.toFixed(0)} XP, +${calculatedCoinChange} Coin(s)`, type: 'success' }); } 
            else { setFeedback({ message: `Incorrect. Correct: ${currentQuestion.correct_ans}. ${calculatedXpChange.toFixed(0)} XP`, type: 'error' }); }
        } catch (error) { console.error("Error processing attempt:", error); setFeedback({ message: `Error: ${error.message}`, type: 'error' }); }
        setShowExplanation(true);
        try {
            const attemptsCollection = collection(db, `artifacts/${appId}/public/data/attempts`);
            await addDoc(attemptsCollection, { userId: currentUser.uid, questionId: currentQuestion.id, selectedAnswer: selectedAnswer, isCorrect: isCorrect, timeTaken: timer, isFlagged: isFlagged, attemptedAt: serverTimestamp() });
        } catch (error) { console.error("Error logging attempt:", error); }
        setProcessingAttempt(false);
    };

    const handleNextQuestion = () => { if (currentQuestionIndex < filteredQuestions.length - 1) { setCurrentQuestionIndex(currentQuestionIndex + 1); resetQuestionState(); } else { setFeedback({ message: 'You have completed all available questions in this set!', type: 'info' }); } };
    const handleUsePowerUpRemoveOption = async () => { 
        if (!currentQuestion || currentQuestion.question_type !== 'MCQ' || removedOptionIndex !== null) return;
        if ((userData?.coins || 0) < POWER_UP_COST) { setFeedback({ message: `Not enough coins! You need ${POWER_UP_COST}.`, type: 'error'}); return; }
        const success = await updateUserProfile({ coins: (userData.coins || 0) - POWER_UP_COST });
        if (!success) { setFeedback({ message: 'Failed to use power-up.', type: 'error'}); return; }
        const options = currentQuestion.options || [];
        const incorrectOptionsIndices = options.map((opt, index) => (opt !== currentQuestion.correct_ans ? index : -1)).filter(index => index !== -1);
        if (incorrectOptionsIndices.length > 0) { const randomIndexToRemove = incorrectOptionsIndices[Math.floor(Math.random() * incorrectOptionsIndices.length)]; setRemovedOptionIndex(randomIndexToRemove); setFeedback({ message: `Power-up used! One incorrect option removed. -${POWER_UP_COST} coins.`, type: 'success'}); } 
        else { setFeedback({ message: 'Could not apply power-up.', type: 'info'}); await updateUserProfile({ coins: (userData.coins || 0) + POWER_UP_COST }); }
    };
    const toggleFlagQuestion = () => setIsFlagged(!isFlagged);

    if (loadingQuestions && !allQuestions.length) return <LoadingSpinner text="Loading questions..." />;
    if (!allQuestions.length && !loadingQuestions) return <Card><p className="text-center text-gray-600 dark:text-gray-300">No questions found. Admin can add some!</p></Card>;
    const currentOptions = currentQuestion?.options ? (Array.isArray(currentQuestion.options) ? currentQuestion.options : Object.values(currentQuestion.options)) : [];

    return ( <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto"> <Card className="mb-4 md:mb-6"> <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-700 dark:text-gray-200 flex items-center"> <Filter size={20} className="mr-2"/> Filter Questions </h3> <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4"> <SelectField label="Subject" id="subjectFilter" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}> <option value="">All Subjects</option> <option value="Physics">Physics</option> <option value="Chemistry">Chemistry</option> <option value="Maths">Maths</option> </SelectField> <InputField label="Chapter" id="chapterFilter" value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} placeholder="e.g., Kinematics" /> <InputField label="Year" id="yearFilter" type="number" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} placeholder="e.g., 2023" /> </div> {loadingQuestions && allQuestions.length > 0 && <LoadingSpinner text="Applying filters..." />} </Card> {!currentQuestion && !loadingQuestions && ( <Card><p className="text-center text-gray-600 dark:text-gray-300">No questions match your current filters. Try adjusting them!</p></Card> )} {currentQuestion && ( <Card> <div className="flex justify-between items-start mb-2"> <div> <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200">Question {currentQuestionIndex + 1} of {filteredQuestions.length}</h2> <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentQuestion.difficulty === 'Hard' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' : currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' : 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100'}`}> Difficulty: {currentQuestion.difficulty || 'Not set'} </span> </div> <div className="flex items-center space-x-2"> <button onClick={toggleFlagQuestion} title={isFlagged ? "Unflag Question" : "Flag Question"} className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${isFlagged ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}> <Flag size={18} fill={isFlagged ? 'currentColor' : 'none'} /> </button> <div className="flex items-center text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400"> <Clock size={18} className="mr-1" /> {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')} </div> </div> </div> <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Subject: {currentQuestion.subject} | Chapter: {currentQuestion.chapter} | Year: {currentQuestion.year}</p> <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-md"> <p className="text-base sm:text-lg text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{currentQuestion.question_text}</p> </div> {currentQuestion.question_type === 'MCQ' && !attempted && removedOptionIndex === null && (userData?.coins || 0) >= POWER_UP_COST && ( <div className="mb-3 sm:mb-4"> <Button onClick={handleUsePowerUpRemoveOption} variant="powerup" className="w-full text-xs sm:text-sm py-1.5 sm:py-2"> <Zap size={16} className="mr-2"/> Remove an Option ({POWER_UP_COST} Coins) </Button> </div> )} {!attempted && ( <div className="mb-3 sm:mb-4"> <Button onClick={handleGetAiHint} variant="ai" disabled={loadingAiHint} className="w-full text-xs sm:text-sm py-1.5 sm:py-2"> <Lightbulb size={16} className="mr-2"/> {loadingAiHint ? 'Getting Hint...' : 'Get AI Hint ✨'} </Button> {loadingAiHint && <LoadingSpinner text="AI is thinking..." />} {aiHint && !loadingAiHint && ( <div className="mt-2 p-2 sm:p-3 bg-purple-50 dark:bg-purple-900 rounded-md text-xs sm:text-sm text-purple-700 dark:text-purple-200 whitespace-pre-wrap"> <strong>AI Hint:</strong> {aiHint} </div> )} </div> )} {currentQuestion.question_type === 'MCQ' && currentOptions.length > 0 && ( <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6"> {currentOptions.map((option, index) => { const isRemovedByPowerUp = index === removedOptionIndex; return ( <button key={index} onClick={() => !attempted && !isRemovedByPowerUp && setSelectedAnswer(option)} disabled={attempted || isRemovedByPowerUp} className={`w-full text-left p-2.5 sm:p-3 rounded-md border-2 transition-colors text-sm sm:text-base ${selectedAnswer === option ? 'border-blue-500 bg-blue-100 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'} ${attempted && option === currentQuestion.correct_ans ? 'bg-green-100 dark:bg-green-800 border-green-500' : ''} ${attempted && selectedAnswer === option && option !== currentQuestion.correct_ans ? 'bg-red-100 dark:bg-red-800 border-red-500' : ''} ${(attempted || isRemovedByPowerUp) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isRemovedByPowerUp ? 'bg-gray-300 dark:bg-gray-600 line-through' : ''} `} > {String.fromCharCode(65 + index)}. {option} </button> ); })} </div> )} {currentQuestion.question_type === 'Numeric' && ( <div className="mb-4 sm:mb-6"> <InputField type="number" id="numericAnswer" value={selectedAnswer || ''} onChange={(e) => !attempted && setSelectedAnswer(e.target.value)} disabled={attempted} placeholder="Enter your numeric answer" /> </div> )} {feedback.message && ( <div className={`p-2.5 sm:p-3 rounded-md mb-3 sm:mb-4 text-xs sm:text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : feedback.type === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'}`}> {feedback.message} </div> )} {showExplanation && currentQuestion.explanation && ( <Card className="mt-3 sm:mt-4 bg-yellow-50 dark:bg-gray-700/50"> <h4 className="font-semibold text-yellow-700 dark:text-yellow-200 mb-1 sm:mb-2 text-sm sm:text-base">Explanation:</h4> <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-100 whitespace-pre-wrap">{currentQuestion.explanation}</p> {currentQuestion.explanation_url && ( <a href={currentQuestion.explanation_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-1 sm:mt-2 block text-xs sm:text-sm"> View Detailed Explanation Video/Link </a> )} </Card> )} {attempted && ( <div className="mt-3 sm:mt-4"> <Button onClick={handleGetAiDeeperExplanation} variant="ai" disabled={loadingAiDeeperExplanation} className="w-full text-xs sm:text-sm py-1.5 sm:py-2"> <Sparkles size={16} className="mr-2"/> {loadingAiDeeperExplanation ? 'Generating...' : 'Get AI Deeper Explanation ✨'} </Button> {loadingAiDeeperExplanation && <LoadingSpinner text="AI is crafting..." />} {aiDeeperExplanation && !loadingAiDeeperExplanation && ( <div className="mt-2 p-2 sm:p-3 bg-purple-50 dark:bg-purple-900 rounded-md text-xs sm:text-sm text-purple-700 dark:text-purple-200 whitespace-pre-wrap"> <strong>AI Deeper Explanation:</strong> {aiDeeperExplanation} </div> )} </div> )} <div className="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 space-y-2 sm:space-y-0 sm:space-x-3"> <Button onClick={() => setShowExplanation(!showExplanation)} variant="secondary" disabled={!attempted && !currentQuestion.explanation} className="w-full sm:w-auto text-xs sm:text-sm"> {showExplanation ? 'Hide' : 'Show'} Provided Explanation </Button> {!attempted && ( <Button onClick={handleAnswerSubmit} disabled={selectedAnswer === null || processingAttempt} className="w-full sm:w-auto text-xs sm:text-sm"> {processingAttempt ? 'Processing...' : 'Submit Answer'} </Button> )} {attempted && ( <Button onClick={handleNextQuestion} className="w-full sm:w-auto text-xs sm:text-sm"> {currentQuestionIndex < filteredQuestions.length - 1 ? 'Next Question' : 'Finish Practice Set'} </Button> )} </div> </Card> )} </div>
    );
};

const LeaderboardPage = () => { /* ... (No significant changes) ... */ 
    const [leaderboardData, setLeaderboardData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const { isAuthReady } = useAuth();
    useEffect(() => { if (!db || !isAuthReady) return; setLoading(true); const usersCollection = collection(db, `artifacts/${appId}/public/data/users`);
        const unsubscribe = onSnapshot(usersCollection, (querySnapshot) => { const users = []; querySnapshot.forEach((doc) => { users.push({ id: doc.id, ...doc.data() }); }); users.sort((a, b) => (b.xp || 0) - (a.xp || 0)); setLeaderboardData(users.slice(0, 20)); setLoading(false); }, 
        (err) => { setError("Failed to load leaderboard."); setLoading(false); }); return () => unsubscribe(); }, [isAuthReady]);
    if (loading) return <LoadingSpinner text="Loading leaderboard..." />; if (error) return <Card><p className="text-red-500 text-center">{error}</p></Card>;
    return ( <div className="p-4 md:p-8"> <Card> <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Leaderboard</h1> {leaderboardData.length === 0 ? ( <p className="text-gray-500 dark:text-gray-400">No users on the leaderboard yet.</p> ) : ( <ul className="space-y-3"> {leaderboardData.map((user, index) => ( <li key={user.id} className={`flex items-center justify-between p-4 rounded-lg shadow-sm ${index < 3 ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 dark:from-yellow-500 dark:to-yellow-700 text-gray-800' : 'bg-gray-50 dark:bg-gray-700'}`}> <div className="flex items-center"> <span className={`font-bold text-lg mr-4 w-8 text-center ${index < 3 ? 'text-yellow-900 dark:text-yellow-100' : 'text-gray-600 dark:text-gray-300'}`}>{index + 1}</span> <div> <p className={`font-semibold ${index < 3 ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>{user.name}</p> <p className={`text-sm ${index < 3 ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-500 dark:text-gray-400'}`}>{user.email}</p> </div> </div> <div className="text-right"> <p className={`font-bold text-lg ${index < 3 ? 'text-yellow-900 dark:text-yellow-100' : 'text-blue-600 dark:text-blue-400'}`}>{user.xp || 0} XP</p> <p className={`text-sm ${index < 3 ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-500 dark:text-gray-400'}`}>{user.coins || 0} Coins</p> </div> </li> ))} </ul> )} </Card> </div> );
};

const ProfilePage = () => { /* ... (No significant changes) ... */ 
    const { userData, updateUserProfile, loadingAuth, isAuthReady } = useAuth();
    const [name, setName] = useState(''); const [email, setEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false); const [message, setMessage] = useState({ text: '', type: '' });
    useEffect(() => { if (userData) { setName(userData.name || ''); setEmail(userData.email || ''); } }, [userData]);
    const handleSaveProfile = async (e) => { e.preventDefault(); setMessage({ text: '', type: '' }); if (!name.trim()) { setMessage({ text: 'Name cannot be empty.', type: 'error' }); return; } const success = await updateUserProfile({ name }); if (success) { setMessage({ text: 'Profile updated!', type: 'success' }); setIsEditing(false); } else { setMessage({ text: 'Failed to update profile.', type: 'error' }); } };
    if (loadingAuth || !isAuthReady || !userData) return <LoadingSpinner text="Loading profile..." />;
    return ( <div className="p-4 md:p-8 max-w-2xl mx-auto"> <Card> <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Profile</h1> {!isEditing && ( <Button onClick={() => setIsEditing(true)} variant="ghost"> <Edit3 size={18} className="mr-2 inline"/> Edit Profile </Button> )} </div> {message.text && ( <div className={`p-3 rounded-md mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'}`}> {message.text} </div> )} <form onSubmit={handleSaveProfile} className="space-y-4"> <div> <InputField label="Name" id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} /> </div> <div> <InputField label="Email" id="email" type="email" value={email} disabled className="bg-gray-100 dark:bg-gray-700"/> </div> <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"> <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-center"> <p className="text-sm text-blue-500 dark:text-blue-300">XP</p> <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{userData.xp || 0}</p> </div> <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg text-center"> <p className="text-sm text-green-500 dark:text-green-300">Coins</p> <p className="text-2xl font-bold text-green-700 dark:text-green-200">{userData.coins || 0}</p> </div> <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-center"> <p className="text-sm text-yellow-500 dark:text-yellow-300">Streak</p> <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-200">{userData.streak_days || 0} days</p> </div> </div> {isEditing && ( <div className="flex space-x-3 pt-4"> <Button type="submit" variant="primary">Save Changes</Button> <Button type="button" onClick={() => { setIsEditing(false); setName(userData.name); }} variant="secondary">Cancel</Button> </div> )} </form> <div className="mt-8"> <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center"><LineChart size={20} className="mr-2 text-indigo-500"/>Rank History</h2> <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-400 dark:text-gray-500 p-4"> <p className="text-center">A visual chart of your rank progress over time will be displayed here. <br/> (Full data aggregation and charting is a future feature!)</p> </div> </div> </Card> </div> );
};

const AdminPage = () => { /* ... (No significant changes) ... */ 
    const { userData, isAuthReady } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ subject: 'Physics', chapter: '', year: new Date().getFullYear(), question_text: '', options: ['', '', '', ''], correct_ans: '', explanation: '', explanation_url: '', question_type: 'MCQ', difficulty: 'Medium' });
    const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [successMessage, setSuccessMessage] = useState(''); const [generatingQuestion, setGeneratingQuestion] = useState(false);
    const fetchAdminQuestions = useCallback(async () => { if (!db || !isAuthReady) return; setLoading(true); try { const qCollection = collection(db, `artifacts/${appId}/public/data/questions`); const querySnapshot = await getDocs(qCollection); setQuestions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); } catch (err) { setError("Failed to load questions."); } setLoading(false); }, [isAuthReady]);
    useEffect(() => { fetchAdminQuestions(); }, [fetchAdminQuestions]);
    const handleInputChange = (e) => { const { name, value } = e.target; setNewQuestion(prev => ({ ...prev, [name]: value })); };
    const handleOptionChange = (index, value) => { const updatedOptions = [...newQuestion.options]; updatedOptions[index] = value; setNewQuestion(prev => ({ ...prev, options: updatedOptions })); };
    const handleAddQuestion = async (e) => { e.preventDefault(); setError(''); setSuccessMessage(''); if (!newQuestion.question_text.trim() || !newQuestion.correct_ans.trim()) { setError("Question text and correct answer are required."); return; } if (newQuestion.question_type === 'MCQ' && newQuestion.options.filter(opt => opt.trim() !== '').length < 2) { setError("MCQ questions must have at least 2 filled options."); return; } try { const qCollection = collection(db, `artifacts/${appId}/public/data/questions`); const questionToAdd = { ...newQuestion, year: parseInt(newQuestion.year) || null, options: newQuestion.question_type === 'MCQ' ? newQuestion.options.filter(opt => opt.trim() !== '') : [], createdAt: serverTimestamp() }; await addDoc(qCollection, questionToAdd); setSuccessMessage("Question added successfully!"); setShowAddModal(false); setNewQuestion({ subject: 'Physics', chapter: '', year: new Date().getFullYear(), question_text: '', options: ['', '', '', ''], correct_ans: '', explanation: '', explanation_url: '', question_type: 'MCQ', difficulty: 'Medium' }); fetchAdminQuestions(); } catch (err) { setError("Failed to add question. " + err.message); } };
    const generateQuestionWithAI = async () => { setGeneratingQuestion(true); setError(''); const topic = newQuestion.chapter || newQuestion.subject; if (!topic) { setError("Please specify a subject or chapter."); setGeneratingQuestion(false); return; } const prompt = `Generate a new JEE exam practice question (MCQ type with 4 options A, B, C, D) for the topic: "${topic}" in ${newQuestion.subject}. The question should have a difficulty level (Easy, Medium, or Hard). Provide the question text, four distinct options, the correct answer (text of correct option), a brief explanation, and the difficulty. Format: JSON object with keys: "question_text", "options" (array of 4 strings), "correct_ans" (string), "explanation" (string), "difficulty" (string: "Easy", "Medium", or "Hard"). Example for correct_ans: "Option C text"`; try { let chatHistory = [{ role: "user", parts: [{ text: prompt }] }]; const payload = { contents: chatHistory, generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { "question_text": { "type": "STRING" }, "options": { "type": "ARRAY", "items": { "type": "STRING" }, "minItems": 4, "maxItems": 4 }, "correct_ans": { "type": "STRING" }, "explanation": { "type": "STRING" }, "difficulty": { "type": "STRING", "enum": ["Easy", "Medium", "Hard"]} }, required: ["question_text", "options", "correct_ans", "explanation", "difficulty"] } } }; const apiKey = ""; const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`; const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) { const errorData = await response.json(); throw new Error(`API Error: ${errorData?.error?.message || response.statusText}`);}
            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) { const generatedData = JSON.parse(result.candidates[0].content.parts[0].text); setNewQuestion(prev => ({ ...prev, question_text: generatedData.question_text || '', options: generatedData.options || ['', '', '', ''], correct_ans: generatedData.correct_ans || '', explanation: generatedData.explanation || '', difficulty: generatedData.difficulty || 'Medium', question_type: 'MCQ' })); } else { throw new Error("Unexpected AI response for question generation."); }
        } catch (error) { setError(`AI question generation failed: ${error.message}`); }
        setGeneratingQuestion(false);
    };
    if (!isAuthReady) return <LoadingSpinner text="Initializing admin panel..." />; if (userData && userData.role !== 'admin') { return <Card><p className="text-red-500 text-center">Access Denied.</p></Card>; } if (!userData) return <LoadingSpinner text="Verifying admin access..." />;
    return ( <div className="p-4 md:p-8"> <Card> <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin - Manage Questions</h1> <Button onClick={() => setShowAddModal(true)} variant="primary"> <PlusCircle size={18} className="mr-2 inline"/> Add Question </Button> </div> {successMessage && <p className="p-3 rounded-md mb-4 text-sm bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">{successMessage}</p>} {error && <p className="p-3 rounded-md mb-4 text-sm bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200">{error}</p>} {loading ? <LoadingSpinner text="Loading questions..." /> : ( <div className="overflow-x-auto"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700"> <tr> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chapter</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Question</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difficulty</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th> <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th> </tr> </thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {questions.map(q => ( <tr key={q.id}> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{q.subject}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{q.chapter}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={q.question_text}>{q.question_text}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{q.difficulty || 'N/A'}</td> <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{q.question_type}</td> <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"> <Button variant="ghost" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 text-xs p-1">Edit</Button> </td> </tr> ))} </tbody> </table> {questions.length === 0 && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No questions found.</p>} </div> )} </Card> <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Question"> <form onSubmit={handleAddQuestion} className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto p-1 text-sm sm:text-base"> {error && <p className="text-red-500 text-xs sm:text-sm mb-2">{error}</p>} <SelectField label="Question Type" id="question_type_modal" name="question_type" value={newQuestion.question_type} onChange={handleInputChange}> <option value="MCQ">MCQ</option> <option value="Numeric">Numeric</option> </SelectField> <SelectField label="Subject" id="subject_modal" name="subject" value={newQuestion.subject} onChange={handleInputChange}> <option>Physics</option> <option>Chemistry</option> <option>Maths</option> </SelectField> <SelectField label="Difficulty" id="difficulty_modal" name="difficulty" value={newQuestion.difficulty} onChange={handleInputChange}> <option>Easy</option> <option>Medium</option> <option>Hard</option> </SelectField> <InputField label="Chapter" id="chapter_modal" name="chapter" value={newQuestion.chapter} onChange={handleInputChange} placeholder="e.g., Kinematics" /> <Button type="button" onClick={generateQuestionWithAI} variant="ai" disabled={generatingQuestion} className="w-full text-xs sm:text-sm py-1.5 sm:py-2 my-2"> <Sparkles size={16} className="mr-2" /> {generatingQuestion ? 'AI Generating...' : '✨ Generate Question with AI ✨'} </Button> {generatingQuestion && <LoadingSpinner text="AI is crafting..." />} <InputField label="Year" id="year_modal" name="year" type="number" value={newQuestion.year} onChange={handleInputChange} /> <div> <label htmlFor="question_text_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Text</label> <textarea id="question_text_modal" name="question_text" value={newQuestion.question_text} onChange={handleInputChange} rows="3" className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" placeholder="Enter the full question"></textarea> </div> {newQuestion.question_type === 'MCQ' && ( <> <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Options</p> {newQuestion.options.map((opt, index) => ( <div key={index}> <InputField label={`Option ${String.fromCharCode(65 + index)}`} id={`option_${index}_modal`} value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} /> </div> ))} <InputField label="Correct Answer (text)" id="correct_ans_mcq_modal" name="correct_ans" value={newQuestion.correct_ans} onChange={handleInputChange} placeholder="Enter text of correct option"/> </> )} {newQuestion.question_type === 'Numeric' && ( <InputField label="Correct Numeric Answer" id="correct_ans_numeric_modal" name="correct_ans" type="number" step="any" value={newQuestion.correct_ans} onChange={handleInputChange} placeholder="e.g., 9.81"/> )} <div> <label htmlFor="explanation_modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Explanation</label> <textarea id="explanation_modal" name="explanation" value={newQuestion.explanation} onChange={handleInputChange} rows="2" className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white" placeholder="Detailed explanation"></textarea> </div> <InputField label="Explanation URL (Optional)" id="explanation_url_modal" name="explanation_url" type="url" value={newQuestion.explanation_url} onChange={handleInputChange} placeholder="https://example.com/explanation.mp4"/> <div className="flex justify-end space-x-3 pt-2"> <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary">Cancel</Button> <Button type="submit" variant="primary">Add Question</Button> </div> </form> </Modal> </div> );
};

function App() {
    // Main app logic: handle auth, page switching, dark mode, etc.
    const [currentPage, setCurrentPage] = useState('auth');
    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('jeeprep-theme');
        return savedTheme === 'dark';
    });
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('jeeprep-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('jeeprep-theme', 'light');
        }
    }, [darkMode]);
    const handleLoginSuccess = useCallback(() => {
        setCurrentPage('dashboard');
    }, []);
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardPage />;
            case 'practice': return <PracticePage />;
            case 'leaderboard': return <LeaderboardPage />;
            case 'profile': return <ProfilePage />;
            case 'admin': return <AdminPage />;
            default: return <AuthPage onLoginSuccess={handleLoginSuccess} />;
        }
    };
    const { currentUser, signOut, userData, loadingAuth } = useAuth();
    useEffect(() => {
        if (!loadingAuth) {
            if (!currentUser && currentPage !== 'auth') {
                setCurrentPage('auth');
            } else if (currentUser && currentPage === 'auth') {
                setCurrentPage('dashboard');
            }
        }
    }, [currentUser, currentPage, loadingAuth]);
    if (loadingAuth) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <LoadingSpinner text="Initializing JEEPrep.tech..." />
            </div>
        );
    }
    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
            {/* Navbar and main content */}
            <main className="pb-16 pt-2 sm:pt-4">
                {renderPage()}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-3 text-center text-xs text-gray-500 dark:text-gray-400 z-50">
                JEEPrep.tech &copy; {new Date().getFullYear()}
                <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"> Toggle {darkMode ? 'Light' : 'Dark'} Mode </button>
                {currentUser && userData && <span className="ml-2 text-xs hidden sm:inline">UID: {currentUser.uid.substring(0,8)}... ({userData.role})</span>}
            </footer>
        </div>
    );
}

const AppContainer = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default AppContainer;

