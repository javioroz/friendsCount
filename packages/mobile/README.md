# FriendsCount Mobile App

App multiplataforma de gestión de gastos compartidos con sistema de favores ponderado por IA.

## Estructura del proyecto

```
packages/mobile/
├── app/                          # Rutas de Expo Router
│   ├── _layout.tsx               # Layout principal
│   ├── index.tsx                 # Pantalla: Lista de grupos
│   └── group/
│       ├── _layout.tsx           # Layout de grupo
│       └── [id].tsx              # Pantalla: Detalles del grupo (4 tabs)
│
├── src/
│   ├── components/               # Componentes reutilizables
│   │   ├── Link.tsx              # Link con navegación usando router
│   │   └── ThemedText.tsx        # Componente de texto estilizado
│   │
│   ├── stores/                   # Estado global (Zustand)
│   │   └── groupStore.ts         # Store para grupos, gastos, favores
│   │
│   ├── types/                    # Tipos TypeScript
│   │   └── index.ts              # Tipos: Group, Expense, Favor, etc.
│   │
│   └── screens/                  # (Futuro) Componentes de pantallas complejas
│
├── assets/                       # Imágenes, fuentes, etc.
├── App.tsx                       # Entrada principal de Expo Router
├── app.json                      # Configuración de Expo
├── package.json                  # Dependencias
└── tsconfig.json                 # Configuración TypeScript
```

## Stack de tecnologías

- **Framework**: React Native + Expo
- **Routing**: Expo Router (file-based)
- **Estado**: Zustand
- **Sincronización**: GunDB (P2P) - próximamente
- **Lenguaje**: TypeScript

## Instalación

```bash
cd packages/mobile
npm install
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Pantallas implementadas

### 1. **Pantalla Principal - Lista de Grupos**
- Muestra lista de grupos del usuario
- Botones para crear un nuevo grupo o unirse a uno
- Navega a los detalles del grupo al hacer tap

### 2. **Pantalla de Grupo - 4 Tabs**

#### Tab 1: Gastos
- Lista de gastos del grupo
- Botón FAB (+) para agregar nuevo gasto
- Muestra: descripción, cantidad, quién pagó, tiempo transcurrido

#### Tab 2: Saldos
- Balance actual de cada miembro (positivo/negativo)
- Liquidación óptima usando algoritmo greedy
- Muestra quién debe pagar a quién y cuánto

#### Tab 3: Favores
- Lista de favores realizados por miembros
- Respuesta de IA para cada favor
- Botón FAB (+) para agregar nuevo favor

#### Tab 4: Clasificación
- Rankings de miembros por ponderación
- Muestra apodo generado por IA
- Barra de progreso visual
- Botón para iniciar sorteo (raffle)

## Estado global (Zustand)

### GroupStore
```typescript
- groups: Group[]
- currentGroupId: string | null
- addGroup(group)
- addExpense(groupId, expense)
- addFavor(groupId, favor)
- calculateBalances(groupId)
- calculateSettlements(groupId)
- updateMemberRanking(groupId, ranking)
```

## Próximos pasos

1. **Integración de GunDB**: Sincronización P2P entre clientes
2. **API de Claude**: Llamadas para procesar favores y actualizar ponderaciones
3. **Modales para crear gastos y favores**: Formularios de entrada
4. **Persistencia local**: AsyncStorage para guardar datos offline
5. **Animaciones**: UI improvements con transiciones suaves
6. **Separación en componentes**: Extraer lógica de pantallas grandes
