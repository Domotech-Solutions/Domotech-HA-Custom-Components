# Domotech HA Custom Components

Componentes personalizados de Lovelace para Home Assistant, creados por [Domotech Solutions](https://github.com/Domotech-Solutions) y distribuidos vía HACS.

| Componente | Descripción |
| --- | --- |
| [`plano-domotech-card`](#plano-domotech-card) | Plano de planta con zonas clicables invisibles y botones, que escala bien en cualquier pantalla |

## Instalación con HACS

1. En Home Assistant abre **HACS → ⋮ (arriba a la derecha) → Repositorios personalizados**.
2. Pega `https://github.com/Domotech-Solutions/Domotech-HA-Custom-Components`, elige el tipo **Dashboard** y pulsa **Añadir**.
3. Busca **Domotech HA Custom Components** en HACS y pulsa **Descargar**.
4. Recarga el navegador con la caché limpia (Ctrl+Shift+R / Cmd+Shift+R). HACS registra el recurso automáticamente.

Si el recurso no apareciera, añádelo a mano en **Ajustes → Paneles de control → ⋮ → Recursos**:

- URL: `/hacsfiles/Domotech-HA-Custom-Components/domotech-ha-custom-components.js`
- Tipo: **Módulo JavaScript**

Para actualizar, HACS avisa cuando hay una versión nueva (se publican como *releases* de GitHub).

## plano-domotech-card

Pinta una imagen (un plano, por ejemplo) y superpone:

- **Zonas** (`elements`): rectángulos invisibles pero clicables. Pulsarlos abre un popup, navega, activa una entidad, etc.
- **Botones** (`buttons`): botones visibles dibujados encima del plano, con texto.

Imagen, zonas y botones están dentro de un único SVG con `viewBox`, así que comparten sistema de coordenadas. Una zona en `x: 950, y: 380` cae siempre en el mismo punto de la imagen, tanto en el editor como en el móvil o en un panel, sin los desajustes que dan las posiciones en `top/left %`.

### Ejemplo

```yaml
type: custom:plano-domotech-card
image: /local/plano.png
view_box: "0 0 1282 816"   # ancho y alto REALES de la imagen en píxeles
elements:
  - name: Sala de reuniones
    x: 856
    "y": 5
    w: 150
    h: 220
    entity: light.sala_reuniones
    tap_action:
      action: navigate
      navigation_path: "#reuniones-popup"
buttons:
  - name: Editor de ficheros
    x: 1050
    "y": 760
    w: 180
    h: 45
    tap_action:
      action: navigate
      navigation_path: /app/core_configurator
  - name: Panel externo
    x: 850
    "y": 760
    w: 180
    h: 45
    background: "rgba(0,90,150,0.8)"
    tap_action:
      action: url
      url_path: "http://192.168.1.10"
```

> En YAML conviene escribir `"y"` entre comillas, porque algunos editores interpretan `y` sin comillas como el valor booleano *sí*.

### Opciones de la tarjeta

| Opción | Obligatoria | Descripción |
| --- | --- | --- |
| `image` | sí | Ruta de la imagen: `/local/plano.png`, `/api/image/serve/<id>/original`, etc. |
| `view_box` | sí | `"0 0 ancho alto"` con las dimensiones reales de la imagen en píxeles. |
| `elements` | sí | Lista de zonas clicables invisibles. |
| `buttons` | no | Lista de botones visibles. |
| `debug` | no | `true` muestra las zonas en rojo (ámbar si su entidad está encendida) para calibrarlas. Quítalo en producción. |

### Opciones de `elements`

| Opción | Descripción |
| --- | --- |
| `name` | Texto que aparece al pasar el ratón. |
| `x`, `y`, `w`, `h` | Posición y tamaño en píxeles del `view_box`. |
| `entity` | Entidad asociada (se usa para el color en modo `debug` y para las acciones `toggle` y `more-info`). |
| `tap_action` | Acción al pulsar (ver más abajo). |

### Opciones de `buttons`

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `name` | | Texto del botón. |
| `x`, `y`, `w`, `h` | | Posición y tamaño en píxeles del `view_box`. |
| `background` | `rgba(20,20,20,0.8)` | Color de fondo. |
| `color` | `#ffffff` | Color del texto. |
| `font_size` | `22` | Tamaño del texto, en unidades del `view_box`. |
| `radius` | `10` | Radio de las esquinas. |
| `entity` | | Entidad para las acciones `toggle` y `more-info`. |
| `tap_action` | | Acción al pulsar. |

Los botones se dibujan en SVG puro, sin `foreignObject`, porque `foreignObject` falla en Safari y en la app de Home Assistant para iOS. Por eso, de momento, son solo texto, sin icono.

### Acciones (`tap_action`)

| `action` | Campos | Qué hace |
| --- | --- | --- |
| `navigate` | `navigation_path` | Navega a una ruta de HA o abre un popup (`"#mi-popup"`). |
| `url` | `url_path`, `new_tab` (por defecto `true`) | Abre un enlace externo. |
| `call-service` / `perform-action` | `service` (`dominio.servicio`), `service_data`, `target` | Llama a un servicio de HA. |
| `toggle` | | Alterna la `entity` del elemento. |
| `more-info` | | Abre el diálogo de la `entity`. |

### Cómo sacar las coordenadas

Abre la imagen en un editor (Vista Previa, GIMP…) a tamaño 1:1 y lee los píxeles de las esquinas de cada zona. Activa `debug: true` mientras ajustas y quítalo al terminar.

## Añadir más componentes

HACS carga un único fichero JS por repositorio, así que el flujo es:

1. Crea el componente en `src/<nombre>.js`.
2. Ejecuta `node scripts/build.js` para regenerar `dist/domotech-ha-custom-components.js`.
3. Haz commit de `src/` y de `dist/`, y publica una release en GitHub para que HACS avise de la actualización.

## Licencia

[MIT](LICENSE) © Domotech Solutions S.L.
