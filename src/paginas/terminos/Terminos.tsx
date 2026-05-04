import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import './Terminos.css'

function Terminos() {
  const navigate = useNavigate()

  const fechaActualizacion = useMemo(() => {
    const fecha = new Date()
    return fecha.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }, [])

  return (
    <main className="terminos-page">
      <section className="terminos-card" aria-label="Términos y condiciones">
        <header className="terminos-header">
          <h1 className="terminos-title">Términos y condiciones</h1>
          <p className="terminos-subtitle">Última actualización: {fechaActualizacion}</p>
        </header>

        <div className="terminos-content">
          <h2>1. Aceptación</h2>
          <p>
            Al crear una cuenta y/o utilizar Paper world, aceptas estos términos y condiciones.
            Si no estás de acuerdo, no continúes con el registro.
          </p>

          <h2>2. Uso de la cuenta</h2>
          <ul>
            <li>Debes entregar información real y mantenerla actualizada.</li>
            <li>Eres responsable de la confidencialidad de tu contraseña.</li>
            <li>No debes usar la plataforma para actividades ilícitas o abusivas.</li>
          </ul>

          <h2>3. Privacidad y datos</h2>
          <p>
            Usamos tus datos para gestionar tu cuenta, compras y soporte. No compartiremos tu
            información con terceros salvo cuando sea necesario para operar el servicio o por obligación
            legal.
          </p>

          <h2>4. Compras y disponibilidad</h2>
          <p>
            Los precios, stock y promociones pueden cambiar. Intentamos mantener la información
            actualizada, pero puede existir variación o error.
          </p>

          <h2>5. Cambios</h2>
          <p>
            Podemos actualizar estos términos en cualquier momento. Si los cambios son importantes,
            lo indicaremos en esta página.
          </p>
        </div>

        <div className="terminos-actions">
          <button type="button" className="terminos-button" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </section>
    </main>
  )
}

export default Terminos
