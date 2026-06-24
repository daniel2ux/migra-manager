"use client";

import * as React from "react";

/** Indica que o componente está dentro de um DialogContent (Select usa popper em vez de item-aligned). */
export const FioriDialogLayerContext = React.createContext(false);

export function useInsideFioriDialog(): boolean {
  return React.useContext(FioriDialogLayerContext);
}
