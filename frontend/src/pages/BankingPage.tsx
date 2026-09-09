import { AppShell } from '../components/AppShell'
import { GatedFeature } from '../components/GatedFeature'

export function BankingPage() {
  return (
    <AppShell>
      <GatedFeature
        eyebrow="Banking"
        title="Read-only bank linking"
        icon="lock"
        description="Connecting an external bank for read-only balance and transaction monitoring isn't turned on yet. This platform never initiates payments or transfers, and linking will stay off until it's ready."
        reasons={[
          'Provider risk assessment, a signed data-processing agreement and a dedicated security review have not been completed.',
          'Read-only consent wording and the provider-hosted linking flow have not been finalized.',
          'No bank-account or Gross Balance data is stored or requested by this build.',
        ]}
      />
    </AppShell>
  )
}
