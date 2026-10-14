import type { MutableRefObject } from 'react';
import type { YardFeatureLabel } from '@/lib/yard-labels';

export type YardLabelElements = Record<string, HTMLDivElement | null>;
export type YardLeaderElements = Record<string, SVGLineElement | null>;

/** World pins are projected by the scene; these callouts never predict a shot. */
export function YardLabels({ features, target, elements, leaders }: {
  features: YardFeatureLabel[];
  target: { label: string; color: string; distance: string | null } | null;
  elements: MutableRefObject<YardLabelElements>;
  leaders: MutableRefObject<YardLeaderElements>;
}) {
  const labels = [
    ...(target ? [{ id: 'destination', label: target.label, color: target.color, detail: target.distance ? `LAND HERE · ${target.distance}` : 'LAND HERE' }] : []),
    ...features.map(feature => ({ id: feature.id, label: feature.label, color: feature.id === 'boost' ? 'boost' : 'amber', detail: '' })),
  ];
  return <>
    <svg className="yard-label-leaders" aria-hidden="true">{labels.map(label => <line key={label.id} ref={node => { leaders.current[label.id] = node; }} data-color={label.color} data-visible="false" />)}</svg>
    {labels.map(label => <div key={label.id} ref={node => { elements.current[label.id] = node; }} className="destination-label yard-label" data-feature={label.id} data-color={label.color} data-visible="false" aria-hidden="true">
      {label.detail && <span>{label.detail}</span>}<strong>{label.label}</strong>
    </div>)}
  </>;
}
