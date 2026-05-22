# FriendsCount Monorepo

Estructura de monorepo para la aplicación FriendsCount - gestor de gastos compartidos con sistema de favores.

## Estructura del monorepo

```
friendsCount/
├── packages/
│   ├── mobile/                   # Cliente React Native + Expo
│   │   ├── app/                  # Rutas con Expo Router
│   │   ├── src/
│   │   │   ├── components/       # Componentes reutilizables
│   │   │   ├── stores/           # Estado global con Zustand
│   │   │   └── types/            # Tipos TypeScript
│   │   ├── assets/
│   │   ├── App.tsx
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── server/                  # (Próximamente)
│       ├── src/
│       ├── package.json
│       └── README.md
│
├── package.json                  # Root package (scripts comunes)
├── README.md                     # Este archivo
└── .gitignore
```

## Tecnologías por paquete

### `packages/mobile` - Frontend
- **React Native** + **Expo** (Android, iOS, Web)
- **Expo Router** para navegación file-based
- **Zustand** para estado global
- **TypeScript** para tipado estático
- Datos almacenados localmente (próximamente: GunDB P2P sync)

### `packages/server` - Servidor (por implementar)
- **Node.js** + **Fastify** para API REST
- **PostgreSQL** para base de datos
- **Prisma** como ORM
- **GunDB Relay** para sincronización P2P
- **Claude API** para procesamiento de favores con IA

## Scripts de desarrollo

```bash
# En la raíz
npm install                      # Instalar dependencias de todos los packages

# Desarrollar mobile
cd packages/mobile
npm start                        # Iniciar servidor Expo
npm run android                  # Compilar para Android
npm run ios                      # Compilar para iOS
npm run web                      # Compilar para Web
```

## Funcionalidades implementadas

✅ **Pantalla Principal**
- Lista de grupos con datos de ejemplo
- Botones para crear/unirse a grupos
- Navegación a detalles del grupo

✅ **Pantalla de Grupo (4 Tabs)**
1. **Gastos**: Lista de transacciones
2. **Saldos**: Balance de cada miembro + liquidación óptima
3. **Favores**: Lista de favores con respuestas de IA (mock)
4. **Clasificación**: Rankings ponderados con apodos

✅ **Store Global (Zustand)**
- Gestión de grupos y miembros
- Cálculo de balances
- Algoritmo greedy para liquidación óptima
- Gestión de rankings

## Datos de ejemplo

El app incluye 2 grupos pre-configurados:

### Grupo 1: "Viaje Roma"
- 3 miembros: Carlos, Marta, Luis
- Gastos de cena y taxi
- 1 favor registrado

### Grupo 2: "Piso compartido"
- 3 miembros: Carlos, Sofia, Pablo
- Gasto de alquiler
- Rankings iniciales

## Próximas fases

### Fase 1: Completar mobile
- [ ] Modales para agregar gastos y favores
- [ ] Integración con Claude API
- [ ] Persistencia con AsyncStorage
- [ ] Animaciones y UI improvements

### Fase 2: Backend
- [ ] API REST con Fastify
- [ ] Base de datos PostgreSQL
- [ ] Autenticación y autorización
- [ ] Relay de GunDB

### Fase 3: Sincronización
- [ ] Integración GunDB en mobile
- [ ] Sincronización P2P entre clientes
- [ ] Manejo de conflictos
- [ ] Offline-first architecture

### Fase 4: IA y features avanzadas
- [ ] Integración con Claude para procesar favores
- [ ] Generación de apodos personalizados
- [ ] Ajuste dinámico de ponderaciones
- [ ] Sorteo ponderado de asignaciones

## Convenciones del proyecto

- **Carpetas**: kebab-case (ej: `my-component`)
- **Archivos**: PascalCase para componentes, camelCase para utils (ej: `MyComponent.tsx`, `helper.ts`)
- **Tipos**: En `src/types/index.ts`
- **Imports**: Usar alias `@/src/` en lugar de rutas relativas

## Contacto y contribución

Este es un proyecto educativo/personal. Para consultas o sugerencias, contact al autor.
