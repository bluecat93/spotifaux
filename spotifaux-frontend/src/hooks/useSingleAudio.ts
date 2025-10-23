import { useRef } from "react";
export function useSingleAudio() {
  const audios = useRef<Map<string | number, HTMLAudioElement>>(new Map());
  const register = (id: string | number, el: HTMLAudioElement | null) => {
    if (!el) { audios.current.delete(id); return; }
    audios.current.set(id, el);
    el.addEventListener("play", () => {
      for (const [otherId, a] of audios.current.entries()) if (otherId !== id && !a.paused) a.pause();
    });
  };
  return { register };
}
