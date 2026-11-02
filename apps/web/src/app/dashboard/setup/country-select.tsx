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
    <label className="relative block h-full min-w-0 border-r border-white/10 focus-within:bg-white/[0.03]">
      <span className="sr-only">Country calling code</span>
      <span
        aria-hidden="true"
        className="pointer-events-none flex h-full items-center justify-between gap-1 px-2 py-2 text-sm"
      >
        <span className="whitespace-nowrap">
          {country.code} +{country.callingCode}
        </span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-3 text-zinc-500"
          aria-hidden="true"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
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
