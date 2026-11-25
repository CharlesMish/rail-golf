import Link from 'next/link';
import { BUILD_ID } from '@/lib/build-identity';
import styles from '../places/places.module.css';

export default function RefinementPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>RAIL GOLF · EXCHANGE YARD &amp; COUNTERLINE</p>
      <h1>Revisit the works.<br />Find another answer.</h1>
      <p className={styles.intro}>A familiar railway district, with clearer shooting controls and a different way back through it. Two richer musical places for playing beside a phrase you have kept.</p>
    </header>
    <section className={styles.primary} aria-label="Refined places and activities">
      <article className={styles.place}>
        <p className={styles.label}>ARCHITECTURAL PLAY</p>
        <h2>Exchange Yard</h2>
        <p>Look under the viaduct, aim for a roof, or turn your journey back through the district. Aim, elevation and power are close at hand; your kept lines and detailed results have their own space.</p>
        <p className={styles.detail}>The dark street ends a shot. Raised architecture is physical. The occasional rings mark qualified physical rebounds; they are feedback, with no required route or score.</p>
        <Link className={styles.enter} href="/lab/places-architecture">Enter Exchange Yard</Link>
      </article>
      <article className={styles.music}>
        <p className={styles.label}>COMPOSE THROUGH PLAY</p>
        <h2>Counterline repertoire</h2>
        <p>Descending Resonance offers falling phrases and space between strikes. Chime Terraces spreads notes across a larger instrument, including closely grouped sounds. Both keep their authored physical arrangements.</p>
        <p className={styles.detail}>Start solo. Keep a phrase, choose it as a companion, then change the next shot. The remembered phrase plays once beside one new physical ball. The smaller workshops remain available.</p>
        <Link className={styles.enter} href="/lab/places-counterline">Play Counterline</Link>
      </article>
    </section>
    <nav className={styles.comparisons} aria-label="Preserved comparisons">
      <span>Compare with earlier play</span>
      <a href="https://a44866f1-rail-golf.charlesmish.workers.dev/lab/places">Original PR84 preview</a>
      <Link href="/lab/worldcraft">Original Worldcraft &amp; Foundry</Link>
      <Link href="/lab/playability-loops">Contact Loops</Link>
      <Link href="/lab/places-repeater">Shot Repeater</Link>
    </nav>
    <footer className={styles.footer}>
      <a href="https://github.com/CharlesMish/rail-golf/blob/research/yard-repertoire-20261125/docs/experiments/refinement/OWNER-GUIDE.md">Spoiler-free play guide</a>
      <span>Experimental preview · Build {BUILD_ID}</span>
    </footer>
  </main>;
}
