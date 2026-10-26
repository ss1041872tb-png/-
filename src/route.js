import { bounds } from './layout.js?v=6.5.0';

// Static walking grid: traffic never forces a constantly changing route.
export function createRoutePlanner(world) {
 const minX=-bounds.x+1,minZ=-bounds.z+1,width=bounds.x*2-1,height=bounds.z*2-1;
 const cells=new Int8Array(width*height).fill(-1);
 const point=id=>({x:minX+id%width,z:minZ+Math.floor(id/width)});
 function walkable(x,z){if(x<0||z<0||x>=width||z>=height)return false;const id=z*width+x;if(cells[id]<0)cells[id]=Number(world.staticClear(minX+x,minZ+z,.35));return cells[id]===1;}
 function clearLine(a,b,r=.25){const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(length/.3));for(let i=0;i<=n;i++){const t=i/n;if(!world.staticClear(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,r))return false;}return true;}
 function anchor(p){const x=Math.round(p.x-minX),z=Math.round(p.z-minZ),candidates=[];for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){const nx=x+dx,nz=z+dz;if(walkable(nx,nz)){const id=nz*width+nx,q=point(id);candidates.push({id,q,d:Math.hypot(q.x-p.x,q.z-p.z)});}}candidates.sort((a,b)=>a.d-b.d);return candidates.find(c=>clearLine(p,c.q,-.22))?.id;}
 function plan(start,end){
  start={x:start.x,z:start.z};end={x:end.x,z:end.z};if(clearLine(start,end))return[start,end];
  const first=anchor(start),last=anchor(end);if(first===undefined||last===undefined)return[];
  const cost=new Float64Array(cells.length).fill(Infinity),parent=new Int32Array(cells.length).fill(-1),closed=new Uint8Array(cells.length),heap=[];
  const goal=point(last),estimate=id=>{const p=point(id);return Math.hypot(goal.x-p.x,goal.z-p.z);};
  function push(id,f){const item={id,f};let n=heap.length;heap.push(item);while(n){const p=(n-1)>>1;if(heap[p].f<=f)break;heap[n]=heap[p];n=p;}heap[n]=item;}
  function pop(){const top=heap[0],tail=heap.pop();if(heap.length){let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=tail.f)break;heap[n]=heap[c];n=c;}heap[n]=tail;}return top.id;}
  cost[first]=0;push(first,estimate(first));
  while(heap.length){const id=pop();if(closed[id])continue;if(id===last){const ids=[];for(let at=last;at!==-1;at=parent[at])ids.push(at);const raw=[start,...ids.reverse().map(point),end],path=[start];let at=0;while(at<raw.length-1){let next=at+1;for(let n=raw.length-1;n>at+1;n--)if(clearLine(raw[at],raw[n])){next=n;break;}path.push(raw[next]);at=next;}return path;}
   closed[id]=1;const x=id%width,z=Math.floor(id/width);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz||!walkable(x+dx,z+dz)||dx&&dz&&(!walkable(x+dx,z)||!walkable(x,z+dz)))continue;const next=(z+dz)*width+x+dx,g=cost[id]+Math.hypot(dx,dz);if(closed[next]||g>=cost[next]||!clearLine(point(id),point(next)))continue;cost[next]=g;parent[next]=id;push(next,g+estimate(next));}
  }return[];
 }
 return{plan,invalidate(){cells.fill(-1);}};
}
