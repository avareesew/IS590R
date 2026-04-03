import { getSql } from "@/lib/db";
import IntakeForm from "./IntakeForm";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sql = getSql();

  const rows = await sql`
    SELECT client_name, status FROM intake_tokens WHERE token = ${token}
  `;

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-zinc-900">Link not found</h1>
          <p className="text-sm text-zinc-500">
            This intake link is invalid. Please contact your Replay representative.
          </p>
        </div>
      </div>
    );
  }

  const { client_name: clientName, status } = rows[0];

  if (status === "submitted") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-zinc-900">Already submitted</h1>
          <p className="text-sm text-zinc-500">
            We already received your materials for <strong>{clientName}</strong>.
            Your Replay representative will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return <IntakeForm token={token} clientName={clientName} />;
}
