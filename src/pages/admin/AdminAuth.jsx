import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../utility/config';
import { isAdminEmail } from '../../services/firestore';

export default function AdminAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSigningIn(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!(await isAdminEmail(user.email))) {
        await signOut(auth);
        setError('This account is not authorized as an admin.');
        return;
      }

      // Dashboard (the default landing page) fires several Firestore reads
      // the instant it mounts - force a fresh token now so the Firestore
      // client has a fully-attached credential before those reads go out,
      // instead of racing the SDK's own post-sign-in token handshake.
      await user.getIdToken(true);

      navigate(searchParams.get('redirect') || '/admin');
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F1F3F4] px-4">
      <div className="gcard w-full max-w-sm p-8 sm:w-[440px] sm:h-[440px] sm:flex sm:flex-col sm:justify-center">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-[#1F1F1F] rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <h1 className="text-2xl font-medium text-[#1F1F1F]">Admin Sign In</h1>
          <p className="text-[#444746] text-sm mt-1">Restricted to authorized administrators.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F1F1F] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={signingIn} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {signingIn ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
