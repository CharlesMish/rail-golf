import Link from 'next/link';
import {BUILD_ID} from '@/lib/build-identity';
import styles from '../places/places.module.css';

export default function FormsEnsemblePage(){return <main className={styles.page}>
  <header className={styles.header}>
    <p className={styles.eyebrow}>RAIL GOLF · ARCHITECTURAL FORMS &amp; ENSEMBLE</p>
    <h1>A place to return to.<br />A phrase to answer.</h1>
    <p className={styles.intro}>Explore another receiving region in Exchange Yard, or bring two remembered musical performances into your next physical shot.</p>
  </header>
  <section className={styles.primary} aria-label="Places and performances">
    <article className={styles.place}>
      <p className={styles.label}>ARCHITECTURAL PLAY</p><h2>Exchange Yard</h2>
      <p>Revisit a familiar journey from Forecourt, then face back through the district from Freight. Look for a different place to receive the ball and imagine where it might go next.</p>
      <p className={styles.detail}>Raised architecture is physical; dark street ends the shot. Aim, power and camera controls remain close at hand. Earlier physical layouts have separate shelves and remain selectable.</p>
      <Link className={styles.enter} href="/lab/places-architecture">Enter Exchange Yard</Link>
    </article>
    <article className={styles.music}>
      <p className={styles.label}>COMPOSE THROUGH PLAY</p><h2>Counterline Ensemble</h2>
      <p>Keep two phrases from any of the four musical worlds. Choose them as companions, then fire a new shot. Both remembered phrases play once beside your live performance.</p>
      <p className={styles.detail}>Use one companion for a duet, or none for solo play. Selecting a phrase does not move you into its world. Each source keeps its own physical history and sound settings.</p>
      <Link className={styles.enter} href="/lab/places-counterline">Play with companions</Link>
    </article>
  </section>
  <nav className={styles.comparisons} aria-label="Preserved comparisons">
    <span>Earlier experiments remain available</span>
    <a href="https://077e2174-rail-golf.charlesmish.workers.dev/lab/refinement">Previous Yard &amp; Counterline preview</a>
    <Link href="/lab/worldcraft">Worldcraft &amp; Foundry</Link>
    <Link href="/lab/playability-loops">Contact Loops</Link>
  </nav>
  <footer className={styles.footer}>
    <a href="https://github.com/CharlesMish/rail-golf/blob/research/forms-ensemble-20261126/docs/experiments/forms-ensemble/OWNER-GUIDE.md">Spoiler-free play guide</a>
    <span>Experimental preview · Build {BUILD_ID}</span>
  </footer>
</main>;}
