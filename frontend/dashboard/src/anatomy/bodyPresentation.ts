import * as THREE from 'three';
import {gsap} from 'gsap';
import type {BodyGlow} from './visualStates';

// Shared asset coordinates: keep the neck, torso, arms and thighs down to the knees.
export const BODY_BOTTOM=.53;
export const BODY_TOP=1.49;
export const BODY_CENTER=(BODY_BOTTOM+BODY_TOP)/2;

/** Trim triangles at the two planes, rather than hiding parts with the camera. */
export function cropBodyShell(source:THREE.BufferGeometry):THREE.BufferGeometry {
  const flat=source.index?source.toNonIndexed():source.clone();
  const names=Object.keys(flat.attributes);
  type Vertex=Record<string,number[]>;
  const output:Record<string,number[]>=Object.fromEntries(names.map(name=>[name,[]]));
  const read=(index:number):Vertex=>Object.fromEntries(names.map(name=>{
    const attribute=flat.getAttribute(name);
    return [name,Array.from({length:attribute.itemSize},(_,k)=>attribute.getComponent(index,k))];
  }));
  function clip(vertices:Vertex[],height:number,above:boolean):Vertex[] {
    const result:Vertex[]=[];
    for(let i=0;i<vertices.length;i++) {
      const a=vertices[i],b=vertices[(i+1)%vertices.length];
      const insideA=above?a.position[1]>=height:a.position[1]<=height;
      const insideB=above?b.position[1]>=height:b.position[1]<=height;
      if(insideA)result.push(a);
      if(insideA!==insideB) {
        const t=(height-a.position[1])/(b.position[1]-a.position[1]);
        result.push(Object.fromEntries(names.map(name=>[name,a[name].map((v,k)=>v+(b[name][k]-v)*t)])));
      }
    }
    return result;
  }
  for(let i=0;i<flat.getAttribute('position').count;i+=3) {
    const polygon=clip(clip([read(i),read(i+1),read(i+2)],BODY_BOTTOM,true),BODY_TOP,false);
    for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])
      for(const name of names)output[name].push(...v[name]);
  }
  const geometry=new THREE.BufferGeometry();
  for(const name of names)geometry.setAttribute(name,new THREE.Float32BufferAttribute(output[name],flat.getAttribute(name).itemSize));
  geometry.normalizeNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();flat.dispose();
  return geometry;
}

/** Soft, layered silhouette light. No organ material is ever touched. */
export function createBodyAura(meshes:THREE.Mesh[],invalidate:()=>void) {
  const uniforms={glowColor:{value:new THREE.Color('#629cf5')},strength:{value:0}};
  const material=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float expansion; varying vec3 vNormal; varying vec3 vView;
      void main(){vec3 p=position+normal*expansion; vec4 mv=modelViewMatrix*vec4(p,1.0);
        vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 glowColor;uniform float strength;uniform float softness;
      varying vec3 vNormal;varying vec3 vView;
      void main(){float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.3);
        gl_FragColor=vec4(glowColor,(0.035+edge*0.65)*strength*softness);}`,
  });
  const layers:THREE.ShaderMaterial[]=[];
  for(const mesh of meshes)for(const [expansion,softness] of [[.002,.7],[.012,.35],[.026,.15]]) {
    const layer=material.clone();
    layer.uniforms={...uniforms,expansion:{value:expansion},softness:{value:softness}};
    const aura=new THREE.Mesh(mesh.geometry,layer);
    aura.name='body_glow_layer';aura.position.copy(mesh.position);aura.rotation.copy(mesh.rotation);aura.scale.copy(mesh.scale);
    aura.renderOrder=5;mesh.parent!.add(aura);layers.push(layer);
  }
  material.dispose();
  let tween:gsap.core.Timeline|undefined,key='';
  return {
    set(state:BodyGlow,shown:boolean,reduced:boolean) {
      const next=`${shown}-${state.tone}-${state.color}`;if(next===key)return;key=next;tween?.kill();
      const color=new THREE.Color(state.color);
      tween=gsap.timeline({defaults:{duration:reduced?0:.5,ease:'power2.inOut'},onUpdate:invalidate});
      tween.to(uniforms.glowColor.value,{r:color.r,g:color.g,b:color.b},0)
        .to(uniforms.strength,{value:shown?state.intensity:0},0);
      invalidate();
    },
    finish(){tween?.progress(1);},
    dispose(){tween?.kill();layers.forEach(layer=>layer.dispose());},
  };
}
