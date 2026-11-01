/** Shared by tour scripts and the elements they highlight. */
export const TOUR_ANCHOR = {
  sidebar: 'sidebar',
  sidebarPrimary: 'sidebar-primary',
  quickNav: 'quick-nav',
  notifications: 'notifications',
  breadcrumb: 'breadcrumb',
  help: 'help',
  profile: 'profile',
} as const

export type TourAnchor = typeof TOUR_ANCHOR[keyof typeof TOUR_ANCHOR]
