import { auth } from '@/auth';
import { CapabilityIndex } from '@/components/landing/capability-index';
import { FinalCall } from '@/components/landing/final-call';
import { Hero } from '@/components/landing/hero';
import { LandingNav } from '@/components/landing/landing-nav';
import { PayloadMap } from '@/components/landing/payload-map';
import { Sequence } from '@/components/landing/sequence';
import { SmoothScroll } from '@/components/landing/smooth-scroll';

export default async function HomePage() {
  const session = await auth();
  const appHref = session ? '/dashboard' : '/login';
  const appLabel = session ? 'Open dashboard' : 'Get started';

  return (
    <SmoothScroll>
      <div className="grain relative bg-[#050606] text-white">
        <LandingNav signedIn={Boolean(session)} appHref={appHref} />
        <main>
          <Hero appHref={appHref} appLabel={appLabel} />
          <Sequence />
          <CapabilityIndex />
          <PayloadMap />
        </main>
        <FinalCall appHref={appHref} appLabel={appLabel} />
      </div>
    </SmoothScroll>
  );
}
