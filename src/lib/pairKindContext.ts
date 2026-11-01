import { createContext, useContext } from "react";
import type { PairKind } from "./pairKind";

/** Кем для меня является выбранный человек в «Парном»: от этого зависят формулировки. */
export const PairKindContext = createContext<PairKind>("friend");
export const usePairKind = (): PairKind => useContext(PairKindContext);

/** Любовные формулировки («пара», «годовщина») нужны только для типа «Любимый человек». */
export const isRomantic = (kind?: PairKind): boolean => kind === "love";
