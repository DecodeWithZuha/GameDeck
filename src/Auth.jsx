import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from './firebase'

export default function Auth({ user }) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-8 h-8 rounded-full border-2 border-purple-500"
        />
        <span className="text-sm text-gray-300 hidden md:block">
          {user.displayName}
        </span>
        <button
          onClick={handleLogout}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-100 transition-all"
    >
      <img
        src="https://www.google.com/favicon.ico"
        alt="Google"
        className="w-4 h-4"
      />
      Sign in with Google
    </button>
  )
}