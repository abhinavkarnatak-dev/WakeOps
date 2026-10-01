'use client';

import { useState } from 'react';

type Country = { code: string; name: string; callingCode: string };

export function CountrySelect({
  defaultCountry,
  countries,
}: {
  defaultCountry: string;
  countries: Country[];
}) {
  const [selected, setSelected] = useState(defaultCountry);
  const country = countries.find((item) => item.code === selected) ?? countries[0]!;
  return (
    <label className="relative block h-full min-w-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-lime-300">
      <span className="sr-only">Country calling code</span>
      <span
        aria-hidden="true"
        className="pointer-events-none flex h-full items-center justify-between gap-1 px-2 py-2 text-sm"
      >
        <span className="whitespace-nowrap">
          {country.code} +{country.callingCode}
        </span>
        <span className="text-xs text-zinc-500">v</span>
      </span>
      <select
        name="phoneCountry"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer bg-[#101111] text-zinc-100 opacity-0"
        style={{ colorScheme: 'dark' }}
        autoComplete="country"
      >
        {countries.map((item) => (
          <option
            key={item.code}
            value={item.code}
            className="bg-[#101111] text-zinc-100"
            style={{ backgroundColor: '#020617', color: '#f1f5f9' }}
          >
            {item.name} ({item.code}) +{item.callingCode}
          </option>
        ))}
      </select>
    </label>
  );
}
