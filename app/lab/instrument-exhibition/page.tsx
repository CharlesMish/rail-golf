import Counterline from '../places-counterline/counterline';
import {exhibitionInstruments} from '@/lib/instrument-exhibition';

export default function Page(){
 return <Counterline key="instrument-exhibition" instrumentMode exhibitionInstruments={exhibitionInstruments()}/>;
}
