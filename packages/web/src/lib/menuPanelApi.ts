import { request } from './api'
import type {
  CreatePanelRequest,
  CreatePanelResponse,
  GetMenuResponse,
  GetPanelListResponse,
  GetPanelResponse,
  Menu,
  Panel,
  PanelScope,
  UpdateMenuResponse,
  UpdatePanelResponse,
  UpdatePanelTargetRequest,
} from './menuPanelTypes'

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  return search.toString()
}

export const fetchMenu = (appId: string) =>
  request<GetMenuResponse>(`/menu?${query({ appId })}`, { cache: 'no-store' })

export const saveMenu = (appId: string, menu?: Menu) =>
  request<UpdateMenuResponse>('/menu', {
    method: 'PUT',
    body: JSON.stringify({ appId, menu }),
  })

export const fetchPanels = (appId: string, scope: PanelScope) =>
  request<GetPanelListResponse>(`/panels?${query({ appId, scope, limit: 50 })}`, {
    cache: 'no-store',
  })

export const createPanel = (appId: string, body: CreatePanelRequest) =>
  request<CreatePanelResponse>('/panels', {
    method: 'POST',
    body: JSON.stringify({ appId, ...body }),
  })

export const fetchPanel = (appId: string, panelId: string) =>
  request<GetPanelResponse>(`/panels/${encodeURIComponent(panelId)}?${query({ appId })}`, {
    cache: 'no-store',
  })

export const updatePanel = (appId: string, panelId: string, panel: Panel) =>
  request<UpdatePanelResponse>(`/panels/${encodeURIComponent(panelId)}`, {
    method: 'PUT',
    body: JSON.stringify({ appId, panel }),
  })

export const deletePanel = (appId: string, panelId: string) =>
  request<Record<string, never>>(`/panels/${encodeURIComponent(panelId)}?${query({ appId })}`, {
    method: 'DELETE',
  })

export const updatePanelTarget = (
  appId: string,
  panelId: string,
  body: UpdatePanelTargetRequest
) =>
  request<Record<string, never>>(
    `/panels/${encodeURIComponent(panelId)}/target`,
    {
      method: 'PUT',
      body: JSON.stringify({ appId, ...body }),
    }
  )
