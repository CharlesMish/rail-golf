import Link from 'next/link';
import {BUILD_ID} from '@/lib/build-identity';
import styles from './playability.module.css';

const places=[
 {name:'Gallery Cistern',kind:'Follow the journey',href:'/lab/playability-cistern',description:'Return to the high galleries and connected chamber. Start at the launcher, follow the ball, or pull back to see the whole room.',controls:'Aim, elevation, power and launch rail. Follow / Overview changes your view during flight.',note:'Stop ends an attempt honestly when you have seen enough. The original physical room remains the comparison.'},
 {name:'Rolling Yard',kind:'Change the next world',href:'/lab/playability-rolling',description:'Compare a rolling boulder with the familiar heavy stone. Give an object somewhere to go, then work with the place your last shot left it.',controls:'Fire, watch the object settle, then fire again. Undo and kept starting states remain available.',note:'Each blow has a starting arrangement, a ball ending and a settled result.'},
 {name:'Shot Repeater',kind:'Set a small machine going',href:'/lab/playability-repeater',description:'Try a shot yourself, then deliberately repeat that setup a few times. The object moves; the launcher keeps its promise.',controls:'A finite sequence of real shots, one projectile at a time. Stop cancels the remaining launches.',note:'The next shot waits for the object to settle. An unchanged aim can encounter a changed world.'},
 {name:'Contact Loops',kind:'Listen to recorded lines',href:'/lab/playability-loops',description:'Two real shot histories become two sound layers. Listen alone or together, and hear what their physical timing suggests.',controls:'Choose recorded lines, start or stop playback, and compare the layers.',note:'Audio-only replay of recorded contacts. No new projectile or collision is being simulated.'},
];

export default function PlayabilityPage(){return <main className={styles.page}>
 <header className={styles.header}><p className={styles.eyebrow}>RAIL GOLF · PLAYABILITY, PERSISTENCE & REPETITION</p><h1>A place to explore.<br/>A world you can change.</h1><p className={styles.intro}>Follow an architectural journey, move something with a shot, or find out what repeating a physical line can become. Start with the revised Cistern, or choose your own question.</p></header>
 <section className={styles.places} aria-label="Choose an experiment">{places.map((place,index)=><article className={styles.card} key={place.href} data-place={index}>
  <p className={styles.kind}>{place.kind}</p><h2>{place.name}</h2><p className={styles.description}>{place.description}</p><p className={styles.controls}>{place.controls}</p><p className={styles.note}>{place.note}</p><Link className={styles.enter} href={place.href}>Enter {place.name}</Link>
 </article>)}</section>
 <section className={styles.visit} aria-label="Your first visit"><h2>Let the next intention come from what happens</h2><p>There is no required route or score. Change one thing you are curious about, and Keep a line when its flight or resulting world matters to you. Restoring a history always leaves the next launch to you.</p><p>The three physical places need a WebGL-enabled browser. Contact Loops plays recorded audio without rendering a physical scene.</p></section>
 <footer className={styles.footer}><Link href="/lab/playgrounds">Original Next Playgrounds controls</Link><a href="https://github.com/CharlesMish/rail-golf/blob/research/playability-persistence-20261122/docs/experiments/playability/OWNER-GUIDE.md">Spoiler-free play guide</a><span>Research preview · Build {BUILD_ID}</span></footer>
 </main>;}
