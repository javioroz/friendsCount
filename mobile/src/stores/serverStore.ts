import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Normaliza lo que el usuario escribe en los ajustes.
 *
 * Acepta las formas habituales sin exigir un formato exacto: "192.168.0.42:3001/gun",
 * "ws://192.168.0.42:3001/gun" o "https://dominio/gun" se guardan siempre como una
 * URL WebSocket valida, porque el usuario no deberia tener que recordar si el
 * esquema es http o ws.
 */
export const normalizeRelayUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Sin esquema, se asume ws:// (relay local o IP de la red).
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `ws://${trimmed}`;

  // Gun habla WebSocket: http/https significan ws/wss.
  const wsUrl = withScheme.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');

  if (!/^wss?:\/\//i.test(wsUrl)) return null;

  // Se parsea y se vuelve a serializar en vez de recortar la cadena: recortar
  // "ws://" le quita las dos barras y WHATWG leeria "ws:/gun" como el host
  // "gun", que es un host valido pero no el servidor que el usuario escribio.
  let parsed: URL;
  try {
    parsed = new URL(wsUrl);
  } catch {
    return null;
  }
  if (!parsed.hostname) return null;

  // Anade la ruta del relay solo si el usuario no la escribio. Si la URL ya
  // contiene /gun en algun punto, se respeta tal cual en lugar de duplicarla.
  const basePath = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = /(?:^|\/)gun(?:\/|$)/i.test(basePath) ? basePath : `${basePath}/gun`;

  return parsed.toString();
};

interface ServerStore {
  relayUrl: string | null;
  hasHydrated: boolean;
  setRelayUrl: (url: string | null) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useServerStore = create<ServerStore>()(
  persist(
    (set) => ({
      relayUrl: null,
      hasHydrated: false,
      setRelayUrl: (relayUrl) => set({ relayUrl }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'friendscount-server',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ relayUrl: state.relayUrl }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<ServerStore> | undefined)?.relayUrl;
        // Un valor guardado a mano o de una version anterior puede no ser una
        // URL valida: se descarta en vez de dejar la app sin conectar.
        if (saved == null) return { ...current, relayUrl: null };
        if (typeof saved !== 'string') return { ...current, relayUrl: null };
        return { ...current, relayUrl: normalizeRelayUrl(saved) };
      },
      onRehydrateStorage: () => () => {
        useServerStore.setState({ hasHydrated: true });
      },
    }
  )
);
