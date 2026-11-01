try {
  if(new URLSearchParams(location.search).get('mode')==='classic') {
    await import('./classic');
    document.title='Tiny Civilization — A world of its own';
  } else {
    await import('./game');
  }
} catch(error) {
  console.error('Could not open Tiny Civilization',error);
  const app=document.querySelector<HTMLElement>('#app')!;
  app.replaceChildren();
  const message=document.createElement('p');
  message.textContent='Tiny Civilization could not open. Reload the page to try again. Your saved worlds are kept on this device.';
  const reload=document.createElement('button');
  reload.textContent='Reload game';
  reload.onclick=()=>location.reload();
  app.append(message,reload);
}
export {};
