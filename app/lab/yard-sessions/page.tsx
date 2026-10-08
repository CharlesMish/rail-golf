import { MannersGame } from "../../manners-game";
import { BUILD_ID } from "@/lib/build-identity";
import { parseYardSessionQuery } from "@/lib/yard-sessions";

export default async function YardSessionsPage({ searchParams }: { searchParams: Promise<{ set?: string | string[] }> }) {
  const query = await searchParams;
  const raw = Array.isArray(query?.set) ? query.set : query?.set;
  const parsed = parseYardSessionQuery(raw);
  if (!parsed.ok) {
    return (
      <main className="rail-golf-shell">
        <small className="build-identity" title={"Build " + BUILD_ID}>BUILD {BUILD_ID}</small>
        <div className="boot-screen" role="alert"><strong>{parsed.message}</strong></div>
      </main>
    );
  }
  return <MannersGame yardSession={parsed.mode} />;
}
