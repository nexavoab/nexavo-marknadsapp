import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-8xl font-bold text-primary/20">404</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Sidan hittades inte
        </h1>
        <p className="text-muted-foreground mb-8">
          Sidan du letar efter finns inte eller har flyttats. Kontrollera adressen eller gå tillbaka till startsidan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Gå tillbaka
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Till startsidan
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
