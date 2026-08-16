import { formatEventMessage } from './events.service';

describe('formatEventMessage', () => {
  it('uses payload.message when present', () => {
    expect(
      formatEventMessage('s-webs', 'price_changed', { message: 'Цена 100' }),
    ).toBe('Цена 100');
  });

  it('renders key/value dump otherwise', () => {
    const text = formatEventMessage('s-webs', 'stock_threshold', {
      sku: 'ABC',
      qty: 2,
    });
    expect(text).toContain('[s-webs] stock_threshold');
    expect(text).toContain('sku: ABC');
    expect(text).toContain('qty: 2');
  });

  it('escapes HTML in the key/value dump', () => {
    const text = formatEventMessage('s-webs', 'price_changed', {
      name: '<b>x</b>',
    });
    expect(text).toContain('name: &lt;b&gt;x&lt;/b&gt;');
  });
});
