"use client";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure BossBoard preferences</p>

        <div className="space-y-4">
          <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
            <h2 className="font-semibold mb-2">Coming in Week 3-4</h2>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>AI Provider (BYOK keys: Anthropic, Google, OpenAI, Local)</li>
              <li>Workspace folder location</li>
              <li>Theme + appearance</li>
              <li>Notifications</li>
              <li>Integrations (GitHub, Google Drive)</li>
              <li>Account &amp; billing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
