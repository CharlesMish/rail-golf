import {MannersGame} from "../../manners-game";
import {readMark} from "@/lib/yard-mark";

export default async function YardNotePage({searchParams}: {searchParams: Promise<{k?: string | string[]}>}) {
  const query = await searchParams;
  const raw = Array.isArray(query.k) ? query.k[0] : query.k;
  const mark = readMark(raw);
  if (mark == null) return <main><p>link not valid</p></main>;
  return <MannersGame yardPlaceLab q={mark} />;
}
