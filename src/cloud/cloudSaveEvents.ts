export function notifyCloudSave(){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new Event('duckheist:save'));
}
