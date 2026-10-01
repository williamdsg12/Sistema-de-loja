import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodeCode128: React.FC<BarcodeProps> = ({
  value,
  width = 1.3,
  height = 28,
  displayValue = false,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          width,
          height,
          displayValue,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('Erro ao gerar código de barras CODE128:', err);
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} className={className} />;
};
