import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold text-foreground">
            NATO <span className="text-primary">University</span>
          </span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#paths" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Learning Paths
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Características
          </a>
          <a href="#resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Recursos
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Precios
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Iniciar Sesión</Button>
          <Button variant="hero" size="sm">Comenzar Gratis</Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass-dark border-t border-border/30 px-4 py-4 space-y-3">
          <a href="#paths" className="block text-sm text-muted-foreground hover:text-foreground">Learning Paths</a>
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">Características</a>
          <a href="#resources" className="block text-sm text-muted-foreground hover:text-foreground">Recursos</a>
          <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">Precios</a>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" className="flex-1">Iniciar Sesión</Button>
            <Button variant="hero" size="sm" className="flex-1">Comenzar Gratis</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
