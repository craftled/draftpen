import TermsClient from './_components/terms-client';
import { getPriceUSD } from '@/lib/polar-pricing';

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const priceUSD = await getPriceUSD();
  return <TermsClient priceUSD={priceUSD} />;
}

