// Each swap is orthogonally adjacent to the blank, preserving solvability.
export const slideGoal='123456780';
export function slideNeighbors(blank){
 return [blank-3,blank+3,...(blank%3?[blank-1]:[]),...(blank%3<2?[blank+1]:[])].filter(i=>i>=0&&i<9);
}
export function createSlideBoard(){
 const cells=[1,2,3,4,5,6,7,8,0];let blank=8;
 for(const i of [7,4,3,0,1,4,5,8,7,6,3,4]){
  if(!slideNeighbors(blank).includes(i))throw new Error('Invalid puzzle shuffle');
  [cells[i],cells[blank]]=[cells[blank],cells[i]];blank=i;
 }
 return cells;
}
// A* returns a shortest legal path. Yield regularly so hints cannot block input
// or rendering, even after the player has scrambled the board extensively.
export function* solveSlide(cells){
 const start=cells.join(''),heap=[],cost=new Map([[start,0]]),parent=new Map();
 const distance=s=>[...s].reduce((sum,v,i)=>v==='0'?sum:sum+Math.abs(Math.floor(i/3)-Math.floor((+v-1)/3))+Math.abs(i%3-(+v-1)%3),0);
 const before=(a,b)=>a.f<b.f||a.f===b.f&&a.h<b.h;
 function push(n){let i=heap.length;heap.push(n);while(i){const p=(i-1)>>1;if(!before(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&before(heap[c+1],heap[c]))c++;if(!before(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}
 const h=distance(start);push({s:start,g:0,h,f:h});let expanded=0;
 while(heap.length){
  const n=pop();if(cost.get(n.s)!==n.g)continue;
  if(n.s===slideGoal){const path=[];let s=n.s;while(s!==start){const p=parent.get(s);path.push(p.tile);s=p.from;}return path.reverse();}
  const blank=n.s.indexOf('0');
  for(const tile of slideNeighbors(blank)){
   const a=[...n.s];[a[tile],a[blank]]=[a[blank],a[tile]];const s=a.join(''),g=n.g+1;
   if(g>=(cost.get(s)??Infinity))continue;
   cost.set(s,g);parent.set(s,{from:n.s,tile});const h=distance(s);push({s,g,h,f:g+h});
  }
  if(++expanded%128===0)yield;
 }
 return null;
}
