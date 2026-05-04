type PropiedadesVistaEmpleado = {
  titulo: string;
};

function VistaEmpleado({ titulo }: PropiedadesVistaEmpleado) {
  const tituloEnMayusculas = titulo.toUpperCase();

  return (
    <section className="inventarioVista">
      <header className="inventarioEncabezado">
        <h2 className="inventarioTitulo">{tituloEnMayusculas}</h2>
      </header>

      <section className="inventarioPanel">
        <h3 className="inventarioSubtitulo">Vista en construccion</h3>
      </section>
    </section>
  );
}

export default VistaEmpleado;