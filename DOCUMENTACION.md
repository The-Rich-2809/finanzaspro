# 📚 Documentación — FinanzasPro

App full-stack de control de gastos personales. Un **único proyecto ASP.NET Core 8** sirve a la vez el **frontend** (HTML/CSS/JS) y la **API REST**, conectado a **MySQL/MariaDB** mediante Entity Framework Core (Pomelo).

- **Repo:** https://github.com/The-Rich-2809/finanzaspro
- **Stack:** C# · .NET 8 · EF Core (Pomelo MySQL) · Bootstrap 5 · JavaScript vanilla

---

## 📂 Estructura del proyecto

```
finanzaspro/
│
├── 🔵 BACKEND (API .NET)
│   ├── Program.cs                      # Arranque: configura EF, CORS, y SIRVE el front + la API
│   ├── ExpenseTracker.csproj           # Definición del proyecto y paquetes NuGet
│   ├── appsettings.json                # Cadena de conexión a la base de datos
│   ├── appsettings.Development.json    # Config para entorno de desarrollo
│   │
│   ├── Controllers/
│   │   └── GastosController.cs          # Endpoints REST  ->  /api/gastos
│   ├── Models/
│   │   └── Gasto.cs                     # Entidad = tabla `gastos` (mapeo a JSON del front)
│   ├── Dtos/
│   │   └── GastoCreateDto.cs            # Validación de datos al crear un gasto
│   └── Data/
│       └── AppDbContext.cs             # Contexto EF Core (puente entre C# y MySQL)
│
├── 🟢 FRONTEND (lo que ve el usuario)
│   └── wwwroot/                         # ⚠️ Carpeta especial: ASP.NET sirve esto como web estática
│       ├── index.html                  # La interfaz (dashboard, formulario, historial)
│       ├── app.js                      # Lógica: llama a la API con fetch('/api/gastos')
│       └── styles.css                  # Estilos (tema oscuro, glassmorphism)
│
├── 🗄️ BASE DE DATOS
│   └── database/
│       └── setup.sql                   # Crea usuario, BD `gastos_db` y tabla `gastos`
│
├── Properties/launchSettings.json      # Puerto local fijo (http://localhost:5080)
├── .gitignore                          # Ignora bin/ y obj/ (no se suben binarios)
├── README.md
└── DOCUMENTACION.md                    # (este archivo)
```

### Capas, de arriba a abajo
1. **`wwwroot/`** → el navegador descarga `index.html`, `app.js` y `styles.css`.
2. **`Controllers/`** → responde a las peticiones `fetch()` que hace `app.js`.
3. **`Data/AppDbContext.cs` + `Models/Gasto.cs`** → EF Core traduce esas peticiones a SQL.
4. **MySQL** → guarda/lee los datos en la tabla `gastos`.

---

## 🔗 Cómo se unieron el Frontend y el Backend (¡lo importante!)

La clave está en que **un solo programa hace las dos cosas**: sirve la página web *y* responde la API, en **el mismo puerto y el mismo origen**. Así no hay problemas de CORS y todo se ejecuta con un único `dotnet run`.

### 1. El frontend vive dentro de `wwwroot/`
`wwwroot` es una carpeta **mágica** de ASP.NET Core: todo lo que pongas ahí se publica como archivos estáticos accesibles desde el navegador.

### 2. `Program.cs` activa el servir de archivos estáticos
Las dos líneas que hacen la magia:

```csharp
// Sirve el SPA (wwwroot/index.html) en la raíz "/"
app.UseDefaultFiles();   // 1) si piden "/", busca y entrega index.html automáticamente
app.UseStaticFiles();    // 2) entrega app.js, styles.css y cualquier archivo de wwwroot

app.MapControllers();     // 3) las rutas /api/... las atienden los Controllers
```

- **`UseDefaultFiles()`** → cuando abres `http://localhost:5080/`, ASP.NET detecta que pediste la raíz y devuelve `index.html` sin que tengas que escribir `/index.html`. **Por eso al ejecutar la API se abre la vista HTML.**
- **`UseStaticFiles()`** → sirve el resto de archivos (`app.js`, `styles.css`).
- **`MapControllers()`** → todo lo que empiece por `/api/` lo manejan los controladores (la API REST).

### 3. El frontend llama a la API por ruta relativa
En `wwwroot/app.js`:

```js
const API_URL = '/api/gastos';   // misma URL base, mismo servidor
const response = await fetch(API_URL);
```

Como la web y la API están en **el mismo origen** (`http://localhost:5080`), el `fetch('/api/gastos')` apunta solito al backend. No se configura ninguna URL externa.

### En resumen — el flujo completo
```
Navegador  ──GET /──────────────►  ASP.NET  ──►  wwwroot/index.html  (se abre la vista)
Navegador  ──GET /app.js────────►  ASP.NET  ──►  wwwroot/app.js
app.js     ──fetch /api/gastos──►  ASP.NET  ──►  GastosController ──► EF Core ──► MySQL
                                                                              │
Navegador  ◄──── JSON con los gastos ◄────────────────────────────────────────┘
```

---

## ▶️ Cómo ejecutarlo en local

**Requisitos:** .NET 8 SDK y un servidor MySQL/MariaDB corriendo.

```bash
# 1. (Solo una vez) Crear la BD, el usuario y la tabla
sudo systemctl start mariadb
sudo mariadb < database/setup.sql

# 2. Ejecutar la app (compila y arranca)
dotnet run

# 3. Abrir en el navegador  ->  se mostrará la vista HTML directamente
#    http://localhost:5080
```

> El puerto se fija en `Properties/launchSettings.json` (`http://localhost:5080`).
> La cadena de conexión está en `appsettings.json`.

---

## 🌐 Endpoints de la API

| Método | Ruta                  | Descripción                                |
|--------|-----------------------|--------------------------------------------|
| GET    | `/api/gastos`         | Lista todos los gastos (fecha desc)        |
| GET    | `/api/gastos/resumen` | Total, cantidad y desglose por categoría   |
| GET    | `/api/gastos/{id}`    | Un gasto por id                            |
| POST   | `/api/gastos`         | Crea un gasto                              |
| DELETE | `/api/gastos/{id}`    | Elimina un gasto                           |

El JSON usa los nombres del front (`id, concept, amount, category, date`); internamente las
columnas de la tabla son `id, descripcion, monto, categoria, fecha`.

Ejemplo de creación:
```bash
curl -X POST http://localhost:5080/api/gastos \
  -H 'Content-Type: application/json' \
  -d '{"concept":"Café","amount":4.50,"category":"Comida","date":"2026-06-14"}'
```

---

## 🖥️ Despliegue en el servidor (como servicio systemd)

En el servidor (`192.168.100.69`) la app corre 24/7 como **servicio de systemd**, replicando el
mismo patrón que los otros proyectos. El archivo es `/etc/systemd/system/finanzaspro.service`:

```ini
[Unit]
Description=Servicio .NET FinanzasPro Web App
After=network.target

[Service]
WorkingDirectory=/home/rich/Proyectos/finanzaspro
ExecStart=/usr/bin/dotnet run --urls "http://0.0.0.0:5080"
Restart=always
RestartSec=10
User=rich
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

- `0.0.0.0:5080` → escucha en todas las interfaces (accesible desde la red local).
- `Restart=always` → si falla, systemd la reinicia sola.
- `enabled` → arranca automáticamente al encender el servidor.

Acceso en la red: **http://192.168.100.69:5080**

---

## 🛠️ Todos los comandos

### Git / GitHub
```bash
git add -A
git commit -m "describe tu cambio"
git push                                   # sube a github.com/The-Rich-2809/finanzaspro
git pull                                    # baja cambios (en el servidor)
```

### Ejecutar / compilar en local
```bash
dotnet run                                  # compila y arranca (http://localhost:5080)
dotnet build                                # solo compila
dotnet run --urls "http://0.0.0.0:5080"     # accesible desde otros equipos de la red
```

### Base de datos (MySQL/MariaDB)
```bash
sudo mariadb < database/setup.sql           # crear BD/usuario/tabla
mysql -h 127.0.0.1 -urich -p                # entrar a la consola SQL
# Dentro de MySQL:
#   SHOW DATABASES;
#   USE gastos_db;
#   SELECT * FROM gastos;
#   TRUNCATE TABLE gastos;                   -- vaciar todos los gastos
```

### Servicio en el servidor (systemd)
```bash
sudo systemctl status finanzaspro           # ver estado
sudo systemctl start finanzaspro            # iniciar
sudo systemctl stop finanzaspro             # detener
sudo systemctl restart finanzaspro          # reiniciar (tras git pull)
sudo systemctl enable finanzaspro           # activar arranque automático
sudo systemctl disable finanzaspro          # desactivar arranque automático
journalctl -u finanzaspro -f                # ver logs en vivo
journalctl -u finanzaspro -n 50             # últimas 50 líneas de log
```

### Actualizar la app en el servidor (flujo completo)
```bash
cd ~/Proyectos/finanzaspro
git pull
sudo systemctl restart finanzaspro
```

---

## 🧩 Resumen rápido

| Quieres...                         | Haz esto                                              |
|------------------------------------|-------------------------------------------------------|
| Ver la app en local                | `dotnet run` → http://localhost:5080                  |
| Ver la app en el servidor          | http://192.168.100.69:5080                            |
| Editar la interfaz                 | Edita los archivos en `wwwroot/`                      |
| Editar la lógica de la API         | Edita `Controllers/GastosController.cs`               |
| Cambiar la conexión a la BD        | Edita `appsettings.json`                              |
| Reiniciar en el servidor           | `sudo systemctl restart finanzaspro`                  |
| Ver errores en el servidor         | `journalctl -u finanzaspro -f`                        |
