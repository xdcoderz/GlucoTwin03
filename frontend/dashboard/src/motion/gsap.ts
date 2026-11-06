import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(CustomEase, useGSAP);
export const easeOut = CustomEase.create('twin-out', '0.23,1,0.32,1');
export const easeSpatial = CustomEase.create('twin-spatial', '0.77,0,0.175,1');
export { gsap, useGSAP };
