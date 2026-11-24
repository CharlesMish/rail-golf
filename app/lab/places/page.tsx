import Link from 'next/link';
import { BUILD_ID } from '@/lib/build-identity';
import styles from './places.module.css';

export default function PlacesPage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>RAIL GOLF · PLACES & COUNTERLINES</p>
      <h1>A place to explore.<br />A phrase to answer.</h1>
      <p className={styles.intro}>Choose a physical journey, or let a line you have already made give your next shot a musical intention. There is no required route or score.</p>
    </header>
    <section className={styles.primary} aria-label="Two ways to play">
      <article className={styles.place}>
        <p className={styles.label}>ARCHITECTURAL PLAYGROUND</p>
        <h2>Exchange Yard</h2>
        <p>A railway district of roofs, platforms and passages. Explore the architecture from different launch stations, and see what changing the height of a shot brings into reach.</p>
        <p className={styles.detail}>Choose a station. Aim, set elevation and power, then Fire. Follow the ball or step back into Overview. Keep a journey when it matters to you.</p>
        <Link className={styles.enter} href="/lab/places-architecture">Enter Exchange Yard</Link>
      </article>
      <article className={styles.music}>
        <p className={styles.label}>MUSIC THROUGH PHYSICAL PLAY</p>
        <h2>Counterline</h2>
        <p>Discover a phrase in Musical Workshop, Keep it, then choose it as your companion. Your remembered contacts sound once while a new real shot finds its own answer.</p>
        <p className={styles.detail}>Start solo, or choose a kept phrase. Adjust the next shot and Fire. The companion is recorded sound; only your new projectile moves through the world.</p>
        <Link className={styles.enter} href="/lab/places-counterline">Play Counterline</Link>
      </article>
    </section>
    <section className={styles.continue} aria-label="Physical continuation">
      <div><p className={styles.label}>A SMALL PHYSICAL PROGRAM</p><h2>Fire once. Or repeat a few times.</h2><p>Commit a short finite sequence directly. Each real shot meets the world left by the previous one, and waits for the stone to settle. Stop cancels the remaining launches.</p></div>
      <Link className={styles.secondary} href="/lab/places-repeater">Try direct repeats</Link>
    </section>
    <nav className={styles.comparisons} aria-label="Preserved comparisons">
      <span>Return to an earlier activity</span>
      <Link href="/lab/playability-cistern">Gallery Cistern</Link>
      <Link href="/lab/playability-loops">Contact Loops</Link>
      <Link href="/lab/playability-rolling">Rolling Yard</Link>
      <Link href="/lab/playability-repeater">Manual-trial Repeater</Link>
      <Link href="/lab/worldcraft">Worldcraft & Foundry</Link>
    </nav>
    <footer className={styles.footer}>
      <a href="https://github.com/CharlesMish/rail-golf/blob/research/places-counterlines-20261123/docs/experiments/places-counterlines/OWNER-GUIDE.md">Spoiler-free play guide</a>
      <span>Experimental preview · Build {BUILD_ID}</span>
    </footer>
  </main>;
}
