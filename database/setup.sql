-- =====================================================================
-- Inicialización de la base de datos para FinanzasPro (expense-tracker)
-- Ejecutar una vez:  sudo mariadb < database/setup.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS gastos_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Usuario 'rich' con acceso desde cualquier host (%) y todos los permisos
-- ---------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'rich'@'%' IDENTIFIED BY '3009';
GRANT ALL PRIVILEGES ON *.* TO 'rich'@'%' WITH GRANT OPTION;

-- En instalaciones nuevas de MariaDB existe un usuario anónimo ''@'localhost'
-- que es más específico que 'rich'@'%' y bloquea el login desde localhost.
-- Lo eliminamos para que 'rich' pueda conectarse por TCP/socket.
DELETE FROM mysql.user WHERE User='';
DROP DATABASE IF EXISTS test;
FLUSH PRIVILEGES;

USE gastos_db;

-- ---------------------------------------------------------------------
-- Tabla de gastos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    descripcion     VARCHAR(255)    NOT NULL,
    monto           DECIMAL(12,2)   NOT NULL,
    categoria       VARCHAR(100)    NOT NULL,
    fecha           DATE            NOT NULL,
    fecha_registro  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB;

-- Sin datos de ejemplo: la app arranca en 0 (como nueva).
-- La tabla `gastos` queda vacía.
