"use client";

import {useSyncExternalStore} from "react";
import {MannersGame} from "../../manners-game";

const subscribe = () => () => {};

function readCode() {
  const value = new URLSearchParams(window.location.search).get("k");
  return value === "r6" || value === "h3" ? value : "";
}

export default function YardNotePage() {
  const code = useSyncExternalStore(subscribe, readCode, () => undefined);
  if (code === undefined) return <main />;
  if (!code) return <main><p>link not valid</p></main>;
  return <MannersGame yardPlaceLab showPlace={code === "h3"} studyCode={code} />;
}
