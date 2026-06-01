# FriendsCount

Aplicación de gestión de gastos compartidos con favores puntuados por IA. Similar a Tricount/Splitwise con un sistema de clasificación y sorteo ponderado para el grupo.

Es una aplicación multiplataforma (Android, iOS, Web) para gestionar gastos compartidos entre amigos, que también incluye funcionalidad para registrar favores hechos por cada miembro del grupo y realizar una clasificación de amistad basada en ellos.


## 🛠 Stack Tecnológico

| Capa          | Tecnología                                      |
|---------------|-------------------------------------------------|
| App           | React Native + Expo (Android · iOS · Web)       |
| Routing       | Expo Router (file-based)                        |
| Estado        | Zustand + AsyncStorage                          |
| Sync P2P      | GunDB (WebSocket relay propio)                  |
| Backend       | Express + GunDB Relay                           |
| IA            | Claude (Anthropic) — una conversación por grupo |

## 📁 Estructura del Monorepo

```
friendsCount/
├── packages/
│   ├── mobile/          # React Native + Expo + lógica y stores
│   │   ├── app/         # Pantallas (Expo Router)
│   │   ├── src/
│   │   │   ├── stores/      # Zustand stores
│   │   │   ├── services/    # GunDB y sincronización
│   │   │   ├── types/       # Tipos TypeScript
│   │   │   ├── components/  # Componentes reutilizables
│   │   │   └── contexts/    # Contextos React (Theme)
│   │   └── assets/      # Recursos (imágenes, iconos)
│   └── server/          # GunDB relay server
│       └── src/         # Servidor Express + GunDB
├── .gitignore
├── README.md
└── package.json         # Root workspace (npm workspaces)
```

## 🖥️ Pantallas de la Interfaz

### 1. Pantalla Principal - Lista de Grupos
- Muestra lista de grupos del usuario
- Botones para crear un nuevo grupo o unirse a uno existente
- Navega a los detalles del grupo al hacer tap

### 2. Pantalla de Grupo - 4 Pestañas

#### Pestaña 1: Gastos
- Lista de gastos del grupo
- Botón FAB (+) para agregar nuevo gasto
- Muestra: descripción, cantidad, quién pagó, tiempo transcurrido

#### Pestaña 2: Saldos
- Balance actual de cada miembro (positivo/negativo)
- Liquidación óptima usando algoritmo greedy
- Muestra quién debe pagar a quién y cuánto

#### Pestaña 3: Favores
- Lista de favores realizados por miembros
- Puntuación manual de cada favor
- Botón FAB (+) para agregar nuevo favor

#### Pestaña 4: Clasificación
- Rankings de miembros por puntuación
- Apodos generados automáticamente según posición
- Barra de progreso visual
- Botón para iniciar sorteo (raffle)

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTES                             │
│   React Native + Expo · Android · iOS · Web                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  ESTADO LOCAL (Zustand)              │    │
│  │  groups[] · expenses[] · balances · favors[] · ...  │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │ sync                                │
└─────────────────────────┼────────────────────────────────────┘
                          │                                    
┌─────────────────────────┴────────────────────────────────────┐
│                         SERVIDOR                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   GunDB Relay                        │    │
│  │                   (WebSocket)                        │    │
│  │                                                      │    │
│  │  Replica en tiempo real entre clientes miembros:    │    │
│  │  · expenses           · rankings                     │    │
│  │  · favors             · members                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm 9+
- Expo CLI (opcional, para desarrollo móvil)

### 1. Instalar dependencias

```bash
# Desde la raíz del proyecto
npm install
```

Esto instalará las dependencias de todos los workspaces (mobile y server).

### 2. Iniciar el servidor GunDB Relay

```bash
# Terminal 1
npm run dev:server
```

El servidor arranca en `http://localhost:3001` con el relay GunDB en `ws://localhost:3001/gun`

### 3. Iniciar la aplicación móvil

```bash
# Terminal 2
npm run dev:mobile
```

Abre en:
- **Android**: Escanea el QR con Expo Go
- **iOS**: Escanea el QR con la cámara
- **Web**: `http://localhost:8081`

### 4. Configurar variables de entorno

Copia el archivo `.env` de ejemplo en `packages/mobile/`:

```bash
cp packages/mobile/.env packages/mobile/.env.local
```

Edita `packages/mobile/.env.local`:
```env
EXPO_PUBLIC_GUN_RELAY=ws://localhost:3001/gun
```

## 📦 Comandos npm

Desde la raíz del proyecto:

```bash
# Instalar todas las dependencias
npm install

# Desarrollo
npm run dev:mobile    # Iniciar app móvil (Expo)
npm run dev:server    # Iniciar servidor GunDB relay

# Build
npm run build:mobile  # Build app móvil
npm run build:server  # Build servidor

# Limpieza
npm run clean         # Eliminar node_modules y builds
```

## 🧹 Limpieza del Proyecto

Para eliminar todas las carpetas `node_modules` y archivos de build:

```bash
# Eliminar node_modules en todos los workspaces
rm -rf node_modules packages/*/node_modules

# Eliminar builds
rm -rf packages/server/dist
rm -rf packages/mobile/web-build
rm -rf packages/mobile/.expo

# Reinstalar dependencias
npm install
```

## 🔧 Desarrollo

### Estructura de workspaces

El proyecto usa npm workspaces. Cada paquete tiene su propio `package.json`:

- `packages/mobile/package.json` - Dependencias de la app móvil
- `packages/server/package.json` - Dependencias del servidor

El `package.json` raíz define los workspaces y comandos globales.

### Añadir nuevas dependencias

```bash
# Para mobile
npm install <paquete> --workspace=packages/mobile

# Para server
npm install <paquete> --workspace=packages/server

# Para todos
npm install <paquete> --workspace=packages/mobile --workspace=packages/server
```

## 📱 Uso de la Aplicación

### Crear un Grupo
1. Abre la app y toca el botón "+"
2. Elige "Crear nuevo grupo"
3. Introduce nombre, icono y divisa
4. Comparte el código del grupo con tus amigos

### Unirse a un Grupo
1. Abre la app y toca el botón "+"
2. Elige "Unirse a un grupo"
3. Introduce el código del grupo
4. ¡Listo! Los datos se sincronizarán automáticamente

### Registrar un Gasto
1. Entra en un grupo
2. Ve a la pestaña "Gastos"
3. Toca el botón "+"
4. Completa: descripción, cantidad, quién pagó y entre quiénes se divide
5. Los balances se actualizan automáticamente

### Registrar un Favor
1. Entra en un grupo
2. Ve a la pestaña "Favores"
3. Toca el botón "+"
4. Completa: descripción, quién hizo el favor y para quién
5. Asigna puntos (positivos o negativos)
6. La clasificación se actualiza automáticamente

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## ✨ Funcionalidades Implementadas

### ✅ Completadas
- **Gestión de Grupos**: Crear, editar y unirse a grupos
- **Gastos Compartidos**: 
  - Añadir, editar y eliminar gastos con cálculo automático de balances
  - **Categorización con emojis** (🍺 Bares, 🍔 Restaurantes, 🛒 Supermercado, 🏠 Vivienda, 🚗 Transporte, 🎬 Ocio, 🩹 Salud, 🧼 Limpieza, 👕 Ropa, 📚 Educación, 💵 Pagos, 💰 Otros)
  - Visualización de categoría en lista de gastos
- **Saldos y Liquidación**: 
  - Visualización de balances individuales
  - Liquidación óptima con algoritmo greedy
  - Creación automática de gastos de liquidación con categoría 💵 "Pagos"
  - **Filtrado de gastos por miembro**: Al hacer clic en un miembro, se muestra su lista de gastos
- **Favores con IA**: 
  - Registro de favores con puntuación manual o automática por IA
  - **Integración con LLMs** (OpenAI-compatible) para evaluación automática
  - Configuración de API Key, modelo y endpoint personalizado por grupo
  - Respuesta de IA con puntuación, mensaje personalizado y apodo
- **Clasificación**: 
  - Ranking de miembros por puntuación con apodos automáticos
  - **Filtrado de favores por miembro**: Al hacer clic en un miembro, se muestra su lista de favores
  - Visualización de detalles de IA cuando corresponde
- **Sorteo** ponderado para asignar tareas
- **Sincronización P2P**: GunDB para sincronización en tiempo real entre clientes
- **Tema Claro/Oscuro**: Soporte completo para modo oscuro
- **Icono de la App**: friendsCount_logo_light.png como icono principal en todas las plataformas

### 🚧 En Desarrollo
- API REST con Fastify
- Persistencia en PostgreSQL

**Nota**: Este proyecto está en desarrollo activo. Algunas funcionalidades pueden estar incompletas o cambiar en el futuro.

---

## 📄 Licencia

GNU GPL v3.0 