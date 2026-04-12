import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import InicioSesionEsc from './paginas/login/LoginEsc'
import InicioSesionMov from './paginas/login/LoginMov'
import RegistroEsc from './paginas/register/Register'
import RegistroMov from './paginas/register/RegisterMov'
import Empleado from './paginas/empleado/Barras/Empleado.tsx'
import Inventario from './paginas/empleado/inventario/Inventario.tsx'
import Proveedores from './paginas/empleado/Proveedores/Proveedores.tsx'
import AgregarProveedores from './paginas/empleado/Proveedores/agregar_proveedores.tsx'
import ModificarProveedores from './paginas/empleado/Proveedores/Modificar_proveedores.tsx'
import VistaEmpleado from './paginas/empleado/VistaEmpleado'
import InicioEmpleado from './paginas/empleado/Inicio/Inicio'
import Reportes from './paginas/empleado/reportes/Reportes'
import InicioCliente from './paginas/cliente/inicio/InicioCliente'
import InicioClienteMov from './paginas/cliente/inicio/InicioClienteMov'
import CatalogoCliente from './paginas/cliente/catalogo/Catalogo'
import CatalogoMov from './paginas/cliente/catalogo/CatalogoMov'
import CarritoCliente from './paginas/cliente/carrito/Carrito'
import CarritoMov from './paginas/cliente/carrito/CarritoMov.tsx'
import Ventas_Esc from './paginas/empleado/Ventas/Ventas_Esc.tsx'
import Ventas_mov from './paginas/empleado/Ventas/Ventas_mov.tsx'

const puntoCorteMovil = 500

const obtenerEsMovil = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return window.innerWidth <= puntoCorteMovil
}

type UserType = 'guest' | 'cliente' | 'empleado'

function getStoredRoles(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem('paperworldRoles')
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function getUserType(): UserType {
  if (typeof window === 'undefined') {
    return 'guest'
  }

  const token = window.localStorage.getItem('paperworldToken')
  if (!token) {
    return 'guest'
  }

  const roles = getStoredRoles()
  const esEmpleado = roles.some((r) => r !== 'cliente')
  const esCliente = roles.includes('cliente')

  if (esEmpleado) {
    return 'empleado'
  }
  if (esCliente) {
    return 'cliente'
  }

  return 'guest'
}

function RequireUserType({ tipo }: { tipo: Exclude<UserType, 'guest'> }) {
  const userType = getUserType()

  if (userType === 'guest') {
    return <Navigate to="/login" replace />
  }

  if (userType !== tipo) {
    return <Navigate to={userType === 'cliente' ? '/cliente/inicio' : '/dashboard'} replace />
  }

  return <Outlet />
}

function Aplicacion() {
  const [esMovil, setEsMovil] = useState(obtenerEsMovil)

  useEffect(() => {
    const alRedimensionar = () => {
      setEsMovil(obtenerEsMovil())
    }

    window.addEventListener('resize', alRedimensionar)

    return () => {
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [])

  const elementoInicioSesion = esMovil ? <InicioSesionMov /> : <InicioSesionEsc />
  const elementoInicioCliente = esMovil ? <InicioClienteMov /> : <InicioCliente />
  const elementoCatalogoCliente = esMovil ? <CatalogoMov /> : <CatalogoCliente />
  const elementoRegistro = esMovil ? <RegistroMov /> : <RegistroEsc />
  const elementoCarritoCliente = esMovil ? <CarritoMov /> : <CarritoCliente />
  const elementoVentasEmpleado = esMovil ? <Ventas_mov /> : <Ventas_Esc />

  const destinoFallback = useMemo(() => {
    const tipo = getUserType()
    if (tipo === 'cliente') return '/cliente/inicio'
    if (tipo === 'empleado') return '/inventario'
    return '/login'
  }, [])

  return (
    <Routes>
      <Route path="/" element={elementoInicioSesion} />
      <Route path="/login" element={elementoInicioSesion} />

      <Route path="/registro" element={elementoRegistro} />
      <Route path="/register" element={elementoRegistro} />

      <Route element={<RequireUserType tipo="cliente" />}>
        <Route path="/cliente" element={<Navigate to="/cliente/inicio" replace />} />
        <Route path="/cliente/inicio" element={elementoInicioCliente} />
        <Route path="/InicioCliente" element={elementoInicioCliente} />
        <Route path="/inicioCliente" element={elementoInicioCliente} />
        <Route path="/cliente/catalogo" element={elementoCatalogoCliente} />
        <Route path="/cliente/carrito" element={elementoCarritoCliente} />
      </Route>

      <Route element={<RequireUserType tipo="empleado" />}>
        <Route element={<Empleado />}>
          <Route path="/dashboard" element={<InicioEmpleado />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/ventas" element={elementoVentasEmpleado} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/proveedores/agregar" element={<AgregarProveedores />} />
          <Route path="/proveedores/modificar" element={<ModificarProveedores />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/ayuda" element={<VistaEmpleado titulo="Ayuda" />} />
          <Route path="/ajustes" element={<VistaEmpleado titulo="Configuracion" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={destinoFallback} replace />} />
    </Routes>
  )
}

export default Aplicacion
