import {MannersGame} from "../../manners-game";
import {readLinePair} from "@/lib/line-pair";

// Classifier frozen at studio/e4-card-proto 43cfbf037525543770c0b83c315a3574c532fb69.
export default async function LinePairPage({searchParams}: {searchParams: Promise<{k?: string | string[]}>}) {
  const query = await searchParams;
  const raw = Array.isArray(query.k) ? query.k[0] : query.k;
  const code = readLinePair(raw);
  if (code == null) return <main><p>link not valid</p></main>;
  return <MannersGame linePairCode={code} />;
}
