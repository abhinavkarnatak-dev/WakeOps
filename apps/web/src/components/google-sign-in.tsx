import { signIn } from '@/auth';

export function GoogleSignIn() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('google', { redirectTo: '/onboarding' });
      }}
    >
      <button
        className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
        type="submit"
      >
        Continue with Google
      </button>
    </form>
  );
}
