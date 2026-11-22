import Link from 'next/link';
import {BUILD_ID} from '@/lib/build-identity';
import styles from './playgrounds.module.css';

const places=[
 {name:'Two-Shadow Theatre',kind:'Compose a flight',href:'/lab/playgrounds-theatre',description:'One real flight has two silhouettes. Make a turn appear in one view, or keep two lines that look alike from one direction and different from the other.',controls:'Aim, elevation and power. Compare chosen lines on the same time cursor.',note:'A visual instrument with schematic views of actual Havok motion.'},
 {name:'Gallery Cistern',kind:'Explore a place',href:'/lab/playgrounds-architecture',description:'An open cistern with broad galleries at different heights and a side chamber. Discover which part of the room a shot can reach next.',controls:'Launch rail, aim, elevation and power. Survey the whole enclosure.',note:'The lower floor ends the shot. Walls and galleries can carry it onward.'},
 {name:'Guest Stone',kind:'Prepare the next shot',href:'/lab/playgrounds-persistence',description:'A heavy visitor occupies a small garden. Each impact can leave it somewhere new. Find a place for it, or use its changed position in another line.',controls:'Aim and power move the stone through real impacts. Let it settle before the next shot.',note:'Keep includes the starting arrangement. Undo and Reset have separate purposes.'},
];

export default function PlaygroundsPage(){return <main className={styles.page}>
 <header className={styles.header}><p className={styles.eyebrow}>RAIL GOLF · NEXT PLAYGROUNDS</p><h1>What would you<br/>like the next shot to do?</h1><p className={styles.intro}>Compose a pair of views, explore an enclosing place, or spend a shot changing the next one. Three independent experiments, open to your intentions.</p></header>
 <section className={styles.places} aria-label="Choose a playground">{places.map((place,index)=><article className={styles.card} key={place.href} data-place={index}>
  <p className={styles.kind}>{place.kind}</p><h2>{place.name}</h2><p className={styles.description}>{place.description}</p><p className={styles.controls}>{place.controls}</p><p className={styles.note}>{place.note}</p><Link className={styles.enter} href={place.href}>Enter {place.name}</Link>
 </article>)}</section>
 <section className={styles.visit} aria-label="Your first visit"><h2>A few shots are enough to begin</h2><p>Look around, fire, and change one thing you are curious about. Keep a result when you want to return to it. Restore prepares the remembered starting conditions; you choose when to fire again.</p><p>There is no required route or score. If a place stops suggesting another shot, that is useful feedback too.</p></section>
 <footer className={styles.footer}><Link href="/lab/horizons">Previous Horizons studies</Link><span>Experimental preview · Build {BUILD_ID}</span></footer>
 </main>;}
