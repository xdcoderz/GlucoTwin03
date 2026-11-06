/** Display rules for a body-level aura, never an organ-health classification. */
export type BodyGlow = { tone:'attention'|'steady'|'neutral'|'unavailable'; color:string; intensity:number; label:string };
export function sampleGlow(glucose:number|null, rate:number|null = null):BodyGlow {
  if(glucose===null || !Number.isFinite(glucose) || glucose<=0)return {tone:'unavailable',color:'#000000',intensity:0,label:'No valid sample · body glow off'};
  const validRate=rate!==null && Number.isFinite(rate);
  if(glucose<70 || glucose>=180 || (validRate && rate!<=-.5 && glucose<=100) || (validRate && rate!>=.5 && glucose>=140))
    return {tone:'attention',color:'#ef646e',intensity:1,label:'Red body glow · outside demo band or moving away from it'};
  if(validRate && (Math.abs(rate!)<.5 || (rate!<0 && glucose>100) || (rate!>0 && glucose<100)))
    return {tone:'steady',color:'#4ecb8b',intensity:1,label:'Green body glow · in-band and steady or improving'};
  return {tone:'neutral',color:'#629cf5',intensity:1,label:'Blue body glow · neutral sample or trend unavailable'};
}
