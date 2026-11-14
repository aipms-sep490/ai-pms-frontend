// Controlled browser entry only; never imported by the production application.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../src/index.css'
import { RoomPlannerPage } from '../src/features/defense/RoomPlannerPage'

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/academic/project-periods/5/room-planner']}>
    <Routes><Route path="/academic/project-periods/:periodId/room-planner" element={<RoomPlannerPage />} /></Routes>
  </MemoryRouter>,
)
