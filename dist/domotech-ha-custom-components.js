/* ===== plano-domotech-card.js ===== */
(() => {
/*
 * Plano Domotech Card
 * Tarjeta de Home Assistant para planos de planta con zonas clicables y botones.
 *
 * Todo (imagen, zonas y botones) vive dentro de un único SVG con `viewBox`,
 * así que las posiciones escalan siempre en proporción con la imagen,
 * sea cual sea el tamaño del contenedor o el aspect ratio de la tarjeta.
 */

const PLANO_DOMOTECH_VERSION = '1.0.0';

const planoEscapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

class PlanoDomotechCard extends HTMLElement {
  static getStubConfig() {
    return {
      image: '/local/plano.png',
      view_box: '0 0 1000 600',
      elements: [
        {
          name: 'Zona 1',
          x: 100,
          y: 100,
          w: 200,
          h: 150,
          tap_action: { action: 'navigate', navigation_path: '#zona-1-popup' },
        },
      ],
    };
  }

  setConfig(config) {
    if (!config || !config.image || !config.view_box || !Array.isArray(config.elements)) {
      throw new Error('Faltan campos obligatorios: image, view_box y elements (lista).');
    }
    const parts = String(config.view_box).trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      throw new Error('view_box debe tener el formato "0 0 ancho alto", por ejemplo "0 0 1282 816".');
    }
    this._config = config;
    // Si HA reutiliza el elemento al editar el YAML, hay que repintar con la config nueva.
    this._built = false;
    if (this._hass) {
      this._build();
      this._built = true;
      this._updateStates();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._updateStates();
  }

  _build() {
    const { image, view_box, elements, buttons = [], debug } = this._config;
    const [, , vbW, vbH] = String(view_box).trim().split(/\s+/).map(Number);

    // debug: true pinta las zonas en rojo/ámbar para calibrar posiciones.
    this._debug = !!debug;

    this.innerHTML = `
      <ha-card style="overflow:hidden;">
        <svg viewBox="${planoEscapeHtml(view_box)}" preserveAspectRatio="xMidYMid meet"
             style="width:100%; height:auto; display:block;">
          <image href="${planoEscapeHtml(image)}" x="0" y="0" width="${vbW}" height="${vbH}" />

          ${elements.map((el, i) => `
            <g class="hotspot-group">
              <rect id="hotspot-${i}"
                    x="${Number(el.x)}" y="${Number(el.y)}" width="${Number(el.w)}" height="${Number(el.h)}"
                    rx="8"
                    fill="rgba(0,0,0,0.001)"
                    stroke="none"
                    style="cursor:pointer;" />
              <title>${planoEscapeHtml(el.name)}</title>
            </g>
          `).join('')}

          ${buttons.map((btn, i) => {
            const fontSize = btn.font_size || 22;
            const radius = btn.radius != null ? btn.radius : 10;
            const bg = btn.background || 'rgba(20,20,20,0.8)';
            const fg = btn.color || '#ffffff';
            const cx = Number(btn.x) + Number(btn.w) / 2;
            const cy = Number(btn.y) + Number(btn.h) / 2;
            return `
              <g id="button-${i}" style="cursor:pointer;">
                <rect x="${Number(btn.x)}" y="${Number(btn.y)}" width="${Number(btn.w)}" height="${Number(btn.h)}"
                      rx="${Number(radius)}" fill="${planoEscapeHtml(bg)}" />
                <text x="${cx}" y="${cy}"
                      text-anchor="middle" dominant-baseline="central"
                      fill="${planoEscapeHtml(fg)}" font-size="${Number(fontSize)}" font-weight="600"
                      font-family="inherit" style="pointer-events:none; user-select:none;">
                  ${planoEscapeHtml(btn.name)}
                </text>
              </g>
            `;
          }).join('')}
        </svg>
      </ha-card>
    `;

    elements.forEach((el, i) => {
      const rect = this.querySelector(`#hotspot-${i}`);
      if (!rect) return;
      rect.addEventListener('click', () => this._handleAction(el.tap_action, el.entity));
      rect.addEventListener('mouseenter', () => {
        if (this._debug) {
          rect.setAttribute('fill', 'rgba(255,0,0,0.5)');
          rect.setAttribute('stroke', 'rgba(255,0,0,0.9)');
          rect.setAttribute('stroke-width', '2');
        }
      });
      rect.addEventListener('mouseleave', () => this._updateStates());
    });

    buttons.forEach((btn, i) => {
      const g = this.querySelector(`#button-${i}`);
      if (!g) return;
      g.addEventListener('click', () => this._handleAction(btn.tap_action, btn.entity));
    });
  }

  _handleAction(action, entity) {
    if (!action) return;

    if (action.action === 'navigate') {
      history.pushState(null, '', action.navigation_path);
      window.dispatchEvent(new Event('location-changed', { bubbles: true, composed: true }));
    } else if (action.action === 'url') {
      const target = action.new_tab === false ? '_self' : '_blank';
      window.open(action.url_path, target, 'noopener');
    } else if (action.action === 'call-service' || action.action === 'perform-action') {
      const [domain, service] = String(action.service || action.perform_action).split('.');
      this._hass.callService(domain, service, action.service_data || action.data || {}, action.target || undefined);
    } else if (action.action === 'toggle' && entity) {
      this._hass.callService('homeassistant', 'toggle', { entity_id: entity });
    } else if (action.action === 'more-info' && entity) {
      this.dispatchEvent(new CustomEvent('hass-more-info', {
        detail: { entityId: entity }, bubbles: true, composed: true,
      }));
    }
  }

  _updateStates() {
    if (!this._config) return;
    (this._config.elements || []).forEach((el, i) => {
      const rect = this.querySelector(`#hotspot-${i}`);
      if (!rect) return;

      if (!this._debug) {
        // Producción: invisible pero clicable (fill ~0 en vez de "none" para que siga capturando clics).
        rect.setAttribute('fill', 'rgba(0,0,0,0.001)');
        rect.setAttribute('stroke', 'none');
        return;
      }

      if (!el.entity || !this._hass) {
        rect.setAttribute('fill', 'rgba(255,0,0,0.28)');
        rect.setAttribute('stroke', 'rgba(255,0,0,0.85)');
        return;
      }
      const state = this._hass.states[el.entity];
      if (!state) {
        rect.setAttribute('fill', 'rgba(120,120,120,0.28)');
        rect.setAttribute('stroke', 'rgba(120,120,120,0.85)');
        return;
      }
      const on = state.state === 'on';
      rect.setAttribute('fill', on ? 'rgba(255,193,7,0.35)' : 'rgba(255,0,0,0.22)');
      rect.setAttribute('stroke', on ? 'rgba(255,193,7,0.9)' : 'rgba(255,0,0,0.75)');
    });
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto' };
  }
}

if (!customElements.get('plano-domotech-card')) {
  customElements.define('plano-domotech-card', PlanoDomotechCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'plano-domotech-card')) {
  window.customCards.push({
    type: 'plano-domotech-card',
    name: 'Plano Domotech Card',
    description: 'Plano de planta con zonas clicables invisibles y botones, escalado con viewBox SVG.',
    preview: false,
  });
}

console.info(
  `%c PLANO-DOMOTECH-CARD %c v${PLANO_DOMOTECH_VERSION} `,
  'color:white;background:#0b5ed7;font-weight:bold;',
  'color:#0b5ed7;background:white;font-weight:bold;'
);
})();
