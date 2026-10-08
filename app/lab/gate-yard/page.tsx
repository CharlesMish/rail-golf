import {MannersGame} from "../../manners-game";
import {parseGateYardArm} from "@/lib/gate-yard";

export default async function GateYardPage({searchParams}:{searchParams:Promise<{k?:string|string[]}>}) {
  const query = await searchParams;
  const raw = Array.isArray(query.k) ? query.k[0] : query.k;
  const arm = parseGateYardArm(raw ?? null);
  if (!arm) return <main className="rail-golf-shell manners-shell" data-gate-yard="refused"><p>This yard link is not recognized.</p></main>;
  return <MannersGame gateYard arm={arm} />;
}
