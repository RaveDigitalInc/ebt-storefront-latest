import { loadCSS } from '../../aem.js';

const SIZE_GUIDE_ATTRIBUTE = 'show_size_chart';
let chartPromise;
let instanceCount = 0;

function isEnabled(attributes) {
  const attribute = Array.isArray(attributes)
    ? attributes.find((entry) => (entry.id ?? entry.name ?? entry.code ?? entry.attribute_code) === SIZE_GUIDE_ATTRIBUTE)
    : attributes?.[SIZE_GUIDE_ATTRIBUTE];
  const value = attribute && typeof attribute === 'object' ? attribute.value : attribute;
  return value === true || value === 1 || (typeof value === 'string'
    && ['1', 'true', 'yes'].includes(value.trim().toLowerCase()));
}

function chartData() {
  if (!chartPromise) {
    chartPromise = import('../../data/size-guide-data.js').catch((error) => {
      chartPromise = undefined;
      throw error;
    });
  }
  return chartPromise;
}

function tableShell(label, compact = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'size-guide__table-wrapper';
  wrapper.tabIndex = 0;
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', label);
  const table = document.createElement('table');
  if (compact) table.className = 'size-guide__ring-table';
  const caption = document.createElement('caption');
  caption.textContent = label;
  table.append(caption);
  wrapper.append(table);
  return { wrapper, table };
}

function cell(tag, text, scope, span) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (scope) element.scope = scope;
  if (span) element.colSpan = span;
  return element;
}

function apparelTable(group, label) {
  const { wrapper, table } = tableShell(label);
  const head = document.createElement('thead');
  const headingRow = document.createElement('tr');
  headingRow.append(cell('th', 'Size', 'col'));
  group.sizes.forEach((size) => headingRow.append(cell('th', size, 'colgroup', 4)));
  head.append(headingRow);
  table.append(head);

  const body = document.createElement('tbody');
  const usRow = document.createElement('tr');
  usRow.append(cell('th', 'US Size', 'row'));
  group.usSizes.forEach((size) => usRow.append(cell('td', size, null, 2)));
  body.append(usRow);
  group.measurements.forEach(({ label: measurement, values }) => {
    const row = document.createElement('tr');
    row.append(cell('th', measurement, 'row'));
    values.forEach(([inches, centimeters]) => {
      row.append(cell('td', inches), cell('td', centimeters));
    });
    body.append(row);
  });
  table.append(body);
  return wrapper;
}

function ringTable(chart) {
  const { wrapper, table } = tableShell(chart.title, true);
  const head = document.createElement('thead');
  const headingRow = document.createElement('tr');
  chart.sizes.forEach((size) => headingRow.append(cell('th', size, 'col')));
  head.append(headingRow);
  table.append(head);
  const body = document.createElement('tbody');
  chart.rows.forEach((values) => {
    const row = document.createElement('tr');
    values.forEach((value) => row.append(cell('td', value)));
    body.append(row);
  });
  table.append(body);
  return wrapper;
}

function buildContent(charts, labels) {
  const id = `size-guide-${++instanceCount}`;
  const content = document.createElement('div');
  content.className = 'size-guide';
  const title = document.createElement('h2');
  title.id = `${id}-heading`;
  title.textContent = labels.SizeGuideHeading || 'Size Guide';
  content.append(title);

  const tabs = document.createElement('div');
  tabs.className = 'size-guide__tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', title.textContent);
  const sections = [
    ['women', labels.SizeGuideWomen || 'Women'],
    ['men', labels.SizeGuideMen || 'Men'],
    ['rings', labels.SizeGuideRings || 'Rings'],
  ];
  const buttons = [];
  const panels = [];
  const select = (index) => {
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
  };

  sections.forEach(([key, label], index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'size-guide__tab';
    tab.id = `${id}-tab-${key}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel-${key}`);
    tab.textContent = label;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + sections.length) % sections.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = sections.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(next);
        buttons[next].focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(index);
      }
    });
    tabs.append(tab);
    buttons.push(tab);

    const panel = document.createElement('section');
    panel.className = 'size-guide__panel';
    panel.id = `${id}-panel-${key}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    if (key === 'rings') {
      panel.append(ringTable(charts.rings.women), ringTable(charts.rings.men));
    } else {
      const heading = document.createElement('h3');
      heading.textContent = 'Apparel';
      panel.append(heading);
      charts[key].forEach((group) => panel.append(apparelTable(group, label)));
    }
    panels.push(panel);
  });
  content.append(tabs, ...panels);
  select(0);
  return { content, title, firstTab: buttons[0] };
}

export default function mountSizeGuide(container, attributes, labels = {}) {
  if (!isEnabled(attributes)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'size-guide__trigger';
  button.textContent = labels.SizeGuideButton || 'Size Guide';
  container.append(button);
  let opening = false;

  button.addEventListener('click', async () => {
    if (opening) return;
    opening = true;
    button.disabled = true;
    try {
      const [charts, { default: createModal }] = await Promise.all([
        chartData(),
        import('../../../blocks/modal/modal.js'),
        loadCSS(`${window.hlx.codeBasePath}/scripts/components/size-guide/size-guide.css`),
      ]);
      if (!container.isConnected) return;
      const { content, title, firstTab } = buildContent(charts, labels);
      const modal = await createModal([content]);
      const dialog = modal.block.querySelector('dialog');
      dialog.setAttribute('aria-labelledby', title.id);
      const close = dialog.querySelector('.close-button');
      close.setAttribute('aria-label', labels.SizeGuideClose || 'Close');
      dialog.addEventListener('close', () => {
        if (button.isConnected) button.focus();
      }, { once: true });
      modal.showModal();
      firstTab.focus();
    } catch (error) {
      console.error('Unable to open size guide:', error);
      const message = document.createElement('p');
      message.className = 'size-guide__error';
      message.setAttribute('role', 'alert');
      message.textContent = labels.SizeGuideError || 'Size guide is temporarily unavailable. Please try again.';
      container.querySelector('.size-guide__error')?.remove();
      container.append(message);
    } finally {
      button.disabled = false;
      opening = false;
    }
  });
}
