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
        className="rounded-xl bg-lime-300 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-lime-200"
        type="submit"
      >
        Continue with Google
      </button>
    </form>
  );
}
