import {useEffect,useRef,type ReactNode} from 'react';

// Use the same top-layer, focus trapping and focus restoration as the codex.
export function GameDialog({label,children}:{label:string;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current!;
    dialog.showModal();
    return ()=>dialog.close();
  },[]);
  return <dialog className="panel game-dialog" aria-label={label} ref={ref}
    onCancel={event=>{
      event.preventDefault();
      // Secondary views (skill swap, confirm withdrawal) supply their own back action.
      ref.current?.querySelector<HTMLButtonElement>('.panel-head button')?.click();
    }}>{children}</dialog>;
}
