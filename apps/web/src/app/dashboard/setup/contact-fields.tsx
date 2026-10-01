import { phoneCountries, splitContactPhone } from '@wakeops/shared';
import { CountrySelect } from './country-select';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-[#101111] px-3 py-2 text-zinc-100 outline-none transition focus:border-lime-300';

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
        <span className="text-sm">Name</span>
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
        <span className="text-sm">Email</span>
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
        <p className="text-sm">Phone number</p>
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-[#101111] transition focus-within:border-lime-300">
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
              className="w-full min-w-0 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300"
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
