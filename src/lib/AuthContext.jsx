import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return undefined
    }
    return onAuthStateChanged(auth, setUser, () => setUser(null))
  }, [])

  const register = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: name })
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      displayName: name,
      email,
      role: 'student',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return credential.user
  }

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const profileRef = doc(db, 'users', credential.user.uid)
    const profile = await getDoc(profileRef)
    if (!profile.exists()) {
      await setDoc(profileRef, {
        uid: credential.user.uid,
        displayName: credential.user.displayName || '',
        email: credential.user.email || email,
        role: 'student',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    return credential.user
  }

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured, register, login, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
