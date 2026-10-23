// Fictional, connected alley network. These are game coordinates, not a map of addresses.
export const bounds = { x: 61, z: 51 };
export const spawn = { x: -40, z: 28 };
export const lots = [
  { x: -34, z: 17, yaw: 0, district: '晨光里' },
  { x: -34, z: 36, yaw: Math.PI, district: '晨光里' },
  { x: -9, z: 24, yaw: -Math.PI / 2, district: '晨光里' },
  { x: -31, z: 7, yaw: Math.PI / 2, district: '香料巷' },
  { x: -10, z: -3, yaw: 0, district: '香料巷' },
  { x: -8, z: -19, yaw: Math.PI / 2, district: '河畔弄' },
  { x: 15, z: -1, yaw: Math.PI, district: '河畔弄' },
  { x: 14, z: -23, yaw: 0, district: '河畔弄' },
  { x: 37, z: -17, yaw: -Math.PI / 2, district: '夜食町' },
  { x: 37, z: -39, yaw: 0, district: '夜食町' },
];
const corners = [[-40,28],[-20,28],[-20,8],[4,8],[4,-12],[26,-12],[26,-30],[53,-30],[53,44],[-46,44],[-46,28],[-40,28]];
function rounded(points) {
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a,b,c] = [points[i-1],points[i],points[i+1]];
    const beforeLength = Math.hypot(b[0]-a[0],b[1]-a[1]), afterLength=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const trim=Math.min(3,beforeLength/3,afterLength/3);
    const start=[b[0]-(b[0]-a[0])/beforeLength*trim,b[1]-(b[1]-a[1])/beforeLength*trim];
    const end=[b[0]+(c[0]-b[0])/afterLength*trim,b[1]+(c[1]-b[1])/afterLength*trim];
    result.push(start);
    for(let n=1;n<=7;n++){const t=n/7,u=1-t;result.push([u*u*start[0]+2*u*t*b[0]+t*t*end[0],u*u*start[1]+2*u*t*b[1]+t*t*end[1]]);}
  }
  result.push(points.at(-1)); return result;
}
export const road = rounded(corners);
export const branches = [[[4,-12],[4,-29]]];
export const roadLength = road.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-road[i][0],p[1]-road[i][1]),0);
export function roadAt(distance, offset=0) {
  distance=((distance%roadLength)+roadLength)%roadLength;
  for(let i=1;i<road.length;i++){
    const a=road[i-1],b=road[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(distance<=length){const t=distance/length;return {x:a[0]+dx*t-dz/length*offset,z:a[1]+dz*t+dx/length*offset,yaw:Math.atan2(dx,dz)};}
    distance-=length;
  }
  return {x:spawn.x,z:spawn.z,yaw:Math.PI/2};
}
export function localPoint(lot,x,z){return {x:lot.x+x*Math.cos(lot.yaw)+z*Math.sin(lot.yaw),z:lot.z-x*Math.sin(lot.yaw)+z*Math.cos(lot.yaw)};}
export function toLocal(lot,x,z){const dx=x-lot.x,dz=z-lot.z;return {x:dx*Math.cos(lot.yaw)-dz*Math.sin(lot.yaw),z:dx*Math.sin(lot.yaw)+dz*Math.cos(lot.yaw)};}
export function distanceToRoad(x,z){let best=Infinity;for(const path of [road,...branches])for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return best;}
