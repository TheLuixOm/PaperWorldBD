import { forwardRef, memo } from 'react';
import { MessageCircle, Send, Share2, Users, X } from 'lucide-react';
import './FooterCliente.css';

type FooterClienteProps = {
  className?: string;
};

const FooterCliente = memo(
  forwardRef<HTMLElement, FooterClienteProps>(function FooterCliente({ className }, ref) {
    const year = new Date().getFullYear();
    const footerClassName = ['footerCliente', className].filter(Boolean).join(' ');

    return (
      <footer ref={ref} className={footerClassName} aria-label="Footer">
        <div className="footerClienteInner">
          <div className="footerClienteLeft" aria-label="Marca">
            <p className="footerClienteBrand">Paper world</p>
            <p className="footerClienteCopy" aria-label="Copyright">
              © {year}
            </p>
          </div>

          <p className="footerClienteMeta" aria-label="Soporte">
            Soporte: soporte@paperworld.com
          </p>

          <div className="footerClienteRight" aria-label="Redes sociales">
            <span className="footerClienteFollow">¡Síguenos!</span>
            <div className="footerClienteSocial" aria-label="Enlaces">
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">
                <X />
              </a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="Comunidad">
                <Users />
              </a>
              <a href="#" aria-label="Compartir">
                <Share2 />
              </a>
              <a href="#" aria-label="Mensajes">
                <MessageCircle />
              </a>
              <a href="#" aria-label="Enviar">
                <Send />
              </a>
            </div>
          </div>
        </div>
      </footer>
    );
  }),
);

export default FooterCliente;
