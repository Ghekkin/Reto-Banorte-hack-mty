# Financial UI Motion & Interaction Skill

## Propósito

Diseñar e implementar animaciones modernas, fluidas e interactivas para interfaces web de servicios financieros.

Las animaciones deben hacer que la interfaz se sienta dinámica y viva, especialmente en componentes que:
- Se actualizan en tiempo real.
- Responden a interacciones del usuario.
- Muestran cambios de valores financieros.
- Presentan datos o gráficas.
- Ejecutan procesos.
- Están esperando información.
- Cambian entre diferentes estados.

El objetivo NO es agregar animaciones innecesarias. Cada animación debe tener una función visual o funcional.

---

## Principios generales

### 1. La animación debe comunicar algo

Priorizar animaciones que comuniquen:

- Cambio de valor.
- Actualización de datos.
- Carga.
- Progreso.
- Confirmación.
- Error.
- Éxito.
- Transición de estado.
- Interacción del usuario.
- Aparición o desaparición de información.

Evitar animaciones puramente decorativas cuando no aporten contexto.

### 2. Priorizar fluidez

Las animaciones deben sentirse:

- suaves
- rápidas
- naturales
- consistentes
- responsivas

Evitar:
- movimientos bruscos
- rebotes excesivos
- animaciones demasiado largas
- efectos visuales constantes
- parpadeos
- transformaciones exageradas

### 3. Mantener una sensación financiera profesional

La interfaz debe transmitir:

- confianza
- estabilidad
- precisión
- seguridad
- modernidad

La animación puede ser llamativa, pero nunca debe hacer que la aplicación parezca un videojuego.

---

# Sistema de timing

Utilizar duraciones coherentes.

### Microinteracciones

120–200 ms

Utilizar para:

- hover
- focus
- botones
- cambios pequeños
- iconos

### Transiciones normales

200–350 ms

Utilizar para:

- cards
- paneles
- tabs
- cambios de contenido
- expansión de componentes

### Animaciones de datos

400–800 ms

Utilizar para:

- cambios de saldo
- actualización de porcentajes
- gráficas
- progreso
- valores financieros

### Animaciones complejas

800–1200 ms

Utilizar únicamente cuando exista una razón clara.

Evitar superar 1200 ms en interacciones normales.

---

# Easing

Preferir curvas suaves.

Usar principalmente:

- ease-out para elementos que aparecen
- ease-in-out para transformaciones
- spring suave para elementos interactivos

Evitar:
- bounce excesivo
- elastic exagerado
- movimientos artificiales

---

# Animaciones para valores financieros

Los valores monetarios que cambian deben poder animarse.

Ejemplo:

$10,500 → $12,850

En lugar de cambiar instantáneamente:

1. Detectar el nuevo valor.
2. Animar progresivamente el número.
3. Mantener el layout estable.
4. Terminar exactamente en el valor final.

Utilizar animación numérica cuando el cambio sea relevante.

Ejemplo:

$10,500
↓
$10,850
↓
$11,420
↓
$12,100
↓
$12,850

La animación debe durar aproximadamente 400–700 ms.

---

# Actualizaciones LIVE

Para componentes que reciben datos LIVE:

No utilizar una animación completa cada vez que llega un dato.

Preferir:

- pequeño highlight
- transición del valor
- indicador de actualización
- pulse sutil
- timestamp actualizado
- movimiento localizado

Ejemplo:

Valor anterior:

$184,250

Nuevo valor:

$185,420

Animar únicamente el valor y utilizar un highlight breve.

Evitar hacer que toda la card se mueva.

---

# Animación de gráficas

Las gráficas deben aparecer progresivamente.

Para line charts:

- animar el trazado de izquierda a derecha
- revelar los puntos progresivamente
- evitar redibujar toda la gráfica innecesariamente

Para bar charts:

- animar las barras desde 0 hasta su valor
- utilizar stagger muy pequeño entre barras

Para pie/donut charts:

- animar progresivamente los segmentos
- evitar rotaciones exageradas

Para gráficas financieras:

La animación debe ayudar a comprender la evolución de los datos.

---

# Investment Performance

Para componentes de rendimiento de inversiones:

Cuando cambien los datos:

- actualizar suavemente el valor
- animar el porcentaje
- actualizar la gráfica
- mostrar un pequeño indicador de cambio

Ejemplo:

+7.24%

Puede realizar una transición:

+7.18%
→
+7.21%
→
+7.24%

Evitar hacer zoom o movimiento de toda la tarjeta.

---

# Investment Projection

Las proyecciones deben utilizar animaciones que comuniquen crecimiento.

Al modificar:

- inversión inicial
- aportación mensual
- tasa
- horizonte

la gráfica debe actualizarse suavemente.

No eliminar instantáneamente la gráfica anterior.

Preferir:

datos anteriores
↓
transición
↓
nueva proyección

---

# Credit Simulator

En simuladores de crédito:

Cuando el usuario modifica:

- monto
- plazo
- tasa

animar:

- pago mensual
- total a pagar
- intereses
- gráfica de amortización

Ejemplo:

$5,420 / mes

→

$5,680 / mes

El valor debe cambiar mediante una transición numérica.

---

# Credit Progress

Para créditos:

Utilizar barras de progreso animadas para representar:

- porcentaje pagado
- saldo restante
- capital
- intereses

Cuando cambia el progreso:

Animar:

40%
→
43%

No cambiar instantáneamente.

---

# Loading States

Todos los componentes que dependen de información remota deben tener estados de carga.

Preferir skeleton loaders antes que spinners genéricos.

Ejemplo:

┌──────────────────────────┐
│ █████████████            │
│                          │
│ ████████████             │
│                          │
│ ████████                 │
└──────────────────────────┘

El skeleton puede utilizar un shimmer muy sutil.

Evitar shimmer demasiado brillante o rápido.

---

# Loading de gráficas

Mientras una gráfica está cargando:

Mostrar una representación estructural aproximada.

Ejemplo:

- ejes
- skeleton de barras
- skeleton de línea
- labels placeholders

Cuando llegan los datos:

Skeleton
↓
Datos
↓
Animación de entrada

No hacer que la gráfica aparezca repentinamente.

---

# Estados de componentes

Los componentes deben considerar como mínimo:

- idle
- loading
- success
- updating
- error
- empty
- disabled

Cada estado debe tener una respuesta visual adecuada.

---

# Success animations

Cuando una operación financiera termina correctamente:

Utilizar una animación corta y clara.

Ejemplo:

Transferencia completada

✓

El check puede:

1. aparecer
2. dibujarse progresivamente
3. hacer un pequeño scale
4. regresar a su tamaño normal

Evitar confetti excesivo en operaciones bancarias.

---

# Error animations

Los errores deben utilizar movimiento pequeño.

Ejemplo:

Un formulario incorrecto puede hacer un:

subtle horizontal shake

No utilizar movimientos exagerados.

El error debe acompañarse de:

- mensaje
- estado visual
- indicación de cómo corregirlo

---

# Hover

Los elementos interactivos pueden utilizar:

- translateY pequeño
- scale muy pequeño
- cambio de sombra
- cambio de background
- cambio de border

Ejemplo:

scale: 1 → 1.02

Evitar escalas grandes.

---

# Click / Press

Los botones pueden responder al click con:

scale:

1 → 0.97 → 1

Debe ser rápido.

La interacción debe sentirse física pero profesional.

---

# Cards interactivas

Para cards financieras:

Hover:

- elevación pequeña
- sombra ligeramente mayor
- border highlight

Click:

- pequeño press
- transición hacia el contenido

No hacer que las cards salten o roten.

---

# Expand / Collapse

Para información adicional:

Utilizar:

- height
- opacity
- transform

La expansión debe sentirse continua.

No utilizar display:none durante la transición.

---

# Tabs

Al cambiar entre:

- Rendimiento
- Distribución
- Proyección

utilizar:

- sliding indicator
- fade
- pequeño translate

El contenido anterior debe desaparecer suavemente y el nuevo aparecer.

---

# Real-time indicators

Para información LIVE:

Utilizar indicadores pequeños.

Ejemplos:

● Live

Actualizado hace 2s

↻ Actualizando

El indicador LIVE puede tener un pulse extremadamente sutil.

No utilizar animaciones permanentes agresivas.

---

# Motion hierarchy

Las animaciones deben tener jerarquía.

Nivel 1:
Microinteracciones.

Nivel 2:
Cambios de componentes.

Nivel 3:
Cambios importantes de información.

Nivel 4:
Transiciones de pantalla.

No animar todos los niveles al mismo tiempo.

---

# Performance

Priorizar animaciones usando:

- transform
- opacity

Evitar animar continuamente:

- width
- height
- top
- left
- propiedades que provoquen layout innecesario

Las animaciones deben mantener una experiencia fluida.

Evitar animaciones que provoquen:

- layout thrashing
- re-render innecesario
- consumo excesivo de CPU
- problemas en dispositivos móviles

---

# React

Cuando el proyecto utilice React:

Preferir componentes reutilizables.

Ejemplo conceptual:

AnimatedNumber
AnimatedChart
LoadingSkeleton
LiveIndicator
AnimatedProgress
SuccessAnimation
ErrorAnimation

Las animaciones deben poder reutilizarse entre diferentes componentes financieros.

---

# Framer Motion

Si el proyecto utiliza Framer Motion:

Preferir:

- motion
- AnimatePresence
- layout
- variants
- spring

Crear variantes reutilizables.

Ejemplo conceptual:

fadeIn
slideUp
scaleIn
softSpring
numberTransition

No crear animaciones independientes innecesariamente.

---

# GSAP

Si el proyecto utiliza GSAP:

Utilizarlo principalmente para:

- animaciones complejas
- gráficas
- secuencias
- timelines
- visualizaciones avanzadas

No utilizar GSAP cuando una transición simple de CSS o Framer Motion sea suficiente.

---

# Accessibility

Respetar:

prefers-reduced-motion

Cuando el usuario tenga activada la reducción de movimiento:

- reducir duración
- eliminar transformaciones innecesarias
- evitar parallax
- evitar animaciones continuas

La interfaz debe seguir siendo completamente funcional.

---

# Reglas para IA

Antes de implementar una animación:

1. Identificar qué evento provoca la animación.
2. Identificar qué información está cambiando.
3. Determinar qué elemento necesita movimiento.
4. Elegir la animación mínima necesaria para comunicar el cambio.
5. Elegir duración y easing apropiados.
6. Considerar loading, error y success.
7. Verificar que la animación no interfiera con la lectura de información financiera.
8. Verificar performance.
9. Verificar accesibilidad.
10. Mantener consistencia con las demás animaciones del sistema.

Nunca agregar animaciones únicamente porque "se ven bonitas".

Cada animación debe responder a una de estas preguntas:

- ¿Qué cambió?
- ¿Qué está cargando?
- ¿Qué acaba de ocurrir?
- ¿Qué puede hacer el usuario?
- ¿Qué está actualizado?
- ¿Qué resultado produjo su interacción?

---

# Objetivo visual

La experiencia final debe sentirse:

- moderna
- premium
- fluida
- tecnológica
- confiable
- interactiva
- responsiva

La animación debe sentirse como parte natural de la interfaz, no como un efecto añadido posteriormente.