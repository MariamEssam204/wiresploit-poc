/**
 * Module: AppContext
 * Purpose: Share capture state and navigation with every view, so a view
 *          needs no props from App and can be added through the registry.
 * Owner: Full Stack team
 */
import { createContext, useContext } from 'react'

const AppContext = createContext(null)

export const AppContextProvider = AppContext.Provider

/**
 * Read the shared app state from any component under App.
 * @returns {{
 *   capture: ReturnType<typeof import('../hooks/useCapture.js').useCapture>,
 *   navigation: { activeViewId: string, showView: (viewId: string) => void,
 *                 showPacket: (packetId: string) => void }
 * }}
 * @throws {Error} If used outside AppContextProvider.
 */
export function useAppContext() {
  const appState = useContext(AppContext)
  if (!appState) throw new Error('useAppContext must be used inside AppContextProvider')
  return appState
}
