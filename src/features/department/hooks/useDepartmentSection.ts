import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'

export type LoadState = 'loading' | 'success' | 'empty' | 'authentication' | 'forbidden' | 'not-found' | 'unsupported' | 'unavailable' | 'error'
export interface Section<T> { state: LoadState; data: T | null; message: string | null }

export function departmentError(error: unknown): { state: LoadState; message: string } {
  if (error instanceof HttpError) {
    if (error.status === 401) return { state: 'authentication', message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' }
    if (error.status === 403) return { state: 'forbidden', message: 'Bạn chưa có quyền xem hoặc xử lý dữ liệu trong phạm vi này.' }
    if (error.status === 404) return { state: 'not-found', message: 'Không tìm thấy dữ liệu yêu cầu. Hãy tải lại để kiểm tra.' }
    if ([405, 501].includes(error.status)) return { state: 'unsupported', message: 'Chức năng này hiện chưa được dịch vụ hỗ trợ.' }
    if (error.status === 409) return { state: 'error', message: 'Dữ liệu hoặc điều kiện xử lý đã thay đổi. Hãy kiểm tra thông tin mới trước khi quyết định lại.' }
    if (error.status >= 500) return { state: 'unavailable', message: 'Dịch vụ hiện tạm thời không khả dụng.' }
    return { state: 'error', message: error.problem?.detail || 'Dữ liệu chưa hợp lệ. Hãy kiểm tra và thử lại.' }
  }
  return { state: 'unavailable', message: 'Không thể kết nối dịch vụ. Hãy thử lại.' }
}

/** A retry or context change invalidates earlier reads, including rejected reads. */
export function useDepartmentSection<T>(read: () => Promise<T>, isEmpty: (data: T) => boolean) {
  const [resolved, setResolved] = useState<{ read: () => Promise<T>; section: Section<T> } | null>(null)
  const version = useRef(0)
  const resolveSection = useCallback(async (reader: () => Promise<T>): Promise<Section<T>> => {
    try {
      const data = await reader()
      return { state: isEmpty(data) ? 'empty' : 'success', data, message: null }
    } catch (error) {
      return { data: null, ...departmentError(error) }
    }
  }, [isEmpty])
  const refresh = useCallback(async () => {
    const current = ++version.current
    setResolved(null)
    const section = await resolveSection(read)
    if (current === version.current) setResolved({ read, section })
  }, [read, resolveSection])
  useEffect(() => {
    const requestVersion = version
    const current = ++requestVersion.current
    void resolveSection(read).then(section => {
      if (current === requestVersion.current) setResolved({ read, section })
    })
    return () => { requestVersion.current++ }
  }, [read, resolveSection])
  const active: Section<T> = resolved?.read === read ? resolved.section : { state: 'loading', data: null, message: null }
  return { ...active, refresh }
}
