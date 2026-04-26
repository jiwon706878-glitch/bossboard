"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createAgent, listAgents, type AgentProvider } from "@/lib/agents/service";
import {
  AGENT_TEMPLATES,
  fillTemplate,
  type AgentTemplateId,
} from "@/lib/agents/templates";
import { MOTION } from "@/lib/motion/tokens";
import { usePlan } from "@/lib/auth/use-plan";
import { isFeatureAvailable, type Feature } from "@/lib/plan-gate";
import { UpgradeModal } from "@/components/desktop/upgrade-modal";
import type { PlanId } from "@/config/plans";

const PROVIDER_OPTIONS: Array<{ value: AgentProvider; label: string; hint: string }> = [
  { value: "google", label: "Google Gemini", hint: "Cheapest, generous free tier" },
  { value: "anthropic", label: "Anthropic Claude", hint: "Best for long manuals" },
  { value: "openai", label: "OpenAI GPT", hint: "Familiar default" },
  { value: "grok", label: "xAI Grok", hint: "Fast, opinionated" },
  { value: "local", label: "Local Ollama", hint: "Offline, slower" },
];

export default function NewAgentWizardPage() {
  const router = useRouter();
  const { plan } = usePlan();
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<AgentTemplateId>("personal-assistant");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [provider, setProvider] = useState<AgentProvider>("google");
  const [customManual, setCustomManual] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [upgradeGate, setUpgradeGate] = useState<{
    feature: Feature;
    requiredPlan: PlanId;
  } | null>(null);

  useEffect(() => {
    listAgents()
      .then((list) => setAgentCount(list.length))
      .catch(() => setAgentCount(0));
  }, []);

  const template = AGENT_TEMPLATES[templateId];
  const filledManual = fillTemplate(
    template,
    name || "{name}",
    role || template.defaultRole || "Agent",
  );
  const finalManual = customManual ?? filledManual;

  const canStep2 = !!templateId;
  const canStep3 = name.trim().length > 0 && (role.trim().length > 0 || templateId === "personal-assistant" || templateId === "blank");
  const canStep4 = finalManual.trim().length > 0;

  function checkAgentCountGate(): { gated: true; gate: { feature: Feature; requiredPlan: PlanId } } | { gated: false } {
    if (agentCount >= 50 && !isFeatureAvailable("more_than_50_agents", plan)) {
      return { gated: true, gate: { feature: "more_than_50_agents", requiredPlan: "business" } };
    }
    if (agentCount >= 10 && !isFeatureAvailable("more_than_10_agents", plan)) {
      return { gated: true, gate: { feature: "more_than_10_agents", requiredPlan: "pro" } };
    }
    if (agentCount >= 3 && !isFeatureAvailable("more_than_3_agents", plan)) {
      return { gated: true, gate: { feature: "more_than_3_agents", requiredPlan: "starter" } };
    }
    return { gated: false };
  }

  async function handleCreate() {
    const gate = checkAgentCountGate();
    if (gate.gated) {
      setUpgradeGate(gate.gate);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createAgent(
        name.trim(),
        role.trim() || template.defaultRole || "Agent",
        templateId,
        provider,
      );
      router.push("/desktop/agents");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/desktop/agents"
        className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-4 h-4" /> Agents
      </Link>
      <h1 className="text-2xl font-bold mb-1">Create a new agent</h1>
      <p className="text-sm text-gray-400 mb-6">Step {step} of 4</p>

      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? "bg-bb-primary" : "bg-bb-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
        >
          {step === 1 && (
            <Step1Template
              templateId={templateId}
              onSelect={setTemplateId}
            />
          )}
          {step === 2 && (
            <Step2NameRole
              template={template}
              name={name}
              role={role}
              onName={setName}
              onRole={setRole}
            />
          )}
          {step === 3 && (
            <Step3Manual
              manual={finalManual}
              onChange={setCustomManual}
              onReset={() => setCustomManual(null)}
              isCustom={customManual !== null}
            />
          )}
          {step === 4 && (
            <Step4Review
              name={name}
              role={role || template.defaultRole}
              provider={provider}
              onProvider={setProvider}
              templateName={template.name}
              error={error}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-card rounded-md disabled:opacity-30 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3) || (step === 3 && !canStep4)}
            className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50 inline-flex items-center gap-1"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Check className="w-4 h-4" /> {creating ? "Creating…" : "Create agent"}
          </button>
        )}
      </div>

      {upgradeGate && (
        <UpgradeModal
          feature={upgradeGate.feature}
          requiredPlan={upgradeGate.requiredPlan}
          onClose={() => setUpgradeGate(null)}
          onUpgrade={() =>
            window.open("https://mybossboard.com/pricing", "_blank")
          }
        />
      )}
    </div>
  );
}

function Step1Template({
  templateId,
  onSelect,
}: {
  templateId: AgentTemplateId;
  onSelect: (id: AgentTemplateId) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Pick a template</h2>
      <p className="text-sm text-gray-400 mb-4">
        Start with a manual that matches the agent&apos;s purpose. You can edit it next.
      </p>
      <div className="grid gap-2">
        {Object.values(AGENT_TEMPLATES).map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`text-left p-4 rounded-md border transition ${
              templateId === t.id
                ? "border-bb-primary bg-bb-primary/10"
                : "border-bb-border bg-bb-card hover:border-bb-primary/50"
            }`}
          >
            <div className="font-medium text-sm">{t.name}</div>
            <div className="text-xs text-gray-400 mt-1">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2NameRole({
  template,
  name,
  role,
  onName,
  onRole,
}: {
  template: { name: string; defaultRole: string };
  name: string;
  role: string;
  onName: (v: string) => void;
  onRole: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Name your agent</h2>
      <p className="text-sm text-gray-400 mb-4">
        Pick a short, friendly name. Role describes what they do on your team.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="e.g., Jarvis, Marketing-Lead, Code-Buddy"
            className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
          />
          <div className="text-[11px] text-gray-500 mt-1">
            Used as the folder name under <code>/agents/</code>. Letters, numbers,
            dashes are safe.
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Role</label>
          <input
            value={role}
            onChange={(e) => onRole(e.target.value)}
            placeholder={template.defaultRole || "e.g., Marketing strategist"}
            className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function Step3Manual({
  manual,
  onChange,
  onReset,
  isCustom,
}: {
  manual: string;
  onChange: (v: string) => void;
  onReset: () => void;
  isCustom: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">Customize the manual</h2>
        {isCustom && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-bb-primary underline"
          >
            Reset to template
          </button>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-4">
        This is your agent&apos;s instruction set. You can edit it any time later in{" "}
        <code>/agents/{`{name}`}/manual.md</code>.
      </p>
      <textarea
        value={manual}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className="w-full p-3 bg-bb-bg border border-bb-border rounded-md text-sm font-mono"
      />
    </div>
  );
}

function Step4Review({
  name,
  role,
  provider,
  onProvider,
  templateName,
  error,
}: {
  name: string;
  role: string;
  provider: AgentProvider;
  onProvider: (p: AgentProvider) => void;
  templateName: string;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Review &amp; pick a model</h2>
      <p className="text-sm text-gray-400 mb-4">
        You can change any of this later from the agent&apos;s manual frontmatter.
      </p>

      <div className="p-4 bg-bb-card border border-bb-border rounded-md mb-4 space-y-1 text-sm">
        <div>
          <span className="text-gray-400">Name:</span> <span className="font-medium">{name || "—"}</span>
        </div>
        <div>
          <span className="text-gray-400">Role:</span> <span className="font-medium">{role || "—"}</span>
        </div>
        <div>
          <span className="text-gray-400">Template:</span>{" "}
          <span className="font-medium">{templateName}</span>
        </div>
      </div>

      <label className="text-xs text-gray-400">AI provider</label>
      <div className="grid gap-2 mt-1">
        {PROVIDER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onProvider(opt.value)}
            className={`text-left p-3 rounded-md border transition ${
              provider === opt.value
                ? "border-bb-primary bg-bb-primary/10"
                : "border-bb-border bg-bb-card hover:border-bb-primary/50"
            }`}
          >
            <div className="font-medium text-sm">{opt.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{opt.hint}</div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-gray-500 mt-3">
        Add an API key for this provider in Settings → AI Providers if you haven&apos;t yet.
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
