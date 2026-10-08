import {MannersGame} from "../../manners-game";
import {BUILD_ID} from "@/lib/build-identity";
import {parseLinecraftE1Query} from "@/lib/linecraft-e1";

type Query = {arm?: string | string[]; station?: string | string[]};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LinecraftE1Page({searchParams}: {searchParams: Promise<Query>}) {
  const query = await searchParams;
  const parsed = parseLinecraftE1Query(first(query.arm), first(query.station));
  if (!parsed.ok) {
    return <main className="rail-golf-shell">
      <small className="build-identity" title={"Build " + BUILD_ID}>BUILD {BUILD_ID}</small>
      <div className="boot-screen" role="alert"><strong>{parsed.message}</strong></div>
    </main>;
  }
  return <MannersGame linecraftE1={parsed.mode} />;
}
