"use client";

import {useEffect, useState} from "react";
import {MannersGame} from "../../manners-game";

export default function YardNotePage() {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("k");
    setCode(value === "r6" || value === "h3" ? value : null);
  }, []);
  if (code === undefined) return <main />;
  if (code === null) return <main><p>link not valid</p></main>;
  return <MannersGame yardPlaceLab showPlace={code === "h3"} studyCode={code} />;
}
