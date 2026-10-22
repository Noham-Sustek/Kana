import { Outlet } from 'react-router'
import { BottomTabBar } from '@/components/BottomTabBar'

export function AppLayout() {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
