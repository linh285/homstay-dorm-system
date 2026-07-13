import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';

/**
 * Numeric-only money field (VND). Only digits can be entered, thousands are
 * grouped for readability, and the value is emitted as an integer string that
 * the API accepts (e.g. "1500000"). Prevents free-text typos in amounts.
 */
export function MoneyInput(props: InputNumberProps<string>) {
  return (
    <InputNumber<string>
      stringMode
      min="0"
      precision={0}
      controls={false}
      style={{ width: '100%' }}
      addonAfter="₫"
      formatter={(value) =>
        value === undefined || value === null || value === ''
          ? ''
          : `${value}`
              .split('.')[0]!
              .replace(/\D/g, '')
              .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      }
      parser={(value) => (value ?? '').replace(/\D/g, '')}
      {...props}
    />
  );
}
