import { GraduationCap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-lg font-bold text-card-foreground">
                NATO <span className="text-primary">University</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              La plataforma de aprendizaje para equipos de marketing digital.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-card-foreground mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Learning Paths</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Recursos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Certificaciones</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Comunidad</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-card-foreground mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre NATO</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-card-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Términos</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} NATO University. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
