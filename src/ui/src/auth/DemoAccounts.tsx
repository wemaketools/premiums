/**
 * DemoAccounts: the sign-in card of demo accounts, one two-line button each. It shows what its props say and imports
 * no account list: a prototype build lists the roles, the password page the accounts of `src/contracts/demoAccounts.ts`.
 */
import { Card } from '../components/ui/Card';

export interface DemoAccountEntry<Id extends string> {
  readonly id: Id;
  /** First line. */
  readonly name: string;
  /** Second line. */
  readonly detail: string;
}

export interface DemoAccountsProps<Id extends string> {
  readonly title: string;
  readonly subtitle: string;
  readonly accounts: readonly DemoAccountEntry<Id>[];
  readonly onPick: (id: Id) => void;
  readonly disabled?: boolean;
}

export function DemoAccounts<Id extends string>({
  title,
  subtitle,
  accounts,
  onPick,
  disabled = false,
}: DemoAccountsProps<Id>) {
  return (
    <Card className="prm-demo-accounts" title={title} subtitle={subtitle} headingLevel={2}>
      <ul className="prm-demo-list">
        {accounts.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              className="prm-demo-account"
              disabled={disabled}
              onClick={() => onPick(account.id)}
            >
              {account.name}
              <span className="prm-demo-account-role">{account.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
