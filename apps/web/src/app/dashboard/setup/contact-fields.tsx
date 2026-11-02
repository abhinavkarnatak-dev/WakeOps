import { phoneCountries, splitContactPhone } from '@wakeops/shared';
import { fieldClass } from '@/components/dashboard-ui';

import { CountrySelect } from './country-select';

export function ContactFields({
  engineer,
}: {
  engineer?: { name: string; email: string; phoneNumber: string; phoneCountry: string | null };
}) {
  const phone = engineer
    ? splitContactPhone(engineer.phoneNumber, engineer.phoneCountry)
    : { country: 'IN', nationalNumber: '' };
  return (
    <>
      <label className="block space-y-2">
        <span className="text-sm text-zinc-400">Name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={engineer?.name}
          className={fieldClass}
          autoComplete="name"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-zinc-400">Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={engineer?.email}
          className={fieldClass}
          autoComplete="email"
        />
      </label>
      <div className="space-y-2">
        <p className="text-sm text-zinc-400">Phone number</p>
        <div className="grid h-11 grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition focus-within:border-signal/70 focus-within:shadow-[0_0_0_4px_rgba(190,242,100,0.07)]">
          <CountrySelect defaultCountry={phone.country} countries={phoneCountries} />
          <label className="min-w-0">
            <span className="sr-only">Local phone number</span>
            <input
              name="nationalNumber"
              type="tel"
              required
              maxLength={30}
              defaultValue={phone.nationalNumber}
              placeholder="9876543210"
              className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-600"
              autoComplete="tel-national"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          Enter the local number. The selected country supplies the calling code.
        </p>
      </div>
    </>
  );
}
