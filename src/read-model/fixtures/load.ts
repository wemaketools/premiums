/**
 * Loads one data set from its CSV files. Every row is checked against the contracts; a bad row is quarantined with
 * its row, field, problem and fix and the good rows load (the spec's data rules). A row that points at a quarantined
 * parent is quarantined too: a bad policy_id, a duplicate invoice_id or allocation_id never reaches a calculation, and
 * an allocation that would over-allocate an invoice or a receipt is rejected. A missing due date loads as null with a
 * warning: it means UNKNOWN.
 */
import type { z } from 'zod';

import {
  DATA_SETS,
  ENTITIES,
  ENTITY_NAMES,
  ISSUE_FIX,
  Money,
  addMoney,
  compareMoney,
  dateOf,
  normalizeMoney,
} from '../../contracts/index.js';
import type { DataIssue, DataSetId, EntityDefinition, EntityName, Tenant } from '../../contracts/index.js';
import { parseCsv } from './csv.js';
import { createRowIndex } from './rowIndex.js';
import type { Raw, RowIndex } from './rowIndex.js';

/** File name to CSV text, for example `{ 'claims.csv': 'tenant_id,claim_id,…' }`. */
export type FixtureFiles = Readonly<Record<string, string>>;

type RecordOf<E extends EntityName> = z.infer<(typeof ENTITIES)[E]['schema']>;
export type DatasetRecords = { [E in EntityName]: RecordOf<E>[] };

export interface LoadedDataset {
  readonly dataSet: DataSetId;
  readonly tenant: Tenant;
  readonly records: DatasetRecords;
  readonly issues: readonly DataIssue[];
}

interface Problem {
  readonly field: string;
  readonly problem: string;
  readonly fix: string;
}

/** Evidence the rules need. When it is missing the row still loads and the rules say UNKNOWN. */
const EVIDENCE: readonly { entity: EntityName; field: string; problem: string; fix: string }[] = [
  {
    entity: 'invoice',
    field: 'due_date',
    problem: 'has no due date, so it cannot be aged',
    fix: 'Fill in due_date; until then the invoice is in gross unpaid but in no aging bucket and never overdue.',
  },
];

function describeIssue(issue: z.core.$ZodIssue, raw: unknown): Problem {
  const field = String(issue.path[0] ?? '(row)');
  const shown = typeof raw === 'string' ? `"${raw}"` : String(raw);
  if (issue.code === 'invalid_type' && (raw === null || raw === undefined)) {
    return { field, problem: 'is missing', fix: 'Fill in the value; this field is required.' };
  }
  if (issue.code === 'custom') {
    const fix = (issue.params as Record<string, unknown> | undefined)?.[ISSUE_FIX];
    return { field, problem: `${shown} ${issue.message}`, fix: typeof fix === 'string' ? fix : 'Correct the value.' };
  }
  if (issue.code === 'invalid_value') {
    const allowed = issue.values.map(String).join(', ');
    return { field, problem: `${shown} is not an allowed value`, fix: `Use one of: ${allowed}.` };
  }
  if (issue.code === 'invalid_type') {
    return { field, problem: `${shown} is not a ${issue.expected} value`, fix: `Write a ${issue.expected} value.` };
  }
  return { field, problem: `${shown}: ${issue.message}`, fix: 'Correct the value.' };
}

function coerce(definition: EntityDefinition, header: readonly string[], cells: readonly string[]): Raw {
  const raw: Raw = {};
  header.forEach((name, index) => {
    const text = (cells[index] ?? '').trim();
    const shape: Record<string, unknown> = definition.schema.shape;
    if (text === '') {
      raw[name] = null;
    } else if (definition.booleanFields.includes(name) && (text === 'true' || text === 'false')) {
      raw[name] = text === 'true';
    } else if (shape[name] === Money) {
      raw[name] = normalizeMoney(text);
    } else {
      raw[name] = text;
    }
  });
  return raw;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function loadDataset(dataSet: DataSetId, files: FixtureFiles): LoadedDataset {
  const expected = DATA_SETS[dataSet];
  const accepted = new Map<EntityName, Raw[]>();
  const index = createRowIndex();
  const issues: DataIssue[] = [];
  const allocatedToInvoice = new Map<string, string>();
  const allocatedFromReceipt = new Map<string, string>();


  for (const name of ENTITY_NAMES) {
    const definition: EntityDefinition = ENTITIES[name];
    const kept: Raw[] = [];
    const seen = new Map<string, number>();
    accepted.set(name, kept);

    const add = (kind: DataIssue['kind'], line: number, recordId: string | null, problem: Problem): void => {
      issues.push({ issue_no: issues.length + 1, kind, entity: name, file: definition.file, row: line, record_id: recordId, ...problem });
    };

    const text = files[definition.file];
    if (text === undefined) {
      add('quarantined', 1, null, {
        field: '(file)',
        problem: `${definition.file} is missing from the data set`,
        fix: `Add ${definition.file} with the header row of the fixture schema.`,
      });
      continue;
    }
    const table = parseCsv(text);

    for (const row of table.rows) {
      const raw = coerce(definition, table.header, row.cells);
      const recordId = typeof raw[definition.idField] === 'string' ? str(raw[definition.idField]) : null;
      const problems: Problem[] = [];

      if (row.cells.length !== table.header.length) {
        problems.push({
          field: '(row)',
          problem: `has ${row.cells.length} values but the header has ${table.header.length} columns`,
          fix: 'Check for a missing or extra comma; put quotes around a value that contains a comma.',
        });
      }

      const parsed = definition.schema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          problems.push(describeIssue(issue, raw[String(issue.path[0])]));
        }
      }
      if (raw.tenant_id !== null && raw.tenant_id !== undefined && raw.tenant_id !== expected.tenant_id) {
        problems.push({
          field: 'tenant_id',
          problem: `belongs to tenant "${str(raw.tenant_id)}", but this data set is ${expected.tenant_id}`,
          fix: `Remove the row, or move it to the ${str(raw.tenant_id)} fixture; TEST and DEMO never mix.`,
        });
      }
      if (recordId !== null) {
        const first = seen.get(recordId);
        if (first !== undefined) {
          problems.push({
            field: definition.idField,
            problem: `"${recordId}" is a duplicate of the row on line ${first}`,
            fix: 'Give the row a unique id, or delete the repeated row.',
          });
        }
      }

      if (parsed.success) {
        const record: Raw = parsed.data;
        for (const reference of definition.references) {
          const target = record[reference.field];
          if (target === null && reference.optional) continue;
          if (typeof target === 'string' && index.get(reference.entity, target) === undefined) {
            problems.push({
              field: reference.field,
              problem: `refers to ${reference.entity} "${target}", which is not in this data set (missing, or itself rejected)`,
              fix: `Add ${target} to ${ENTITIES[reference.entity].file}, or correct the id.`,
            });
          }
        }
        problems.push(...sanityProblems(name, record, { allocatedToInvoice, allocatedFromReceipt }, index));
      }

      if (problems.length > 0) {
        for (const problem of problems) add('quarantined', row.line, recordId, problem);
        continue;
      }
      const record: Raw = parsed.success ? parsed.data : raw;
      if (recordId !== null) {
        seen.set(recordId, row.line);
        index.add(name, recordId, record);
      }
      commitSums(name, record, allocatedToInvoice, allocatedFromReceipt);
      kept.push(record);
      for (const evidence of EVIDENCE) {
        if (evidence.entity === name && record[evidence.field] === null) {
          add('warning', row.line, recordId, { field: evidence.field, problem: evidence.problem, fix: evidence.fix });
        }
      }
    }
  }

  const records = Object.fromEntries(ENTITY_NAMES.map((name) => [name, accepted.get(name) ?? []])) as unknown as DatasetRecords;
  const tenant = records.tenant.find((row) => row.tenant_id === expected.tenant_id) ?? {
    ...expected,
    dataset_tag: dataSet,
  };
  return { dataSet, tenant, records, issues };
}

interface Sums {
  readonly allocatedToInvoice: Map<string, string>;
  readonly allocatedFromReceipt: Map<string, string>;
}

/** Date and amount sanity that one field cannot express. */
function sanityProblems(name: EntityName, record: Raw, sums: Sums, index: RowIndex): Problem[] {
  const out: Problem[] = [];
  const before = (field: string, later: string, laterLabel: string): void => {
    const a = record[field];
    const b = record[later];
    if (typeof a === 'string' && typeof b === 'string' && dateOf(b) < dateOf(a)) {
      out.push({
        field: later,
        problem: `${b} is before ${field} (${a})`,
        fix: `Correct ${later} or ${field}: ${laterLabel} cannot come first.`,
      });
    }
  };
  switch (name) {
    case 'policy':
      before('inception_at', 'expiry_at', 'the policy end');
      break;
    case 'invoice':
      before('issue_date', 'due_date', 'the due date');
      break;
    case 'payment_allocation': {
      const amount = str(record.allocated_amount);
      const invoice = index.get('invoice', str(record.invoice_id));
      const receipt = index.get('receipt', str(record.receipt_id));
      const toInvoice = addMoney(sums.allocatedToInvoice.get(str(record.invoice_id)) ?? '0.00', amount);
      const fromReceipt = addMoney(sums.allocatedFromReceipt.get(str(record.receipt_id)) ?? '0.00', amount);
      if (invoice !== undefined && compareMoney(toInvoice, str(invoice.issued_amount)) > 0) {
        out.push({
          field: 'allocated_amount',
          problem: `would allocate ${toInvoice} to invoice ${str(record.invoice_id)}, which was issued for ${str(invoice.issued_amount)}`,
          fix: 'Reduce the amount or remove the duplicate allocation; an invoice cannot be over-allocated.',
        });
      }
      if (receipt !== undefined && compareMoney(fromReceipt, str(receipt.gross_amount)) > 0) {
        out.push({
          field: 'allocated_amount',
          problem: `would allocate ${fromReceipt} from receipt ${str(record.receipt_id)}, which received ${str(receipt.gross_amount)}`,
          fix: 'Reduce the amount or remove the duplicate allocation; a receipt cannot be over-allocated.',
        });
      }
      break;
    }
    default:
      break;
  }
  return out;
}

function commitSums(name: EntityName, record: Raw, toInvoice: Map<string, string>, fromReceipt: Map<string, string>): void {
  if (name !== 'payment_allocation') return;
  const amount = str(record.allocated_amount);
  const invoice = str(record.invoice_id);
  const receipt = str(record.receipt_id);
  toInvoice.set(invoice, addMoney(toInvoice.get(invoice) ?? '0.00', amount));
  fromReceipt.set(receipt, addMoney(fromReceipt.get(receipt) ?? '0.00', amount));
}
