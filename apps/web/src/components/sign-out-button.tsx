import { signOut } from '@/auth';

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
    >
      <button className="text-sm text-slate-300 underline hover:text-white" type="submit">
        Sign out
      </button>
    </form>
  );
}
