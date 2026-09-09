import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-space-md bg-surface p-space-lg text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name="search_off" className="text-[32px]" />
      </span>
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Page not found</h1>
      <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="rounded-lg bg-primary px-space-md py-space-xs font-label-md text-label-md text-on-primary hover:bg-slate-navy-deep">
        Back to dashboard
      </Link>
    </main>
  )
}
