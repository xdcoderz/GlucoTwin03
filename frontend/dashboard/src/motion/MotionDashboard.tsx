import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP, easeOut } from './gsap';
import './presentation.css';

export default function MotionDashboard({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const elements = root.current?.querySelectorAll('.page-heading, .workspace-nav, .experience-topline, .experience-modes');
      if (elements) gsap.from(elements, { opacity: 0, transform: 'translateY(12px)', duration: .25, stagger: .05, ease: easeOut, clearProps: 'opacity,transform' });
    }, root);
    return () => media.revert();
  }, { scope: root });
  return <main ref={root} className="page motion-dashboard" data-motion="gsap">{children}</main>;
}
