import admin from "firebase-admin";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.FIREBASE_PROJECT_ID;

let initialized = false;

export const ensureFirebase = () => {
  if (initialized) return admin;

  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.projectId ?? projectId,
    });
  } else {
    admin.initializeApp({ projectId });
  }

  initialized = true;
  return admin;
};

export const getFirestore = () => ensureFirebase().firestore();
export const getAuth = () => ensureFirebase().auth();
