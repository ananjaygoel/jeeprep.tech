# jeeprep.tech
# JEEPrep.tech Frontend

This is the React frontend for JEEPrep.tech.

## Project Setup (Vite)

This project was bootstrapped with [Vite](https://vitejs.dev/).

## Prerequisites

- Node.js (v18.x or higher recommended)
- npm (usually comes with Node.js)

## Environment Variables for Firebase

This application requires Firebase configuration to run. Your `App.jsx` looks for global variables `__app_id` and `__firebase_config` or uses placeholder values.

**For local development, the recommended way is to use Vite's environment variable system:**

1.  Create a file named `.env.local` in the root of the `jeeprep-tech-frontend` directory.
2.  Add your Firebase configuration to this `.env.local` file, prefixed with `VITE_`. **DO NOT COMMIT THIS FILE TO GIT.** Add `.env.local` to your `.gitignore` file.

    ```env
    # .env.local (DO NOT COMMIT TO GIT)
    VITE_APP_ID="jeeprep-tech-dev" # Or your specific app ID
    VITE_FIREBASE_API_KEY="YOUR_API_KEY"
    VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    VITE_FIREBASE_APP_ID_FIREBASE="YOUR_FIREBASE_APP_ID" # This is Firebase's own app ID for the project

    # If you prefer to pass the whole config as a JSON string:
    # VITE_FIREBASE_CONFIG_JSON='{"apiKey":"...", "authDomain":"...", ...}'
    ```

3.  Modify `src/App.jsx` to read these Vite environment variables instead of the global `__firebase_config` and `__app_id`.

    Near the top of `src/App.jsx`:

    ```javascript
    // Replace:
    // const appId = typeof __app_id !== 'undefined' ? __app_id : 'jeeprep-tech-dev';
    // ...
    // if (typeof __firebase_config !== 'undefined' && __firebase_config !== null && __firebase_config.trim() !== "") {
    //     try {
    //         firebaseConfig = JSON.parse(__firebase_config);
    // ...

    // With:
    const appId = import.meta.env.VITE_APP_ID || 'jeeprep-tech-dev';

    let firebaseConfig;
    const placeholderFirebaseConfig = { /* ... your existing placeholder ... */ };

    // Option 1: Individual Firebase config keys from .env.local
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
        firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID_FIREBASE
        };
    }
    // Option 2: If you used VITE_FIREBASE_CONFIG_JSON in .env.local
    // else if (import.meta.env.VITE_FIREBASE_CONFIG_JSON) {
    //    try {
    //        firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG_JSON);
    //    } catch (e) {
    //        console.error("Error parsing VITE_FIREBASE_CONFIG_JSON. Using placeholder.", e);
    //        firebaseConfig = placeholderFirebaseConfig;
    //    }
    // }
    else {
        console.warn("Firebase environment variables not found. Using placeholder configuration. Create a .env.local file.");
        firebaseConfig = placeholderFirebaseConfig;
    }
    ```

**For deployment (Netlify, Vercel, etc.):**
You will set these same `VITE_` prefixed environment variables in your hosting provider's dashboard. The build process on the server will then use them.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode.
Open [http://localhost:5173](http://localhost:5173) (or whatever port Vite chooses) to view it in your browser.

The page will reload when you make changes.
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

Your app is ready to be deployed!

### `npm run lint`

Lints the project files (if ESLint is configured).

### `npm run preview`

Serves the production build locally from the `dist` folder. Useful for testing the build before deployment.

## Next Steps After Pushing to GitHub

1.  **Deploy to a static hosting service:**
    *   Sign up for Netlify, Vercel, or Firebase Hosting.
    *   Connect your GitHub repository.
    *   Configure build settings:
        *   Build command: `npm run build`
        *   Publish directory: `dist`
    *   **Set Environment Variables:** Add your `VITE_APP_ID`, `VITE_FIREBASE_API_KEY`, etc., in the hosting provider's UI.
2.  Test your deployed application.