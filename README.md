# FinanzasPro — Expense Tracker

App full-stack de control de gastos personales: **frontend SPA (HTML/CSS/JS vanilla)** servido por un **backend ASP.NET Core 8 Web API** con **MySQL/MariaDB** (vía Pomelo EF Core).

Todo está integrado en un solo proyecto: el backend sirve el frontend y la API en el **mismo origen**, así que solo necesitas ejecutar **un** comando.

## Estructura

```
expense-tracker/
├── database/setup.sql        # crea usuario 'rich', BD gastos_db y la tabla gastos (vacía)
├── ExpenseTracker.csproj     # proyecto .NET 8
├── Program.cs                # DI, EF, sirve el SPA + la API
├── appsettings.json          # cadena de conexión (tu DB local)
├── Models/Gasto.cs           # entidad / tabla gastos
├── Dtos/GastoCreateDto.cs    # DTO de creación
├── Data/AppDbContext.cs      # contexto EF Core
├── Controllers/GastosController.cs   # endpoints /api/gastos
├── Properties/launchSettings.json    # puerto fijo http://localhost:5080
└── wwwroot/                  # index.html, app.js, styles.css (frontend)
```

## Requisitos previos (una sola vez)

1. **Tu servidor MySQL/MariaDB local corriendo** en `127.0.0.1:3306`.
   ```bash
   sudo systemctl start mariadb     # o mysqld, según tu sistema
   ```
2. **Crear usuario, base de datos y tablas** ejecutando el script como root:
   ```bash
   sudo mariadb < database/setup.sql
   #   o:  mysql -u root -p < database/setup.sql
   ```
   Esto crea el usuario **`rich`** / contraseña **`3009`** (acceso desde `%`), la BD
   `gastos_db` y las tablas `gastos` y `presupuesto` con datos de ejemplo.

> Si prefieres otro usuario/clave o BD, edítalo en `database/setup.sql` **y** en la
> cadena de conexión de `appsettings.json`.

## Ejecutar (esto es lo único que haces cada vez)

```bash
cd expense-tracker
dotnet run
```

Luego abre 👉 **http://localhost:5080** (Swagger en `/swagger`).

## Endpoints

| Método | Ruta                   | Descripción                                  |
|--------|------------------------|----------------------------------------------|
| GET    | `/api/gastos`          | Todos los gastos (fecha desc)                |
| GET    | `/api/gastos/resumen`  | Total, cantidad y desglose por categoría     |
| GET    | `/api/gastos/{id}`     | Un gasto por id                              |
| POST   | `/api/gastos`          | Crear gasto (`concept`,`amount`,`category`,`date`) |
| DELETE | `/api/gastos/{id}`     | Eliminar gasto                               |

El JSON usa los nombres que espera el frontend (`id, concept, amount, category, date`);
internamente las columnas son `id, descripcion, monto, categoria, fecha`.
