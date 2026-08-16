import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utility/config';
import { upsertUser } from '../services/firestore';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setError('');
    setSigningIn(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await upsertUser(user.email, {
        displayName: user.displayName,
        photoURL: user.photoURL,
      });

      const redirect = searchParams.get('redirect');
      const id = searchParams.get('id');
      if (redirect) {
        navigate(redirect);
      } else if (id) {
        navigate(`/start-test?id=${encodeURIComponent(id)}`);
      } else {
        navigate('/start-test');
      }
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div id="page-login" className="page active items-center justify-center">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-50">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Welcome back,</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in with Google to continue.</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full py-3 border border-gray-200 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors text-slate-600 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <i className="fa-brands fa-google text-red-500"></i> {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}
