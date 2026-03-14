"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  {
    id: "sop_generation",
    label: "AI SOP Generation (create procedures from a topic)",
  },
  { id: "team_management", label: "Team Management (invite, track reads, assign)" },
  {
    id: "operations_dashboard",
    label: "Operations Dashboard (insights & compliance)",
  },
  { id: "sop_wiki", label: "SOP Wiki (searchable procedure library)" },
  { id: "checklists", label: "Checklists (auto-generated from SOPs)" },
  { id: "onboarding_paths", label: "Onboarding Paths (structured new-hire training)" },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: "#1C2033",
  border: "1px solid #2A3050",
  borderRadius: "6px",
  color: "#E8ECF4",
  padding: "10px 14px",
  fontSize: "14px",
  fontFamily: "'Source Sans 3', sans-serif",
  width: "100%",
  outline: "none",
};

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureRequest, setFeatureRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((data) => setSpotsRemaining(data.remaining))
      .catch(() => {});
  }, []);

  function toggleFeature(featureId: string) {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !businessType) {
      toast.error("Please fill in email and business type");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          businessType,
          interestedFeatures: selectedFeatures,
          featureRequest: featureRequest || null,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.info(data.message);
        setSubmitted(true);
        return;
      }

      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      toast.success("You're on the list! We'll notify you at launch.");
      setSubmitted(true);
      if (spotsRemaining !== null && spotsRemaining > 0) {
        setSpotsRemaining(spotsRemaining - 1);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="mx-auto max-w-lg rounded-md p-10 text-center"
        style={{
          backgroundColor: "#141824",
          border: "1px solid #2A3050",
        }}
      >
        <CheckCircle2
          className="mx-auto h-14 w-14"
          style={{ color: "#34D399" }}
        />
        <h3
          className="mt-4 text-2xl font-bold"
          style={{
            color: "#E8ECF4",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          You&apos;re on the list!
        </h3>
        <p className="mt-2 text-sm" style={{ color: "#8B95B0" }}>
          We&apos;ll email you when BossBoard launches on March 15.
          {spotsRemaining !== null && spotsRemaining > 0 && (
            <>
              {" "}
              Only{" "}
              <span style={{ color: "#4F8BFF", fontWeight: 600 }}>
                {spotsRemaining}
              </span>{" "}
              free Pro spots left.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-lg rounded-md p-6"
      style={{
        backgroundColor: "#141824",
        border: "1px solid #2A3050",
      }}
    >
      {spotsRemaining !== null && (
        <div className="mb-5 text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "rgba(79, 139, 255, 0.1)",
              color: "#4F8BFF",
              border: "1px solid rgba(79, 139, 255, 0.2)",
            }}
          >
            {spotsRemaining > 0
              ? `${spotsRemaining}/100 spots remaining`
              : "Waitlist is full -- join to be notified"}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="waitlist-email"
              className="text-sm font-medium"
              style={{ color: "#8B95B0" }}
            >
              Email *
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              placeholder="you@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                ...inputStyle,
              }}
              className="placeholder:text-[#5A6480] focus:border-[#4F8BFF]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "#8B95B0" }}
            >
              Business Type *
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              style={{
                ...inputStyle,
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235A6480' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 10px center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "20px",
                paddingRight: "36px",
              }}
              className="focus:border-[#4F8BFF]"
            >
              <option value="" style={{ color: "#5A6480" }}>
                Select type
              </option>
              <option value="Restaurant">Restaurant</option>
              <option value="Cafe">Cafe</option>
              <option value="Salon">Salon</option>
              <option value="Retail">Retail</option>
              <option value="Gym/Fitness">Gym/Fitness</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "#8B95B0" }}>
            Which features interest you most? (select all that apply)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <label
                key={feature.id}
                className="flex items-start gap-2 cursor-pointer text-sm"
                style={{ color: "#E8ECF4" }}
              >
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(feature.id)}
                  onChange={() => toggleFeature(feature.id)}
                  className="mt-0.5 accent-[#4F8BFF]"
                  style={{
                    width: "16px",
                    height: "16px",
                    flexShrink: 0,
                  }}
                />
                <span className="leading-snug">{feature.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="feature-request"
            className="text-sm font-medium"
            style={{ color: "#8B95B0" }}
          >
            Any other features you&apos;d love to see?
          </label>
          <textarea
            id="feature-request"
            placeholder="Tell us what would make BossBoard perfect for your business..."
            value={featureRequest}
            onChange={(e) => setFeatureRequest(e.target.value)}
            rows={2}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
            className="placeholder:text-[#5A6480] focus:border-[#4F8BFF]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
          style={{
            backgroundColor: "#4F8BFF",
            color: "#FFFFFF",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            if (!submitting)
              e.currentTarget.style.backgroundColor = "#6BA0FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#4F8BFF";
          }}
        >
          {submitting ? "Joining..." : "Join Waitlist"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
