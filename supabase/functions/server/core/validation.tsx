import { badRequest } from "./errors.tsx";

export type Rule = {
  label: string;
  required?: boolean;
  parse: (value: unknown, label: string) => unknown;
};

export type Schema = Record<string, Rule>;

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function text(label: string, options: { min?: number; max?: number; required?: boolean } = {}): Rule {
  const min = options.min ?? 0;
  const max = options.max ?? 500;
  return {
    label,
    required: options.required ?? true,
    parse(value) {
      const result = String(value).trim();
      if (result.length < min) throw badRequest(label + " minimal " + min + " karakter.");
      if (result.length > max) throw badRequest(label + " maksimal " + max + " karakter.");
      return result;
    },
  };
}

export function number(label: string, options: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}): Rule {
  return {
    label,
    required: options.required ?? true,
    parse(value) {
      const result = Number(value);
      if (!Number.isFinite(result)) throw badRequest(label + " harus berupa angka.");
      if (options.integer && !Number.isInteger(result)) throw badRequest(label + " harus berupa bilangan bulat.");
      if (options.min !== undefined && result < options.min) throw badRequest(label + " minimal " + options.min + ".");
      if (options.max !== undefined && result > options.max) throw badRequest(label + " maksimal " + options.max + ".");
      return result;
    },
  };
}

export function oneOf(label: string, allowed: string[], required = true): Rule {
  return {
    label,
    required,
    parse(value) {
      const result = String(value);
      if (allowed.indexOf(result) < 0) throw badRequest(label + " tidak valid.");
      return result;
    },
  };
}

export function flag(label: string, required = false): Rule {
  return {
    label,
    required,
    parse(value) {
      return value === true || value === "true";
    },
  };
}

export function image(label: string): Rule {
  return {
    label,
    required: false,
    parse(value) {
      const result = String(value);
      if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(result)) throw badRequest(label + " harus berupa file gambar yang valid.");
      if (result.length > 400000) throw badRequest(label + " terlalu besar. Gunakan gambar yang lebih kecil.");
      return result;
    },
  };
}

export function list(label: string, itemParser: (item: any) => unknown, options: { min?: number; max?: number } = {}): Rule {
  return {
    label,
    required: true,
    parse(value) {
      if (!Array.isArray(value)) throw badRequest(label + " harus berupa daftar.");
      if (options.min !== undefined && value.length < options.min) throw badRequest(label + " minimal " + options.min + " item.");
      if (options.max !== undefined && value.length > options.max) throw badRequest(label + " maksimal " + options.max + " item.");
      return value.map(itemParser);
    },
  };
}

export function strings(label: string, allowed: string[]): Rule {
  return {
    label,
    required: false,
    parse(value) {
      if (!Array.isArray(value)) throw badRequest(label + " harus berupa daftar.");
      return value.filter(function (item) {
        return allowed.indexOf(String(item)) >= 0;
      });
    },
  };
}

/** Memvalidasi body terhadap skema; mengembalikan hanya kolom yang dikenal. */
export function validate(body: any, schema: Schema, partial = false): Record<string, any> {
  const source = body && typeof body === "object" ? body : {};
  const result: Record<string, any> = {};

  for (const name of Object.keys(schema)) {
    const rule = schema[name];
    const value = source[name];

    if (isEmpty(value)) {
      if (rule.required && !partial) throw badRequest(rule.label + " wajib diisi.");
      if (value === "" && !rule.required) result[name] = "";
      continue;
    }
    result[name] = rule.parse(value, rule.label);
  }
  return result;
}
