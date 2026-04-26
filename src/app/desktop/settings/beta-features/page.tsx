"use client";

import { useState } from "react";
import { Sparkles, AlertCircle, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  useBetaFeature,
  type BetaFeatureId,
} from "@/lib/beta-features";
import { usePlan } from "@/lib/auth/use-plan";
import { isFeatureAvailable, type Feature } from "@/lib/plan-gate";
import { UpgradeModal } from "@/components/desktop/upgrade-modal";
import type { PlanId } from "@/config/plans";

interface BetaFeatureRow {
  id: BetaFeatureId;
  name: string;
  description: string;
  /** Plan-gate `Feature` enum value, if the toggle is also gated by plan. */
  requires?: { feature: Feature; plan: PlanId };
}

const FEATURES: BetaFeatureRow[] = [
  {
    id: "free_discussion_meeting",
    name: "Free Discussion Meeting Room",
    description:
      "Agents interrupt each other naturally instead of taking strict turns. May be chaotic — gives more emergent group behaviour.",
    requires: { feature: "ai_meeting_room_full", plan: "pro" },
  },
];

export default function BetaFeaturesPage() {
  const { plan } = usePlan();
  const [upgradeGate, setUpgradeGate] = useState<{
    feature: Feature;
    plan: PlanId;
  } | null>(null);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-5 text-amber-400" />
        <h1 className="text-2xl font-bold">Beta Features</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Experimental toggles inside the BossBoard public beta. May be unstable —
        please report what breaks.
      </p>

      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-900/15 p-4 text-sm mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Beta inside beta</p>
            <p className="text-gray-400 mt-1">
              BossBoard is currently Beta v0.1. These features are experimental
              even within the beta — expect rough edges and changes between
              releases.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {FEATURES.map((row) => (
          <Row
            key={row.id}
            row={row}
            plan={plan}
            onUpgrade={(gate) => setUpgradeGate(gate)}
          />
        ))}
      </div>

      {upgradeGate && (
        <UpgradeModal
          feature={upgradeGate.feature}
          requiredPlan={upgradeGate.plan}
          onClose={() => setUpgradeGate(null)}
          onUpgrade={() =>
            window.open("https://mybossboard.com/pricing", "_blank")
          }
        />
      )}
    </div>
  );
}

function Row({
  row,
  plan,
  onUpgrade,
}: {
  row: BetaFeatureRow;
  plan: PlanId;
  onUpgrade: (gate: { feature: Feature; plan: PlanId }) => void;
}) {
  const [enabled, setEnabled] = useBetaFeature(row.id);
  const allowed = !row.requires || isFeatureAvailable(row.requires.feature, plan);

  function handleToggle(value: boolean) {
    if (value && !allowed && row.requires) {
      onUpgrade({ feature: row.requires.feature, plan: row.requires.plan });
      return;
    }
    setEnabled(value);
  }

  return (
    <div className="rounded-lg border border-bb-border bg-bb-card p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium flex items-center gap-2">
          {row.name}
          {!allowed && <Lock className="size-3.5 text-amber-400" />}
        </div>
        <p className="text-sm text-gray-400 mt-1">{row.description}</p>
        {row.requires && !allowed && (
          <p className="text-xs text-amber-400 mt-1">
            Requires {row.requires.plan} plan or higher.
          </p>
        )}
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
