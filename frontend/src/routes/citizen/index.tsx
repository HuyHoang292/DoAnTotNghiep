import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/citizen/')({
  beforeLoad: () => {
    throw redirect({ to: '/citizen/dashboard' })
  },
})
