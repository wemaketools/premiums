/**
 * The master data the collections screens join to the engine's facts (client, broker, product, policy and user
 * names) and the choices of the shared filters. Everything is read through the typed endpoints.
 */
import { useMemo } from 'react';

import { CHANNELS, endpoints } from '../../../../contracts/index';
import type { Broker, Client, Policy, Product, ScopeKey, User } from '../../../../contracts/index';
import type { ApiError } from '../../api/client';
import { useApiQuery } from '../../api/hooks';
import type { SelectOption } from '../../components/ui';
import { t } from '../../lib/i18n';

export interface Lookups {
  readonly options: Readonly<Record<ScopeKey, readonly SelectOption[]>>;
  readonly policy: (id: string) => Policy | undefined;
  readonly client: (id: string) => Client | undefined;
  readonly broker: (id: string) => Broker | undefined;
  readonly product: (id: string) => Product | undefined;
  readonly user: (id: string) => User | undefined;
  /** The name behind an id; `null` is a group without one (direct business, no owner). */
  readonly nameOf: {
    readonly client: (id: string | null) => string;
    readonly broker: (id: string | null) => string;
    readonly product: (id: string | null) => string;
    readonly owner: (id: string | null) => string;
    readonly channel: (id: string | null) => string;
    readonly policy: (id: string | null) => string;
  };
  /** The label of a filter value, for the active-filter chips. */
  readonly filterValue: (key: ScopeKey, value: string) => string;
}

export interface LookupsResult {
  readonly lookups: Lookups | undefined;
  readonly error: ApiError | null;
  readonly reload: () => void;
}

const byLabel = (a: SelectOption, b: SelectOption): number => a.label.localeCompare(b.label);

export function useLookups(): LookupsResult {
  const policies = useApiQuery(endpoints.policiesList, {});
  const clients = useApiQuery(endpoints.clientsList, {});
  const brokers = useApiQuery(endpoints.brokersList, {});
  const products = useApiQuery(endpoints.productsList, {});
  const users = useApiQuery(endpoints.usersList, {});
  const queries = [policies, clients, brokers, products, users];
  const error =
    queries.find((query) => query.error !== null && query.data === undefined)?.error ?? null;

  const lookups = useMemo((): Lookups | undefined => {
    if (
      policies.data === undefined ||
      clients.data === undefined ||
      brokers.data === undefined ||
      products.data === undefined ||
      users.data === undefined
    ) {
      return undefined;
    }
    const policyById = new Map(policies.data.items.map((row) => [row.policy_id, row]));
    const clientById = new Map(clients.data.items.map((row) => [row.client_id, row]));
    const brokerById = new Map(brokers.data.items.map((row) => [row.broker_id, row]));
    const productById = new Map(products.data.items.map((row) => [row.product_id, row]));
    const userById = new Map(users.data.items.map((row) => [row.user_id, row]));
    const ownerIds = new Set(brokers.data.items.map((row) => row.owner_user_id));
    const nameOf = {
      client: (id: string | null) => (id === null ? '' : (clientById.get(id)?.name ?? id)),
      broker: (id: string | null) =>
        id === null ? t('collections-scope.noBroker') : (brokerById.get(id)?.name ?? id),
      product: (id: string | null) =>
        id === null ? '' : (productById.get(id)?.product_name ?? id),
      owner: (id: string | null) =>
        id === null ? t('collections-scope.noOwner') : (userById.get(id)?.display_name ?? id),
      channel: (id: string | null) => (id === null ? '' : t(`collections-scope.channel.${id}`)),
      policy: (id: string | null) => (id === null ? '' : (policyById.get(id)?.policy_number ?? id)),
    };
    const options: Record<ScopeKey, SelectOption[]> = {
      product_id: products.data.items
        .map((row) => ({ value: row.product_id, label: row.product_name }))
        .sort(byLabel),
      broker_id: brokers.data.items
        .map((row) => ({ value: row.broker_id, label: row.name }))
        .sort(byLabel),
      channel: CHANNELS.map((channel) => ({ value: channel, label: nameOf.channel(channel) })),
      owner_id: users.data.items
        .filter((row) => ownerIds.has(row.user_id))
        .map((row) => ({ value: row.user_id, label: row.display_name }))
        .sort(byLabel),
      client_id: clients.data.items
        .map((row) => ({ value: row.client_id, label: row.name }))
        .sort(byLabel),
      policy_id: policies.data.items
        .map((row) => ({ value: row.policy_id, label: row.policy_number }))
        .sort(byLabel),
    };
    const FILTER_NAME: Record<ScopeKey, (id: string) => string> = {
      product_id: nameOf.product,
      broker_id: nameOf.broker,
      channel: nameOf.channel,
      owner_id: nameOf.owner,
      client_id: nameOf.client,
      policy_id: nameOf.policy,
    };
    return {
      options,
      policy: (id) => policyById.get(id),
      client: (id) => clientById.get(id),
      broker: (id) => brokerById.get(id),
      product: (id) => productById.get(id),
      user: (id) => userById.get(id),
      nameOf,
      filterValue: (key, value) => FILTER_NAME[key](value),
    };
  }, [policies.data, clients.data, brokers.data, products.data, users.data]);

  return {
    lookups,
    error,
    reload: () => queries.forEach((query) => query.reload()),
  };
}
