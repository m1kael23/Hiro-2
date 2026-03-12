import { createContext, useContext, useEffect, useState } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore'
import { auth, db, handleFirestoreError, OperationType } from '../firebase'

const AuthContext = createContext({ 
  session: null, 
  profile: null, 
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  createProfile: async () => ({ data: null, error: null }),
  updateProfile: async () => ({ error: null }),
})

export function AuthProvider({ children }) {
  const [session,           setSession]           = useState(null)
  const [profile,           setProfile]           = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [passwordRecovery,  setPasswordRecovery]  = useState(false)

  useEffect(() => {
    // Test connection as requested
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user)
      if (user) {
        fetchProfile(user.uid)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const path = `users/${userId}`
    try {
      const docRef = doc(db, 'users', userId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setProfile(docSnap.data())
      } else {
        setProfile(null)
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Google Sign-In Error:", error)
      throw error
    }
  }

  async function signInWithEmail(email, password) {
    try {
      return await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Email Sign-In Error:", error)
      throw error
    }
  }

  async function signUpWithEmail(email, password) {
    try {
      return await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Email Sign-Up Error:", error)
      throw error
    }
  }

  async function resetPassword(email) {
    try {
      return await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Password Reset Error:", error)
      throw error
    }
  }

  async function updatePassword(newPassword) {
    if (!auth.currentUser) throw new Error("No user logged in")
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword)
      setPasswordRecovery(false)
    } catch (error) {
      console.error("Update Password Error:", error)
      throw error
    }
  }

  async function signOut() {
    try {
      await firebaseSignOut(auth)
      setPasswordRecovery(false)
    } catch (error) {
      console.error("Sign Out Error:", error)
      throw error
    }
  }

  async function createProfile(mode, fullName, additionalData = {}) {
    if (!auth.currentUser) throw new Error("No user logged in")
    const userId = auth.currentUser.uid
    const path = `users/${userId}`
    const profileData = {
      id:        userId,
      email:     auth.currentUser.email,
      mode,
      full_name: fullName,
      ...additionalData,
      createdAt: serverTimestamp()
    }

    try {
      await setDoc(doc(db, 'users', userId), profileData)
      setProfile(profileData)
      return { data: profileData, error: null }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path)
      return { data: null, error }
    }
  }

  async function updateProfile(data) {
    if (!auth.currentUser) throw new Error("No user logged in")
    const userId = auth.currentUser.uid
    const path = `users/${userId}`
    try {
      await setDoc(doc(db, 'users', userId), data, { merge: true })
      setProfile(prev => ({ ...prev, ...data }))
      return { error: null }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path)
      return { error }
    }
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      passwordRecovery,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPassword,
      updatePassword,
      createProfile,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext);
