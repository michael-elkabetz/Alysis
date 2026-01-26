import type { AnalysisInterfaces } from './api';

function toPascalCase(name: string): string {
  return name
    .split(/[\s-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function generateTypeFromValue(value: unknown, indent = 2): string {
  const spaces = ' '.repeat(indent);
  
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const itemType = generateTypeFromValue(value[0], indent);
    if (itemType.includes('\n')) {
      return `Array<${itemType}>`;
    }
    return `${itemType}[]`;
  }
  
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return 'Record<string, unknown>';
    
    const props = entries.map(([key, val]) => {
      const type = generateTypeFromValue(val, indent + 2);
      return `${spaces}${key}: ${type};`;
    });
    
    return `{\n${props.join('\n')}\n${' '.repeat(indent - 2)}}`;
  }
  
  return typeof value;
}

export function generateInterface(name: string, data: Record<string, unknown>): string {
  const pascalName = toPascalCase(name);
  const entries = Object.entries(data);
  
  if (entries.length === 0) {
    return `interface ${pascalName}Response {\n  [key: string]: unknown;\n}`;
  }
  
  const props = entries.map(([key, value]) => {
    const type = generateTypeFromValue(value, 4);
    return `  ${key}: ${type};`;
  });
  
  return `interface ${pascalName}Response {\n${props.join('\n')}\n}`;
}

export function generateInterfaceFromStoredInterfaces(name: string, interfaces: AnalysisInterfaces): string {
  const pascalName = toPascalCase(name);
  const props = interfaces.output.properties;
  
  if (Object.keys(props).length === 0) {
    return `interface ${pascalName}Response {\n  [key: string]: unknown;\n}`;
  }
  
  const propLines = Object.entries(props)
    .map(([key, value]) => {
      const type = value.type === 'object' ? 'Record<string, unknown>' : value.type;
      return `  ${key}: ${type};`;
    })
    .join('\n');

  return `interface ${pascalName}Response {\n${propLines}\n}`;
}

function inferTypeFromValue(value: unknown, depth = 0, inline = false): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const itemType = inferTypeFromValue(value[0], depth + 1, inline);
    return `${itemType}[]`;
  }
  
  if (value !== null && typeof value === 'object') {
    if (depth > 3) return 'Record<string, unknown>';
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return 'Record<string, unknown>';
    
    if (inline || depth > 0) {
      const propParts = entries
        .map(([key, val]) => `${key}: ${inferTypeFromValue(val, depth + 1, true)}`)
        .join('; ');
      return `{ ${propParts} }`;
    }
    
    const propLines = entries
      .map(([key, val]) => `  ${key}: ${inferTypeFromValue(val, depth + 1, false)};`)
      .join('\n');
    return `{\n${propLines}\n}`;
  }
  
  const primitiveType = typeof value;
  return primitiveType === 'object' ? 'Record<string, unknown>' : primitiveType;
}

export function generateInterfacesFromOutput(output: Record<string, unknown>): AnalysisInterfaces {
  const properties: Record<string, { type: string }> = {};

  for (const [key, value] of Object.entries(output)) {
    properties[key] = { type: inferTypeFromValue(value) };
  }

  return {
    output: {
      type: 'object',
      properties,
      required: Object.keys(properties),
    },
  };
}
