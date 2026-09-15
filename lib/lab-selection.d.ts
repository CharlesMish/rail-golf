import type {GameCard} from './line-lab';
export type LabSelectionSnapshot=Readonly<{index:number;hole:GameCard;revision:number}>;
export function createLabSelection(cards:readonly GameCard[]):{cards:GameCard[];getSnapshot:()=>LabSelectionSnapshot;getServerSnapshot:()=>LabSelectionSnapshot;subscribe:(listener:()=>void)=>()=>void;select:(index:number)=>void;replaceOpenLine:(card:GameCard)=>void};
export type SelectionIdentity={card:string;station:string};
export type SelectionDiagnostic={kind:'state-divergence'|'state-aligned'|'visible-selection';rendered:SelectionIdentity;authority:SelectionIdentity;stage:string};
export function createSelectionWitness(report:(diagnostic:SelectionDiagnostic)=>void):{check:(rendered:SelectionIdentity,authority:SelectionIdentity,stage:string)=>boolean};
