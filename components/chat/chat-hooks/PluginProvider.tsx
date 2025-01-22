"use client"

import React, { createContext, useReducer, useContext, useEffect } from "react"
import { PluginSummary } from "@/types/plugins"
import { availablePlugins } from "@/lib/tools/tool-store/available-tools"

export enum ActionTypes {
  INSTALL_PLUGIN = "INSTALL_PLUGIN",
  UNINSTALL_PLUGIN = "UNINSTALL_PLUGIN",
  SET_INSTALLED_PLUGIN_IDS = "SET_INSTALLED_PLUGIN_IDS"
}

type Action =
  | { type: ActionTypes.INSTALL_PLUGIN; payload: number }
  | { type: ActionTypes.UNINSTALL_PLUGIN; payload: number }
  | { type: ActionTypes.SET_INSTALLED_PLUGIN_IDS; payload: number[] }

interface State {
  installedPluginIds: number[]
}

const initialState: State = {
  installedPluginIds: []
}

const PluginContext = createContext<{
  state: State
  dispatch: React.Dispatch<Action>
}>({
  state: initialState,
  dispatch: () => null
})

const pluginReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionTypes.INSTALL_PLUGIN:
      if (!state.installedPluginIds.includes(action.payload)) {
        const updatedIds = [...state.installedPluginIds, action.payload]
        localStorage.setItem("installedPluginIds", JSON.stringify(updatedIds))
        return { ...state, installedPluginIds: updatedIds }
      }
      return state
    case ActionTypes.UNINSTALL_PLUGIN:
      const updatedIds = state.installedPluginIds.filter(
        id => id !== action.payload
      )
      localStorage.setItem("installedPluginIds", JSON.stringify(updatedIds))
      return { ...state, installedPluginIds: updatedIds }
    case ActionTypes.SET_INSTALLED_PLUGIN_IDS:
      return { ...state, installedPluginIds: action.payload }
    default:
      return state
  }
}

export const PluginProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [state, dispatch] = useReducer(pluginReducer, initialState)

  useEffect(() => {
    const localData = localStorage.getItem("installedPluginIds")
    let installedPluginIds: number[] = localData ? JSON.parse(localData) : []

    if (!localData) {
      const defaultPluginIds = [1, 2, 3, 9, 10]
      installedPluginIds = defaultPluginIds
      localStorage.setItem(
        "installedPluginIds",
        JSON.stringify(installedPluginIds)
      )
    }

    dispatch({
      type: ActionTypes.SET_INSTALLED_PLUGIN_IDS,
      payload: installedPluginIds
    })
  }, [])

  return (
    <PluginContext.Provider value={{ state, dispatch }}>
      {children}
    </PluginContext.Provider>
  )
}

export const usePluginContext = () => useContext(PluginContext)

export const getInstalledPlugins = (
  installedPluginIds: number[]
): PluginSummary[] => {
  return availablePlugins.filter(plugin =>
    installedPluginIds.includes(plugin.id)
  )
}
