import { create } from 'zustand';

type LightProfileState = {
  name: string | null;
};

export const useLightProfileStore = create<LightProfileState>(() => ({
  name: null,
}));

export const isLightProfile = () =>
  useLightProfileStore.getState().name !== null;

export const useIsLightProfile = () =>
  useLightProfileStore((state) => state.name !== null);
