import {MannersGame} from "../../manners-game";
import {parsePalletYardKey,parsePalletYardStart,palletYardFlatB} from "@/lib/pallet-yard";

export default async function PalletYardPage({searchParams}:{searchParams:Promise<{k?:string|string[];s?:string|string[]}>}) {
  const query = await searchParams;
  const rawK = Array.isArray(query.k) ? query.k[0] : query.k;
  const rawS = Array.isArray(query.s) ? query.s[0] : query.s;
  const key = parsePalletYardKey(rawK ?? null);
  const start = parsePalletYardStart(rawS ?? null);
  if (!key || !start) return <main className="rail-golf-shell manners-shell" data-pallet-yard="refused"><p>This link is not valid.</p></main>;
  return <MannersGame palletYard palletFlatB={palletYardFlatB(key)} palletStart={start} />;
}
