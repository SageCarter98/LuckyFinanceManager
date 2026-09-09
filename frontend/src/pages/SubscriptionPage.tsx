import { AppShell } from '../components/AppShell'
import { GatedFeature } from '../components/GatedFeature'

export function SubscriptionPage() {
  return (
    <AppShell>
      <GatedFeature
        eyebrow="Subscription"
        title="Billing & subscription"
        icon="workspace_premium"
        description="There is no paid plan yet. Every manual finance feature — accounts, categories, transactions, recurring bills, savings goals and reports — is free with no subscription required."
        reasons={[
          'No billing or payment processor is wired up in this build.',
          'When a paid plan (bank linking and Gross Balance) ships, it will only ever gate those features — never manual tracking.',
        ]}
      />
    </AppShell>
  )
}
