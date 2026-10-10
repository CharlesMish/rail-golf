import {MannersGame} from "../../manners-game";

// Trial query only. The shipped route hardcodes the heading slot once the
// placement check is done; `slot=banner` is the rejected overlay candidate.
export default async function YardPlaceCardPage({searchParams}: {searchParams: Promise<{slot?: string | string[]}>}) {
  const query = await searchParams;
  const slot = Array.isArray(query.slot) ? query.slot[0] : query.slot;
  return <MannersGame linecraftLab yardPlaceCard endingSlot={slot === "banner" ? "banner" : "heading"} />;
}
