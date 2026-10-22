// État de l'intro partagé entre l'overlay et le hero. Il vit dans le module (pas dans <html>) :
// un changement de langue remplace l'élément <html>, mais le module, lui, survit.
// Une actualisation de la page recharge le module, donc l'intro se rejoue.

type IntroState = {
  /** Overlay terminé : tout ce qui s'affiche ensuite (changement de langue, retour sur l'accueil)
   *  apparaît d'emblée, sans rejouer l'intro ni les animations du hero */
  played: boolean;
  /** Surcharge du délai de révélation du hero (« Passer », WebGL indisponible) */
  delay: string | null;
};

let state: IntroState = { played: false, delay: null };
const listeners = new Set<() => void>();

export const introStore = {
  get: () => state,
  getServer: (): IntroState => SERVER_STATE,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(patch: Partial<IntroState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
};

const SERVER_STATE: IntroState = { played: false, delay: null };
