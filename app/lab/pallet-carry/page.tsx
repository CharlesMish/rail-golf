import {MannersGame} from "../../manners-game";
import {readPalletCarry} from "@/lib/pallet-carry";

export default async function PalletCarryPage({searchParams}: {searchParams: Promise<{k?: string | string[]}>}) {
  const query = await searchParams;
  const raw = Array.isArray(query.k) ? query.k[0] : query.k;
  const code = readPalletCarry(raw);
  if (code == null) return <main><p>link not valid</p></main>;
  return <MannersGame palletCarryCode={code} />;
}
