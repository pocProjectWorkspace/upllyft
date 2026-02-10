'use client';

import { useAuth, apiClient } from '@upllyft/api-client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@upllyft/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

type AccountType = 'individual' | 'professional';

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
      <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 01-9.274 0C3.985 17.585 3 16.402 3 15.055z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.31H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.31A7 7 0 002.63 8.388a.75.75 0 001.449.39z" clipRule="evenodd" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

const inputClassName =
  'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-colors';

const inputWithIconClassName =
  'w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-colors';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('THERAPIST');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [organization, setOrganization] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const { data } = await apiClient.get<{ image: string }>('/captcha/generate');
      setCaptchaImage(data.image);
    } catch {
      setError('Failed to load captcha. Please refresh.');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  if (!authLoading && isAuthenticated) {
    router.replace('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!captcha.trim()) {
      setError('Please enter the captcha');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name,
        email,
        password,
        captcha,
        role: accountType === 'professional' ? role : 'USER',
      };

      if (accountType === 'professional') {
        if (licenseNumber.trim()) payload.licenseNumber = licenseNumber.trim();
        if (yearsOfExperience.trim()) {
          payload.yearsOfExperience = parseInt(yearsOfExperience, 10);
        }
        if (organization.trim()) payload.organization = organization.trim();
        if (specialization.trim()) {
          payload.specialization = specialization
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        }
        if (bio.trim()) payload.bio = bio.trim();
      }

      await register(payload);
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed. Please try again.');
      loadCaptcha();
      setCaptcha('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = '/api/auth/google';
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Register Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <img src="/logo.png" alt="Upllyft" className="h-10 w-auto" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an Account</h1>
          <p className="text-gray-500 mb-6">
            Join our community of families and professionals supporting neurodivergent children.
          </p>

          {/* Account Type Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            {(['individual', 'professional'] as AccountType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setAccountType(type);
                  setError('');
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  accountType === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type === 'individual' ? 'Parent / Caregiver' : 'Professional'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100 mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={inputWithIconClassName}
                />
              </div>
            </div>

            {/* Professional Role (professional only) */}
            {accountType === 'professional' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Professional Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <BriefcaseIcon className="w-4.5 h-4.5 text-gray-400" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THERAPIST">Therapist</SelectItem>
                      <SelectItem value="EDUCATOR">Educator</SelectItem>
                      <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* License Number & Years of Experience — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      License Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="TH-2024-001"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                    <input
                      type="number"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      placeholder="5"
                      min="0"
                      className={inputClassName}
                    />
                  </div>
                </div>

                {/* Organization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Organization <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="ABC Therapy Center"
                    className={inputClassName}
                  />
                </div>

                {/* Specializations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Specializations <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Pediatric Therapy, Autism Spectrum, Speech Therapy"
                    className={inputClassName}
                  />
                </div>

                {/* Professional Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Professional Bio <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description of your experience and expertise..."
                    rows={3}
                    className={`${inputClassName} resize-none`}
                  />
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter the characters you see</label>
              <div className="flex items-center gap-3 mb-2">
                {captchaLoading ? (
                  <div className="flex-1 h-14 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : captchaImage ? (
                  <img
                    src={captchaImage}
                    alt="Captcha"
                    className="flex-1 h-14 border border-gray-200 rounded-xl bg-white object-contain"
                  />
                ) : (
                  <div className="flex-1 h-14 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-red-500">Failed to load</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCaptcha('');
                    loadCaptcha();
                  }}
                  disabled={captchaLoading}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
                  title="Refresh captcha"
                >
                  <RefreshIcon className={`w-4.5 h-4.5 ${captchaLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <input
                type="text"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder="Enter captcha"
                required
                className={inputClassName}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                accountType === 'professional' ? 'Create Professional Account' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400 font-medium">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-500 mt-6 mb-8">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side — Hero Section (sticky while left form scrolls) */}
      <div className="hidden lg:block flex-1 self-start sticky top-0 h-screen">
        <div className="h-full bg-gradient-to-br from-teal-600 to-teal-800 flex flex-col justify-center p-12 xl:p-16 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-teal-400/10" />
          <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-teal-300/5" />

          {/* Content — vertically centered */}
          <div className="relative z-10 space-y-8">
            {/* Headline */}
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Start Your Child&apos;s Journey Today
              </h2>
              <p className="text-teal-100 text-lg mt-4 max-w-lg leading-relaxed">
                Join thousands of families and professionals working together to support neurodivergent children.
              </p>
            </div>

            {/* Features List */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-lg">
              <p className="text-white font-semibold text-base mb-4">What you&apos;ll get access to:</p>
              <div className="space-y-3">
                {[
                  'UFMF developmental screening tools',
                  'Connect with verified therapists',
                  'AI-powered personalized worksheets',
                  'Community support from other families',
                  'Case management & progress tracking',
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-teal-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-teal-200" />
                    </div>
                    <p className="text-white/90 text-sm">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
