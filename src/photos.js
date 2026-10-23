// A photo is displayed as a real shop photo only after identity, source and reuse
// permission are verified. Never substitute a generic dish photo for a shop.
export const verifiedPhotos = {};
export function photoFor(shop) {
 const verified = verifiedPhotos[shop.id];
 if (verified?.verified && verified.src && verified.source && verified.credit && verified.license) return verified;
 return { src: null, verified: false, credit: null,
  searchURL: 'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(shop.name+' '+shop.address+' 餐點 實拍'),
  status: '來源查核待完成：雲端搜尋與圖庫連線遭環境 403 封鎖。',
 };
}
