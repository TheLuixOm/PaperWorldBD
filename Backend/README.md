# PaperWorld Backend (Express + PostgreSQL)

## 1) Requisitos
- Node.js (LTS)
- PostgreSQL corriendo local o remoto

## 2) Configurar variables de entorno
1. Copia `Backend/.env.example` a `Backend/.env`
2. Ajusta `DATABASE_URL` y `JWT_SECRET`

Ejemplo:
```env
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/paperworld
JWT_SECRET=un-secreto-largo
```

## 3) Instalar y correr
```bash
cd Backend
npm install
npm run dev
```

## 4) Endpoints incluidos
- `GET /api/health` (prueba conexión a DB)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/productos?q=&categoria=&limit=&offset=`
- `GET /api/inventario?q=&categoria=&limit=&offset=`
- `GET /api/inventario/:idProducto`
- `POST /api/inventario` (crea producto)
- `PUT /api/inventario/:idProducto` (actualiza producto)

### Ejemplo (PowerShell) crear producto
```powershell
$body = @{
	nombre = "Cuaderno profesional"
	precio = 89.50
	cantidad = 25
	imagen = ""
	categoria = "papel"
	stock_minimo = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/inventario" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

### Ejemplo (PowerShell) actualizar producto
```powershell
$body = @{
	nombre = "Cuaderno profesional (actualizado)"
	precio = 95.00
	cantidad = 30
	imagen = ""
	categoria = "papel"
	stock_minimo = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/inventario/1" -Method Put -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

## 5) Notas sobre tu esquema
- Tu script SQL referencia una tabla `cliente`, pero en el fragmento pegado no aparece el `CREATE TABLE cliente ...`. Si no existe en tu BD, ese `ALTER TABLE cliente ...` va a fallar.
- La tabla `producto` usa una llave primaria compuesta `(id_producto, inventario_id_actualizacion)` y además tiene `cambios_inv_id_actualizacion` como FK a `cambios_inv`. En la práctica suele convenir que `inventario_id_actualizacion` y `cambios_inv_id_actualizacion` apunten al mismo `id_actualizacion` para mantener consistencia.

## Troubleshooting

### Error `ECONNREFUSED ::1:5432` o `127.0.0.1:5432`
Significa que **PostgreSQL no está escuchando en ese puerto** (casi siempre porque el servicio está detenido).

1) Verifica estado del servicio (PowerShell):
```powershell
Get-Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'Postgre' } | Format-Table -AutoSize Name, Status, DisplayName
```

2) Inicia/reinicia el servicio desde CMD **como Administrador** (ejemplo para PostgreSQL 18):
```cmd
net start postgresql-x64-18
:: o reiniciar
net stop postgresql-x64-18
net start postgresql-x64-18
```

3) Confirma que el puerto está abierto:
```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

4) Prueba el backend:
```powershell
Invoke-RestMethod http://localhost:3001/api/health | ConvertTo-Json -Depth 5
```
