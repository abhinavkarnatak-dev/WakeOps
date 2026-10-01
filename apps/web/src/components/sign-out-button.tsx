import { logOut } from '@/components/sign-out-action';

export function SignOutButton({ menu = false }: { menu?: boolean }) {
  return (
    <form action={logOut}>
      <button
        className={
          menu
            ? 'flex w-full items-center justify-center rounded-xl border border-rose-400/15 px-3 py-2.5 text-center text-sm font-medium text-rose-300 transition hover:bg-rose-400/8'
            : 'flex w-full items-center justify-center rounded-xl border border-white/8 px-3 py-2.5 text-center text-sm text-zinc-400 transition hover:border-white/15 hover:bg-white/5 hover:text-white'
        }
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
