import Link from 'next/link';
import { BUILD_ID } from '@/lib/build-identity';
import styles from './horizons.module.css';

export default function HorizonsPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Rail Golf · Worldcraft research</p>
      <h1>Different places.<br />Different reasons to fire.</h1>
      <p className={styles.intro}>Three small physical experiments. Choose a place, watch what a shot does, and find one thing you want to change.</p>
    </header>
    <div className={styles.worlds}>
      <article className={styles.world}>
        <p className={styles.kind}>Upper and lower routes</p>
        <h2>Overpass</h2>
        <p>A raised crossing with open space underneath. What can the same structure do for a low line and a high one?</p>
        <dl><dt>Your controls</dt><dd>Origin, aim, elevation and power. Survey lets you inspect the crossing.</dd></dl>
        <Link className={styles.enter} href="/lab/worldcraft?foundry=overpass">Explore Overpass</Link>
      </article>
      <article className={styles.world}>
        <p className={styles.kind}>Release timing</p>
        <h2>Swing Gate</h2>
        <p>A wide timber gate slowly opens and closes the route. Slip past it, borrow its face, or see what changes on the way back.</p>
        <dl><dt>Your controls</dt><dd>Set power, aim and choose when to fire. Pause to hold a starting phase while you aim.</dd></dl>
        <Link className={styles.enter} href="/lab/horizons-gate">Explore Swing Gate</Link>
      </article>
      <article className={styles.world}>
        <p className={styles.kind}>Independent authored world</p>
        <h2>Crossing House</h2>
        <p>A small court divided by one screen. Find a way across, around or over it, then imagine a different destination.</p>
        <dl><dt>Your controls</dt><dd>Origin, aim, elevation and power. The central screen can move in Build.</dd></dl>
        <Link className={styles.enter} href="/lab/worldcraft?foundry=crossing-house">Explore Crossing House</Link>
      </article>
    </div>
    <section className={styles.protocol} aria-labelledby="visit-title">
      <h2 id="visit-title">A short first visit</h2>
      <ol>
        <li>Look around before firing. Choose a physical question of your own.</li>
        <li>Fire, then change just one thing. Keep a line if you want to revisit it; a miss is welcome.</li>
        <li>Try to make something different happen after the first interesting result.</li>
      </ol>
      <p>First ground contact still ends the shot. Restore prepares the recorded setup; you choose when to fire again.</p>
      <p>Afterward: what did you want to try next, and what made that choice hard to understand?</p>
    </section>
    <footer className={styles.footer}>
      <Link href="/lab/worldcraft">Open the full Worldcraft workshop</Link>
      <span>Experimental preview · Build {BUILD_ID}</span>
    </footer>
  </main>;
}
